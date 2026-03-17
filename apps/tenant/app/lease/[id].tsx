import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import type { Lease, LeaseStatus } from '../../../../packages/shared/src/types/lease';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatLeaseDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatSignedAt(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

function getStatusConfig(status: LeaseStatus): StatusConfig {
  switch (status) {
    case 'pending_signature':
      return { label: 'Awaiting Signatures', color: SECONDARY, bg: '#FFF3E0' };
    case 'active':
      return { label: 'Active', color: SUCCESS, bg: '#E8F5E9' };
    case 'expired':
      return { label: 'Expired', color: TEXT_SECONDARY, bg: '#F5F5F5' };
    case 'terminated':
      return { label: 'Terminated', color: ERROR, bg: '#FFEBEE' };
  }
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'functions/not-found':
      return 'Lease not found. Please contact support.';
    case 'functions/already-exists':
      return 'This lease has already been signed.';
    case 'functions/failed-precondition':
      return 'Lease cannot be signed at this time.';
    case 'functions/unauthenticated':
      return 'Please sign in again and retry.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardDivider} />
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LeaseScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  // Real-time listener so signature updates reflect immediately
  useEffect(() => {
    if (!id) {
      setErrorMsg('Invalid lease ID.');
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('leases')
      .doc(id)
      .onSnapshot(
        (snap) => {
          if (!snap.exists) {
            setErrorMsg('Lease document not found.');
            setLoading(false);
            return;
          }
          const data = { id: snap.id, ...snap.data() } as Lease;
          setLease(data);
          setLoading(false);
        },
        () => {
          setErrorMsg('Failed to load lease. Please try again.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [id]);

  const handleSign = useCallback(async () => {
    if (!id) return;

    Alert.alert(
      'Sign Lease Agreement',
      'By signing, you agree to all terms and conditions of this lease. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Now',
          style: 'default',
          onPress: async () => {
            setSigning(true);
            try {
              await functions().httpsCallable('signLeaseDocument')({ leaseId: id });
              Alert.alert(
                'Lease Signed',
                'You have successfully signed the lease agreement. The landlord has been notified.'
              );
            } catch (err: unknown) {
              const code = (err as { code?: string }).code ?? '';
              Alert.alert('Signing Failed', getErrorMessage(code));
            } finally {
              setSigning(false);
            }
          },
        },
      ]
    );
  }, [id]);

  const handleDownloadPDF = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open the PDF document.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open PDF. Please try again.');
    }
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading lease...</Text>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (errorMsg || !lease) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Lease Not Available</Text>
        <Text style={styles.errorBody}>{errorMsg ?? 'An unexpected error occurred.'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(lease.status);
  const startDate = lease.terms.startDate.toDate();
  const endDate = lease.terms.endDate.toDate();

  const canSign =
    lease.status === 'pending_signature' &&
    uid === lease.tenantId &&
    !lease.signatures.tenant.signed;

  const landlordSignedAt = lease.signatures.landlord.signedAt?.toDate() ?? null;
  const tenantSignedAt = lease.signatures.tenant.signedAt?.toDate() ?? null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lease Agreement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Badge ── */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* ── Property Info ── */}
        <SectionCard title="Property">
          <InfoRow label="Address" value={lease.property.address} />
          <InfoRow label="Type" value={lease.property.propertyType} />
          <InfoRow label="Area" value={lease.property.area} />
          <InfoRow
            label="Bedrooms"
            value={`${lease.property.bedrooms} bedroom${lease.property.bedrooms !== 1 ? 's' : ''}`}
          />
        </SectionCard>

        {/* ── Lease Terms ── */}
        <SectionCard title="Lease Terms">
          <InfoRow
            label="Duration"
            value={`${formatLeaseDate(startDate)} – ${formatLeaseDate(endDate)}`}
          />
          <InfoRow label="Period" value={`${lease.terms.durationMonths} months`} />
          <InfoRow label="Annual Rent" value={formatCurrency(lease.terms.annualRent)} />
          <InfoRow label="Monthly Equivalent" value={formatCurrency(lease.terms.monthlyRent)} />
          <InfoRow label="Caution Deposit" value={formatCurrency(lease.terms.cautionDeposit)} />
          {lease.terms.serviceCharge > 0 && (
            <InfoRow label="Service Charge" value={formatCurrency(lease.terms.serviceCharge)} />
          )}
          <InfoRow label="Notice Period" value={`${lease.terms.noticePeriodDays} days`} />
          <InfoRow label="Renewal Option" value={lease.terms.renewalOption ? 'Yes' : 'No'} />
        </SectionCard>

        {/* ── Parties ── */}
        <SectionCard title="Parties">
          <View style={styles.partySection}>
            <Text style={styles.partyRole}>Landlord</Text>
            <Text style={styles.partyName}>{lease.parties.landlordName}</Text>
            {lease.status === 'active' && (
              <Text style={styles.partyPhone}>{lease.parties.landlordPhone}</Text>
            )}
          </View>
          <View style={styles.partySeparator} />
          <View style={styles.partySection}>
            <Text style={styles.partyRole}>Tenant</Text>
            <Text style={styles.partyName}>{lease.parties.tenantName}</Text>
            <Text style={styles.partyPhone}>{lease.parties.tenantPhone}</Text>
          </View>
        </SectionCard>

        {/* ── Signatures ── */}
        <SectionCard title="Signatures">
          <View style={styles.signatureRow}>
            <View style={styles.signatureParty}>
              <Text style={styles.signaturePartyLabel}>Landlord</Text>
              {lease.signatures.landlord.signed ? (
                <>
                  <Text style={styles.signedText}>Signed</Text>
                  {landlordSignedAt && (
                    <Text style={styles.signedDate}>{formatSignedAt(landlordSignedAt)}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.pendingText}>Pending</Text>
              )}
            </View>
            <View style={styles.signatureDivider} />
            <View style={styles.signatureParty}>
              <Text style={styles.signaturePartyLabel}>Tenant</Text>
              {lease.signatures.tenant.signed ? (
                <>
                  <Text style={styles.signedText}>Signed</Text>
                  {tenantSignedAt && (
                    <Text style={styles.signedDate}>{formatSignedAt(tenantSignedAt)}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.pendingText}>Pending</Text>
              )}
            </View>
          </View>
        </SectionCard>

        {/* ── Download PDF ── */}
        {lease.documentUrl ? (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => handleDownloadPDF(lease.documentUrl!)}
            activeOpacity={0.85}
          >
            <Text style={styles.downloadBtnText}>Download PDF</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── Sign Button ── */}
        {canSign && (
          <TouchableOpacity
            style={[styles.signBtn, signing && styles.signBtnDisabled]}
            onPress={handleSign}
            disabled={signing}
            activeOpacity={0.85}
          >
            {signing ? (
              <ActivityIndicator color={SURFACE} />
            ) : (
              <Text style={styles.signBtnText}>Sign Lease Agreement</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Spacer */}
        <View style={{ height: 32 }} />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  primaryBtnText: {
    color: SURFACE,
    fontWeight: '700',
    fontSize: 15,
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
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  // Status badge
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 12,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    flex: 1,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: TEXT_COLOR,
    fontWeight: '600',
    flex: 1.4,
    textAlign: 'right',
  },
  // Parties
  partySection: {
    paddingVertical: 10,
  },
  partyRole: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 2,
  },
  partyPhone: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  partySeparator: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  // Signatures
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  signatureParty: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  signatureDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginHorizontal: 8,
  },
  signaturePartyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  signedText: {
    fontSize: 15,
    fontWeight: '700',
    color: SUCCESS,
  },
  signedDate: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 3,
  },
  pendingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Download button
  downloadBtn: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
  },
  // Sign button
  signBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  signBtnDisabled: {
    opacity: 0.65,
  },
  signBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: SURFACE,
  },
});
