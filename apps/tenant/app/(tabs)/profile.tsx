import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setAuth } from '../../store/authSlice';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

export default function ProfileScreen() {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const dispatch = useDispatch();

  const bvnStatus = profile?.verification?.bvn?.status ?? 'pending';
  const ninStatus = profile?.verification?.nin?.status ?? 'pending';
  const phoneVerified = profile?.verification?.phone?.verified ?? false;
  const emailVerified = profile?.verification?.email?.verified ?? false;
  const isIdentityVerified = bvnStatus === 'verified' || ninStatus === 'verified';
  const completeness = profile?.profileCompleteness ?? 0;

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : 'Complete your profile';

  const initials =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : '?';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await NotificationService.unregisterToken();
          await AuthService.signOut();
          dispatch(setAuth(null));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {isIdentityVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile?.phone && <Text style={styles.phoneDisplay}>{profile.phone}</Text>}
          {isIdentityVerified && (
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>✓ Verified Tenant</Text>
            </View>
          )}
        </View>

        {/* Profile completeness */}
        <View style={styles.completenessCard}>
          <View style={styles.completenessHeader}>
            <Text style={styles.completenessTitle}>Profile Completeness</Text>
            <Text style={styles.completenessValue}>{completeness}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completeness}%` }]} />
          </View>
          {completeness < 100 && (
            <Text style={styles.completenessHint}>
              {!isIdentityVerified
                ? 'Verify your BVN or NIN to unlock all features (+20%)'
                : 'Add employment details to complete your profile'}
            </Text>
          )}
        </View>

        {/* Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <VerificationRow icon="📱" label="Phone Number" status={phoneVerified ? 'verified' : 'pending'} />
          <VerificationRow icon="📧" label="Email Address" status={emailVerified ? 'verified' : 'pending'} />
          <VerificationRow
            icon="🏦"
            label="BVN"
            status={bvnStatus as 'verified' | 'pending' | 'failed'}
            onPress={bvnStatus !== 'verified' ? () => router.push('/(verification)/bvn') : undefined}
            ctaLabel="Verify BVN"
          />
          <VerificationRow
            icon="🪪"
            label="NIN"
            status={ninStatus as 'verified' | 'pending' | 'failed'}
            onPress={ninStatus !== 'verified' ? () => router.push('/(verification)/nin') : undefined}
            ctaLabel="Verify NIN"
          />
        </View>

        {/* Identity verification CTA */}
        {!isIdentityVerified && (
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaTitle}>Unlock Messaging & Applications</Text>
            <Text style={styles.ctaSubtitle}>
              Verify your BVN or NIN to contact landlords and apply for properties.
            </Text>
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(verification)/bvn')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaButtonText}>Verify BVN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, styles.ctaButtonOutline]}
                onPress={() => router.push('/(verification)/nin')}
                activeOpacity={0.85}
              >
                <Text style={[styles.ctaButtonText, styles.ctaButtonOutlineText]}>Verify NIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuRow icon="✏️" label="Edit Profile" onPress={() => router.push('/settings')} />
          <MenuRow icon="🔔" label="Notification Preferences" onPress={() => router.push('/settings')} />
          <MenuRow icon="🔒" label="Privacy Settings" onPress={() => router.push('/settings')} />
          <MenuRow icon="💳" label="Payment Methods" onPress={() => router.push('/settings')} />
          <MenuRow icon="❓" label="Help & Support" onPress={() => router.push('/settings')} />
          <MenuRow icon="📄" label="Terms & Conditions" onPress={() => router.push('/settings')} />
          <MenuRow icon="🛡️" label="Privacy Policy" onPress={() => router.push('/settings')} />
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Directrent v1.0.0 — Tenant App</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function VerificationRow({
  icon, label, status, onPress, ctaLabel,
}: {
  icon: string; label: string; status: 'verified' | 'pending' | 'failed';
  onPress?: () => void; ctaLabel?: string;
}) {
  const statusColor = { verified: '#1B5E20', pending: '#757575', failed: '#D32F2F' }[status];
  const statusLabel = { verified: '✓ Verified', pending: 'Not verified', failed: '✗ Failed' }[status];

  return (
    <View style={styles.verifyRow}>
      <Text style={styles.verifyIcon}>{icon}</Text>
      <View style={styles.verifyInfo}>
        <Text style={styles.verifyLabel}>{label}</Text>
        <Text style={[styles.verifyStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      {status !== 'verified' && onPress && (
        <TouchableOpacity style={styles.verifyCta} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.verifyCtaText}>{ctaLabel ?? 'Verify'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MenuRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { paddingBottom: 40 },
  header: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: BORDER },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  verifiedBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 4 },
  phoneDisplay: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 8 },
  verifiedTag: { backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  verifiedTagText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },
  completenessCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16 },
  completenessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  completenessTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  completenessValue: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  progressBar: { height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 4 },
  completenessHint: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: BORDER },
  verifyIcon: { fontSize: 20, marginRight: 12 },
  verifyInfo: { flex: 1 },
  verifyLabel: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  verifyStatus: { fontSize: 12, fontWeight: '500' },
  verifyCta: { backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  verifyCtaText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },
  ctaBanner: { backgroundColor: PRIMARY_LIGHT, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: PRIMARY },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 6 },
  ctaSubtitle: { fontSize: 13, color: '#2E7D32', lineHeight: 19, marginBottom: 14 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaButton: { flex: 1, backgroundColor: PRIMARY, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ctaButtonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: PRIMARY },
  ctaButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ctaButtonOutlineText: { color: PRIMARY },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: BORDER },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: TEXT },
  menuArrow: { fontSize: 20, color: '#BDBDBD', fontWeight: '300' },
  signOutButton: { marginHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#D32F2F' },
  version: { textAlign: 'center', fontSize: 12, color: '#BDBDBD', marginBottom: 8 },
});
