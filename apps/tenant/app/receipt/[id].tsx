import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { RootState } from '../../store';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

// ─── Payment Type ─────────────────────────────────────────────────────────────
interface PaystackMeta {
  reference: string;
  channel?: string;
  paidAt?: FirebaseFirestoreTypes.Timestamp;
  status?: string;
}

interface EscrowData {
  status: 'held' | 'released' | 'disputed';
  amount: number;
  releaseDate?: FirebaseFirestoreTypes.Timestamp;
}

interface PaymentDoc {
  id: string;
  applicationId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  breakdown: {
    annualRent: number;
    cautionDeposit: number;
    serviceCharge: number;
    agreementFee: number;
    platformFee: number;
  };
  paystack: PaystackMeta;
  escrow?: EscrowData;
  paidAt: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
function formatTimestamp(ts: FirebaseFirestoreTypes.Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatReleaseDate(ts: FirebaseFirestoreTypes.Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Copy to Clipboard (graceful fallback) ────────────────────────────────────
async function copyToClipboard(text: string): Promise<void> {
  try {
    // Try the community clipboard package if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: Clipboard } = require('@react-native-community/clipboard') as {
      default: { setString: (s: string) => void };
    };
    Clipboard.setString(text);
    Alert.alert('Copied', 'Reference number copied to clipboard.');
  } catch {
    Alert.alert('Reference', text);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReceiptScreen(): React.JSX.Element {
  // `id` is the Paystack payment reference
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [payment, setPayment] = useState<PaymentDoc | null>(null);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animation for success icon
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ─── Load Payment ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const snap = await firestore()
          .collection('payments')
          .where('paystack.reference', '==', id)
          .limit(1)
          .get();

        if (snap.empty) {
          if (!cancelled) setErrorMsg('Payment record not found.');
          return;
        }

        const doc = snap.docs[0];
        const data = { id: doc.id, ...doc.data() } as PaymentDoc;

        // Verify ownership
        if (data.tenantId !== uid) {
          if (!cancelled) setErrorMsg('You do not have access to this receipt.');
          return;
        }

        // Load property title
        const propSnap = await firestore()
          .collection('properties')
          .doc(data.propertyId)
          .get();

        const title = (propSnap.data() as { title?: string } | undefined)?.title ?? 'Property';

        if (!cancelled) {
          setPayment(data);
          setPropertyTitle(title);
        }
      } catch {
        if (!cancelled) setErrorMsg('Failed to load receipt. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, uid]);

  // ─── Animate success icon ─────────────────────────────────────────────────────
  useEffect(() => {
    if (payment) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [payment, scaleAnim]);

  const handleCopyRef = useCallback((): void => {
    if (payment) {
      void copyToClipboard(`DR-${payment.paystack.reference}`);
    }
  }, [payment]);

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading receipt...</Text>
      </SafeAreaView>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (errorMsg || !payment) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Receipt Not Available</Text>
        <Text style={styles.errorBody}>{errorMsg ?? 'An unexpected error occurred.'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { breakdown, escrow, paidAt, paystack } = payment;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Success Icon ── */}
        <View style={styles.successSection}>
          <Animated.View
            style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.checkMark}>
              <View style={styles.checkLeft} />
              <View style={styles.checkRight} />
            </View>
          </Animated.View>

          <Text style={styles.successTitle}>Payment Successful!</Text>

          <TouchableOpacity style={styles.refContainer} onPress={handleCopyRef}>
            <Text style={styles.refText}>Ref: DR-{paystack.reference}</Text>
            <Text style={styles.refCopy}> 📋</Text>
          </TouchableOpacity>

          <Text style={styles.paymentDate}>{formatTimestamp(paidAt)}</Text>
        </View>

        {/* ── Receipt Breakdown Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receipt</Text>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Property</Text>
            <Text style={styles.receiptValue} numberOfLines={2}>{propertyTitle}</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Annual Rent</Text>
            <Text style={styles.receiptValue}>{formatCurrency(breakdown.annualRent)}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Caution Deposit</Text>
            <View style={styles.receiptValueRow}>
              <Text style={styles.receiptValue}>{formatCurrency(breakdown.cautionDeposit)}</Text>
              {escrow?.status === 'held' && (
                <View style={styles.escrowBadgeInline}>
                  <Text style={styles.escrowBadgeText}>held in escrow</Text>
                </View>
              )}
            </View>
          </View>

          {breakdown.serviceCharge > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Service Charge</Text>
              <Text style={styles.receiptValue}>{formatCurrency(breakdown.serviceCharge)}</Text>
            </View>
          )}

          {breakdown.agreementFee > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Agreement Fee</Text>
              <Text style={styles.receiptValue}>{formatCurrency(breakdown.agreementFee)}</Text>
            </View>
          )}

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Platform Fee</Text>
            <Text style={styles.receiptValue}>{formatCurrency(breakdown.platformFee)}</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.totalPaidLabel}>Total Paid</Text>
            <Text style={styles.totalPaidValue}>{formatCurrency(payment.amount)}</Text>
          </View>
        </View>

        {/* ── Escrow Status Card ── */}
        {escrow && (
          <View style={styles.escrowStatusCard}>
            {escrow.status === 'held' ? (
              <Text style={styles.escrowStatusText}>
                🔒 {formatCurrency(escrow.amount)} held in escrow.
                {escrow.releaseDate
                  ? ` Releases to landlord on ${formatReleaseDate(escrow.releaseDate)}.`
                  : ' Release scheduled after move-in confirmation.'}
              </Text>
            ) : escrow.status === 'released' ? (
              <Text style={styles.escrowReleasedText}>
                ✓ Escrow deposit of {formatCurrency(escrow.amount)} has been released to
                your landlord.
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Next Steps Card ── */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What's Next</Text>
          <View style={styles.nextStepRow}>
            <Text style={styles.nextStepCheck}>✓</Text>
            <Text style={styles.nextStepText}>Your landlord has been notified</Text>
          </View>
          <View style={styles.nextStepRow}>
            <Text style={styles.nextStepCheck}>✓</Text>
            <Text style={styles.nextStepText}>
              Lease document will be ready within 24 hours
            </Text>
          </View>
          <View style={styles.nextStepRow}>
            <Text style={styles.nextStepCheck}>✓</Text>
            <Text style={styles.nextStepText}>
              Coordinate move-in date with your landlord
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(tabs)/messages')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnPrimaryText}>💬 Message Landlord</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnSecondaryText}>🏠 View Applications</Text>
          </TouchableOpacity>
        </View>
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
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: SURFACE,
    fontWeight: '600',
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
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: {
    fontSize: 28,
    color: TEXT_COLOR,
    lineHeight: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  headerSpacer: {
    width: 36,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  // Success section
  successSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  // Custom checkmark built from Views (no emoji)
  checkMark: {
    width: 40,
    height: 40,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLeft: {
    position: 'absolute',
    width: 3,
    height: 14,
    backgroundColor: SURFACE,
    borderRadius: 2,
    bottom: 10,
    left: 11,
    transform: [{ rotate: '45deg' }, { translateX: -3 }, { translateY: 3 }],
  },
  checkRight: {
    position: 'absolute',
    width: 3,
    height: 24,
    backgroundColor: SURFACE,
    borderRadius: 2,
    bottom: 7,
    right: 9,
    transform: [{ rotate: '-45deg' }, { translateX: 3 }, { translateY: -4 }],
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: SUCCESS,
    marginBottom: 10,
  },
  refContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 8,
  },
  refText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  refCopy: {
    fontSize: 14,
  },
  paymentDate: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  receiptLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_COLOR,
    textAlign: 'right',
    flex: 1,
  },
  receiptValueRow: {
    flex: 1,
    alignItems: 'flex-end',
  },
  escrowBadgeInline: {
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  escrowBadgeText: {
    fontSize: 10,
    color: SECONDARY,
    fontWeight: '600',
  },
  totalPaidLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  totalPaidValue: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY,
  },
  // Escrow status
  escrowStatusCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  escrowStatusText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
  },
  escrowReleasedText: {
    fontSize: 13,
    color: SUCCESS,
    lineHeight: 20,
  },
  // Next steps
  nextStepsCard: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 10,
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nextStepCheck: {
    fontSize: 14,
    color: SUCCESS,
    fontWeight: '700',
    marginRight: 8,
    marginTop: 1,
  },
  nextStepText: {
    fontSize: 13,
    color: TEXT_COLOR,
    flex: 1,
    lineHeight: 20,
  },
  // Action buttons
  actionsRow: {
    gap: 10,
  },
  actionBtnPrimary: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  actionBtnSecondaryText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});
