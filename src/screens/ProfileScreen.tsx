import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import TextField from '../components/TextField';
import {
  PHONE_ERROR,
  formatNigerianPhone,
  isValidNigerianPhone,
  normaliseNigerianPhone,
} from '../lib/phone';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: 'Tenant',
  // Keys are the stored role values and must not change — they are written
  // into every user document. Only the labels people read are updated.
  landlord: 'Property owner',
  both: 'Tenant & property owner',
};

export default function ProfileScreen() {
  const { profile, logOut, setRole, updateDetails } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  function startEditing() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setNameError('');
    setPhoneError('');
    setEditing(true);
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.fullName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

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
              style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}
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
              onPress={() => setRole(role)}
              style={[styles.rolePill, profile.role === role && styles.rolePillActive]}
            >
              <Text
                style={[styles.rolePillText, profile.role === role && styles.rolePillTextActive]}
              >
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
        </View>

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
  edit: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.sm,
  },
  editPressed: { opacity: 0.85 },
  editText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  editor: { marginTop: spacing.lg },
  editorSpacer: { height: spacing.sm },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  rolePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  rolePillActive: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  rolePillText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  rolePillTextActive: { color: colors.accentGold },
  logout: { marginTop: spacing.xl },
});
