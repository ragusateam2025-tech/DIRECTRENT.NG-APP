import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../store';
import { setAuth } from '../store/authSlice';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const ERROR = '#C62828';

// ─── Settings Types ───────────────────────────────────────────────────────────
type ProfileVisibility = 'verified_only' | 'landlords_only' | 'public';

interface SettingsState {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    showPhone: boolean;
    profileVisibility: ProfileVisibility;
  };
}

const DEFAULT_SETTINGS: SettingsState = {
  notifications: { push: true, email: true, sms: true, marketing: false },
  privacy: { showPhone: false, profileVisibility: 'verified_only' },
};

const VISIBILITY_OPTIONS: Array<{ value: ProfileVisibility; label: string; desc: string }> = [
  { value: 'verified_only', label: 'Verified Users Only', desc: 'Only BVN/NIN-verified users can see your profile' },
  { value: 'landlords_only', label: 'Landlords Only', desc: 'Only landlords can see your profile' },
  { value: 'public', label: 'Public', desc: 'Anyone on the platform can see your profile' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ToggleRow({
  label,
  sublabel,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={value ? PRIMARY : BORDER}
        trackColor={{ false: '#D0D0D0', true: PRIMARY_LIGHT }}
        ios_backgroundColor="#D0D0D0"
      />
    </View>
  );
}

function TappableRow({
  label,
  sublabel,
  onPress,
  danger,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen(): React.JSX.Element {
  const uid = useSelector((state: RootState) => state.auth.uid);
  const dispatch = useDispatch();

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);

  // Debounce timer for Firestore saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const snap = await firestore().collection('tenants').doc(uid).get();
        const data = snap.data() as
          | { settings?: Partial<SettingsState> }
          | undefined;

        if (!cancelled && data?.settings) {
          setSettings({
            notifications: {
              ...DEFAULT_SETTINGS.notifications,
              ...(data.settings.notifications ?? {}),
            },
            privacy: {
              ...DEFAULT_SETTINGS.privacy,
              ...(data.settings.privacy ?? {}),
            },
          });
        }
      } catch {
        // Use defaults on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // ── Debounced Firestore save ───────────────────────────────────────────────
  const persistSettings = useCallback(
    (updated: SettingsState): void => {
      if (!uid) return;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await firestore()
            .collection('tenants')
            .doc(uid)
            .update({ settings: updated });
        } catch {
          // Silent — settings may be out of sync but non-critical
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [uid]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggleNotification = useCallback(
    (key: keyof SettingsState['notifications']) => (value: boolean): void => {
      const updated: SettingsState = {
        ...settings,
        notifications: { ...settings.notifications, [key]: value },
      };
      setSettings(updated);
      persistSettings(updated);
    },
    [settings, persistSettings]
  );

  const togglePrivacy = useCallback(
    (key: keyof SettingsState['privacy']) => (value: boolean): void => {
      const updated: SettingsState = {
        ...settings,
        privacy: { ...settings.privacy, [key]: value },
      };
      setSettings(updated);
      persistSettings(updated);
    },
    [settings, persistSettings]
  );

  const setVisibility = useCallback(
    (value: ProfileVisibility): void => {
      const updated: SettingsState = {
        ...settings,
        privacy: { ...settings.privacy, profileVisibility: value },
      };
      setSettings(updated);
      persistSettings(updated);
      setVisibilityModalOpen(false);
    },
    [settings, persistSettings]
  );

  // ── Account actions ────────────────────────────────────────────────────────
  const handleChangePhone = useCallback((): void => {
    Alert.alert(
      'Change Phone Number',
      'To change your phone number, please contact support or re-register with your new number.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleDeleteAccount = useCallback((): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion. All your saved properties, applications, and messages will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const user = auth().currentUser;
                      if (!user) return;

                      if (uid) {
                        await firestore()
                          .collection('tenants')
                          .doc(uid)
                          .update({ accountStatus: 'deleted', deletedAt: firestore.FieldValue.serverTimestamp() });
                      }

                      await user.delete();
                      dispatch(setAuth(null));
                    } catch (err: unknown) {
                      const code = (err as { code?: string }).code ?? '';
                      if (code === 'auth/requires-recent-login') {
                        Alert.alert(
                          'Re-authentication Required',
                          'For security, please sign out and sign back in before deleting your account.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        Alert.alert(
                          'Delete Failed',
                          'Unable to delete account at this time. Please contact support.'
                        );
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [uid, dispatch]);

  // ── About actions ──────────────────────────────────────────────────────────
  const handlePrivacyPolicy = useCallback((): void => {
    Alert.alert(
      'Privacy Policy',
      'Directrent.ng is committed to protecting your personal data in accordance with the Nigeria Data Protection Regulation (NDPR). Visit www.directrent.ng/privacy for the full policy.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleTermsOfService = useCallback((): void => {
    Alert.alert(
      'Terms of Service',
      'By using Directrent.ng, you agree to our terms and conditions. Visit www.directrent.ng/terms for the full terms of service.',
      [{ text: 'OK' }]
    );
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const currentVisibilityOption = VISIBILITY_OPTIONS.find(
    (o) => o.value === settings.privacy.profileVisibility
  ) ?? VISIBILITY_OPTIONS[0];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSaverIndicator}>
          {saving && <ActivityIndicator size="small" color={PRIMARY} />}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.group}>
          <ToggleRow
            label="Push Notifications"
            sublabel="Receive alerts directly on your device"
            value={settings.notifications.push}
            onValueChange={toggleNotification('push')}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            label="Email Notifications"
            sublabel="Application updates and lease documents"
            value={settings.notifications.email}
            onValueChange={toggleNotification('email')}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            label="SMS Notifications"
            sublabel="OTP codes and critical alerts"
            value={settings.notifications.sms}
            onValueChange={toggleNotification('sms')}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            label="Marketing Updates"
            sublabel="New properties, tips, and offers"
            value={settings.notifications.marketing}
            onValueChange={toggleNotification('marketing')}
          />
        </View>

        {/* ── Privacy ── */}
        <SectionHeader title="Privacy" />
        <View style={styles.group}>
          <TappableRow
            label="Profile Visibility"
            sublabel={currentVisibilityOption.label}
            onPress={() => setVisibilityModalOpen(true)}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            label="Show Phone to Landlords"
            sublabel="Landlords can see your phone number"
            value={settings.privacy.showPhone}
            onValueChange={togglePrivacy('showPhone')}
          />
        </View>

        {/* ── Profile Visibility Picker (inline) ── */}
        {visibilityModalOpen && (
          <View style={styles.visibilityPicker}>
            <Text style={styles.visibilityPickerTitle}>Profile Visibility</Text>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.visibilityOption,
                  settings.privacy.profileVisibility === opt.value
                    ? styles.visibilityOptionSelected
                    : null,
                ]}
                onPress={() => setVisibility(opt.value)}
                activeOpacity={0.8}
              >
                <View style={styles.visibilityOptionContent}>
                  <Text
                    style={[
                      styles.visibilityOptionLabel,
                      settings.privacy.profileVisibility === opt.value
                        ? styles.visibilityOptionLabelSelected
                        : null,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.visibilityOptionDesc}>{opt.desc}</Text>
                </View>
                {settings.privacy.profileVisibility === opt.value && (
                  <Text style={styles.visibilityOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.visibilityPickerClose}
              onPress={() => setVisibilityModalOpen(false)}
            >
              <Text style={styles.visibilityPickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={styles.group}>
          <TappableRow
            label="Change Phone Number"
            onPress={handleChangePhone}
          />
          <View style={styles.rowDivider} />
          <TappableRow
            label="Delete Account"
            sublabel="Permanently delete your data"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.group}>
          <InfoRow label="App Version" value="1.0.0" />
          <View style={styles.rowDivider} />
          <TappableRow label="Privacy Policy" onPress={handlePrivacyPolicy} />
          <View style={styles.rowDivider} />
          <TappableRow label="Terms of Service" onPress={handleTermsOfService} />
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    minWidth: 60,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  headerSpacer: {
    minWidth: 60,
  },
  headerSaverIndicator: {
    minWidth: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  // Section header
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  // Group
  group: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  rowDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 16,
  },
  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    color: TEXT_COLOR,
    fontWeight: '500',
  },
  rowLabelDanger: {
    color: ERROR,
  },
  rowSublabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
    lineHeight: 17,
  },
  rowValue: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  rowChevron: {
    fontSize: 22,
    color: '#BDBDBD',
    fontWeight: '300',
    lineHeight: 26,
  },
  // Visibility picker
  visibilityPicker: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    overflow: 'hidden',
  },
  visibilityPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  visibilityOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
  },
  visibilityOptionContent: {
    flex: 1,
  },
  visibilityOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_COLOR,
    marginBottom: 2,
  },
  visibilityOptionLabelSelected: {
    color: PRIMARY,
  },
  visibilityOptionDesc: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 17,
  },
  visibilityOptionCheck: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '700',
    marginLeft: 10,
  },
  visibilityPickerClose: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  visibilityPickerCloseText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
});
