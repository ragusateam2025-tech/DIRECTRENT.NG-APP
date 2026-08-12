import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { uploadAvatar, deleteAvatar } from '../services/avatar';
import { fetchMyListings } from '../services/landlord';
import { pushStatus, registerForPush, type PushStatus } from '../services/push';
import {
  PHONE_ERROR,
  formatNigerianPhone,
  isValidNigerianPhone,
  normaliseNigerianPhone,
} from '../lib/phone';
import { useAuth, friendlyAuthError } from '../context/AuthContext';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: 'Tenant',
  // Keys are the stored role values and must not change — they are written
  // into every user document. Only the labels people read are updated.
  landlord: 'Property owner',
  both: 'Tenant & property owner',
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile, logOut, setRole, updateDetails, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  // Read on arrival, and again whenever this screen is returned to: somebody
  // sent to Android Settings to unblock notifications comes back here, and a
  // stale "off" would tell them it had not worked.
  useFocusEffect(
    useCallback(() => {
      pushStatus().then(setPush).catch(() => setPush(null));
    }, []),
  );
  const [avatarError, setAvatarError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordDone, setPasswordDone] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  /** Offers the two ways someone has a photo, plus removal once one exists. */
  function chooseAvatar() {
    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> =
      [
        { text: 'Take a photo', onPress: () => pickAvatar('camera') },
        { text: 'Choose from gallery', onPress: () => pickAvatar('gallery') },
      ];

    if (profile?.photoUrl) {
      options.push({ text: 'Remove photo', style: 'destructive', onPress: removeAvatar });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Profile picture', undefined, options);
  }

  async function pickAvatar(source: 'camera' | 'gallery') {
    if (!profile) return;
    setAvatarError('');

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setAvatarError(
        source === 'camera'
          ? 'Directrent needs camera access to take your picture.'
          : 'Directrent needs access to your photos to set a picture.',
      );
      return;
    }

    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1, // Compression happens in uploadAvatar, after resizing.
          });

    if (picked.canceled || picked.assets.length === 0) return;

    const asset = picked.assets[0];
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(profile.uid, asset.uri, asset.width, asset.height);
      await updateDetails({ photoUrl: url });
    } catch (err: any) {
      setAvatarError(`Could not save that picture (${err?.message ?? 'unknown error'}).`);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!profile) return;
    setAvatarBusy(true);
    try {
      await deleteAvatar(profile.uid);
      await updateDetails({ photoUrl: undefined });
    } catch {
      setAvatarError('Could not remove that picture. Try again.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordDone('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The two new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('That is already your password.');
      return;
    }

    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Cleared immediately — no reason for three passwords to sit in memory
      // behind a screen the user may leave open.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
      setPasswordDone('Password changed.');
    } catch (err: any) {
      setPasswordError(friendlyAuthError(err?.code ?? ''));
    } finally {
      setPasswordBusy(false);
    }
  }

  function startEditing() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setNameError('');
    setPhoneError('');
    setEditing(true);
  }

  /**
   * Switches role, warning first when the switch would hide someone's
   * properties.
   *
   * Leaving the owner role removes the My properties tab, and with it every
   * route to a listing. Nothing is deleted and the listings stay published —
   * but from where the owner is standing their properties have vanished, with
   * no explanation and no visible way back. That is a support call at best, and
   * a bad moment in front of an investor at worst.
   *
   * The count is fetched at the moment of the decision rather than kept on this
   * screen: it costs one read, only when someone actually reaches for the
   * switch, and it lets the message name what is at stake instead of warning in
   * the abstract.
   *
   * Nobody is stopped. An owner with no listings switches silently, because
   * there is nothing to reassure them about, and "Tenant & property owner"
   * already exists for anyone who wants both.
   */
  async function handleRoleChange(next: UserRole) {
    if (!profile || next === profile.role) return;

    const leavingOwner =
      (profile.role === 'landlord' || profile.role === 'both') && next === 'tenant';

    if (!leavingOwner) {
      await setRole(next);
      return;
    }

    let count: number | null = null;
    try {
      count = (await fetchMyListings(profile.uid)).length;
    } catch {
      // Left null. Warning without a number beats switching silently, and
      // beats blocking somebody because a read failed.
    }

    if (count === 0) {
      await setRole(next);
      return;
    }

    const properties =
      count === null
        ? 'Your properties'
        : count === 1
          ? 'Your property'
          : `Your ${count} properties`;

    Alert.alert(
      'Switch to tenant only?',
      `${properties} will stay published and tenants can still find them. Switch back to Property owner any time to manage them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => setRole(next) },
      ],
    );
  }

  async function handleEnablePush() {
    if (!profile || enablingPush) return;

    setEnablingPush(true);
    try {
      await registerForPush(profile.uid);
      setPush(await pushStatus());
    } catch (err: any) {
      // Said out loud here, unlike the background registration. Somebody who
      // deliberately pressed this deserves to know what stopped it.
      setPush(await pushStatus());
      Alert.alert('Could not turn on notifications', err?.message ?? String(err));
    } finally {
      setEnablingPush(false);
    }
  }

  async function handleSave() {
    if (!profile || saving) return;

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    setNameError('');
    setPhoneError('');

    if (trimmedName.length < 2) {
      setNameError('Enter your full name.');
      return;
    }

    // Phone stays optional — but if given, it must be a number we can reach.
    if (trimmedPhone && !isValidNigerianPhone(trimmedPhone)) {
      setPhoneError(PHONE_ERROR);
      return;
    }

    setSaving(true);
    try {
      await updateDetails({
        fullName: trimmedName,
        phone: trimmedPhone ? normaliseNigerianPhone(trimmedPhone) : undefined,
      });
      setEditing(false);
    } catch {
      setNameError('Could not save your details. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={chooseAvatar}
          disabled={avatarBusy}
          accessibilityRole="button"
          accessibilityLabel={
            profile.photoUrl ? 'Change your profile picture' : 'Add a profile picture'
          }
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            {avatarBusy ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile.fullName.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={styles.avatarHint}>
            {profile.photoUrl ? 'Change photo' : 'Add a photo'}
          </Text>
        </Pressable>

        {!!avatarError && <Text style={styles.avatarError}>{avatarError}</Text>}

        {editing ? (
          <View style={styles.editor}>
            <TextField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Your name"
              error={nameError}
            />
            <TextField
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="08012345678"
              error={phoneError}
            />
            <Button label="Save" onPress={handleSave} loading={saving} />
            <View style={styles.editorSpacer} />
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          </View>
        ) : (
          <>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.phone}>
              {profile.phone ? formatNigerianPhone(profile.phone) : 'No phone number yet'}
            </Text>

            <Pressable
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel="Edit your details"
              style={({ pressed }) => [styles.pill, styles.edit, pressed && styles.editPressed]}
            >
              <Text style={styles.editText}>Edit details</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.sectionHeading}>Your role</Text>
        <View style={styles.roleRow}>
          {(['tenant', 'landlord', 'both'] as UserRole[]).map(role => (
            <Pressable
              key={role}
              onPress={() => handleRoleChange(role)}
              accessibilityRole="button"
              accessibilityState={{ selected: profile.role === role }}
              style={[styles.pill, styles.rolePill, profile.role === role && styles.rolePillActive]}
            >
              <Text
                style={[styles.rolePillText, profile.role === role && styles.rolePillTextActive]}
              >
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/*
          Notifications get a visible state because registration is silent by
          design — it runs unawaited when a profile loads and its failure is
          swallowed, so that neither a refusal nor an emulator can stand between
          somebody and their account. The cost of that choice is nobody knowing
          why messages never arrive. This is where they find out.
        */}
        <Text style={styles.sectionHeading}>Notifications</Text>
        <Text style={styles.pushState}>
          {push === 'on'
            ? 'On — you will be told when a message arrives.'
            : push === 'blocked'
              ? 'Turned off for Directrent. Android Settings is the only way back on, under Apps, Directrent, Notifications.'
              : push === 'unsupported'
                ? 'Not available on this device.'
                : 'Off — you will not be told when somebody messages you.'}
        </Text>

        {push === 'off' && (
          <View style={styles.pushAction}>
            <Button
              label="Turn on notifications"
              variant="secondary"
              loading={enablingPush}
              onPress={handleEnablePush}
            />
          </View>
        )}

        <Text style={styles.sectionHeading}>Password</Text>

        {changingPassword ? (
          <View>
            <TextField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Your current password"
            />
            <TextField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
            <TextField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Type it again"
              error={passwordError}
            />
            <Button label="Change password" onPress={handleChangePassword} loading={passwordBusy} />
            <View style={styles.editorSpacer} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                // Discarded rather than kept for a retry: leaving a password in
                // state after the user backs out is a needless place for it to live.
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError('');
                setChangingPassword(false);
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setPasswordDone('');
              setChangingPassword(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change your password"
            style={({ pressed }) => [styles.pill, styles.edit, styles.editLeft, pressed && styles.pressed]}
          >
            <Text style={styles.editText}>Change password</Text>
          </Pressable>
        )}

        {!!passwordDone && <Text style={styles.passwordDone}>{passwordDone}</Text>}

        {/* Staff only. Hidden entirely rather than shown disabled — a control
            a customer can see but never use is a support question. */}
        {!!profile?.staff && (
          <View style={styles.logout}>
            <Button
              label="360 tour queue"
              variant="secondary"
              onPress={() => navigation.navigate('TourQueue')}
            />
          </View>
        )}

        <View style={styles.logout}>
          <Button label="Log out" onPress={logOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'stretch' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentGoldDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarText: {
    color: colors.primaryDark,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  email: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  phone: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  /**
   * The standing rectangle — shared by the role selectors and the two actions.
   *
   * Square-cornered rather than a capsule. A pill is what a component library
   * hands you; this shape is the app's own, and it comes from somewhere: the
   * icon set draws Browse and the 360 tour as forms standing on a ground line, and
   * the tab bar marks the current tab with a short gold rule. So a control here
   * is an upright rectangle standing on that same line.
   *
   * The 2px corner is deliberate and not zero. Perfectly square corners read as
   * unfinished on Android, where everything around them is rounded; a 2px
   * radius keeps the shape unmistakably rectangular while looking cut rather
   * than forgotten.
   *
   * The bottom rule is where state lives. Weight is the constant — every
   * control has the same 2px base — and only its colour changes, so selecting
   * a role never shifts the layout by a pixel.
   */
  pushState: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },
  pushAction: { marginTop: spacing.md },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    borderBottomColor: colors.border,
  },
  edit: {
    alignSelf: 'center',
    marginTop: spacing.md,
    // An action is gold on the ground line: it can be tapped to do something.
    borderBottomColor: colors.accentGold,
    borderColor: colors.borderGold,
  },
  editPressed: { opacity: 0.85 },
  editText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  editor: { marginTop: spacing.lg },
  editorSpacer: { height: spacing.sm },
  avatarWrap: { alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 999 },
  avatarHint: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  avatarError: {
    color: colors.error,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  editLeft: { alignSelf: 'flex-start' },
  passwordDone: {
    color: colors.success,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  rolePill: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  /**
   * The chosen role lights its ground line and lifts off the background. The
   * surrounding border stays neutral so the gold rule carries the signal alone
   * — a fully gold outline would compete with the actions, which are the only
   * things on this screen you can actually press to make something happen.
   */
  rolePillActive: {
    borderBottomColor: colors.accentGold,
    backgroundColor: colors.backgroundElevated,
  },
  rolePillText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  rolePillTextActive: { color: colors.accentGold },
  logout: { marginTop: spacing.xl },
});
