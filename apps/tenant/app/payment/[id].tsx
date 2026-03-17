import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { WebView } from 'react-native-webview';
import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../../store';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import type { Application } from '../../../../packages/shared/src/types/application';
import type { Property } from '../../../../packages/shared/src/types/property';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapFunctionsError(code: string): string {
  switch (code) {
    case 'functions/not-found':
      return 'Application not found.';
    case 'functions/failed-precondition':
      return 'Application must be accepted before payment.';
    default:
      return 'Payment initialization failed. Please try again.';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PaymentScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [application, setApplication] = useState<Application | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── Load Data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const appSnap = await firestore()
          .collection('applications')
          .doc(id)
          .get();

        if (!appSnap.exists) {
          if (!cancelled) setErrorMsg('Application not found.');
          return;
        }

        const appData = { id: appSnap.id, ...appSnap.data() } as Application;

        if (appData.tenantId !== uid) {
          if (!cancelled) setErrorMsg('You do not have access to this application.');
          return;
        }

        if (appData.status !== 'accepted') {
          if (!cancelled) setErrorMsg('This application has not been accepted yet.');
          return;
        }

        const propSnap = await firestore()
          .collection('properties')
          .doc(appData.propertyId)
          .get();

        const propData = { id: propSnap.id, ...propSnap.data() } as Property;

        if (!cancelled) {
          setApplication(appData);
          setProperty(propData);
        }
      } catch {
        if (!cancelled) setErrorMsg('Failed to load payment details. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, uid]);

  // ─── Initiate Payment ────────────────────────────────────────────────────────
  const handlePayNow = useCallback(async (): Promise<void> => {
    if (!id) return;
    setPaying(true);
    setErrorMsg(null);

    try {
      const initPayment = functions().httpsCallable('initializePayment');
      const result = await initPayment({ applicationId: id });
      const data = result.data as { authorizationUrl: string; reference: string };
      setPaymentUrl(data.authorizationUrl);
      setPaymentRef(data.reference);
      setShowWebView(true);
    } catch (err: unknown) {
      const error = err as { code?: string };
      const msg = mapFunctionsError(error.code ?? '');
      setErrorMsg(msg);
      Alert.alert('Payment Error', msg);
    } finally {
      setPaying(false);
    }
  }, [id]);

  // ─── WebView URL Change ───────────────────────────────────────────────────────
  const handleWebViewNavigationChange = useCallback(
    (navState: { url: string }): void => {
      const { url } = navState;
      if (
        url.includes('directrent.ng/payment/success') ||
        url.includes('paystack.com/close')
      ) {
        setShowWebView(false);
        router.replace(`/receipt/${paymentRef}`);
      }
    },
    [paymentRef],
  );

  // ─── Loading / Error States ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !application || !property) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorBody}>{errorMsg ?? 'An unexpected error occurred.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pricing = property.pricing;
  const thumbnail =
    property.media.photos.find((p) => p.isPrimary)?.url ??
    property.media.photos[0]?.url ??
    '';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Property Card ── */}
        <View style={styles.propertyCard}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.propertyThumb} />
          ) : (
            <View style={[styles.propertyThumb, styles.propertyThumbPlaceholder]}>
              <Text style={styles.placeholderIcon}>🏠</Text>
            </View>
          )}
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>
              {property.title}
            </Text>
            <Text style={styles.propertyArea}>
              📍 {property.location.area}, {property.location.lga}
            </Text>
            <Text style={styles.propertyPrice}>
              {formatCurrency(pricing.annualRent)}/yr
            </Text>
          </View>
        </View>

        {/* ── Accepted label ── */}
        <View style={styles.acceptedBadge}>
          <Text style={styles.acceptedBadgeText}>✓ Payment for accepted application</Text>
        </View>

        {/* ── Cost Breakdown Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cost Breakdown</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Annual Rent</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(pricing.annualRent)}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Caution Deposit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(pricing.cautionDeposit)}</Text>
          </View>

          {pricing.serviceCharge > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Service Charge</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(pricing.serviceCharge)}</Text>
            </View>
          )}

          {pricing.agreementFee > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Agreement Fee</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(pricing.agreementFee)}</Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (2%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(pricing.platformFee)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>TOTAL UPFRONT</Text>
            <Text style={styles.totalValue}>{formatCurrency(pricing.totalUpfront)}</Text>
          </View>

          <View style={styles.savingsBanner}>
            <Text style={styles.savingsText}>
              💰 You save {formatCurrency(pricing.agentSavings)} vs. agent fee
            </Text>
          </View>
        </View>

        {/* ── Escrow Explanation ── */}
        <View style={styles.escrowCard}>
          <Text style={styles.escrowText}>
            🔒 Your caution deposit ({formatCurrency(pricing.cautionDeposit)}) is held in
            secure escrow for 7 days after move-in. Released to landlord only after you
            confirm the property condition.
          </Text>
        </View>

        {/* ── Payment Channels ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Options</Text>
          <View style={styles.channelRow}>
            {[
              { icon: '💳', label: 'Card' },
              { icon: '🏦', label: 'Bank Transfer' },
              { icon: '📱', label: 'USSD' },
              { icon: '💸', label: 'Mobile Money' },
            ].map((ch) => (
              <View key={ch.label} style={styles.channelChip}>
                <Text style={styles.channelIcon}>{ch.icon}</Text>
                <Text style={styles.channelLabel}>{ch.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Error Message ── */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Pay Now Button ── */}
        <TouchableOpacity
          style={[styles.payButton, paying && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color={SURFACE} />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {formatCurrency(pricing.totalUpfront)} Now
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureNote}>🔒 Secured by Paystack • Your data is protected</Text>
      </ScrollView>

      {/* ── Paystack WebView Modal ── */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={styles.webViewRoot}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              style={styles.webViewClose}
              onPress={() => setShowWebView(false)}
            >
              <Text style={styles.webViewCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Secure Payment</Text>
            <View style={styles.webViewSpacer} />
          </View>

          <WebView
            source={{ uri: paymentUrl }}
            onNavigationStateChange={handleWebViewNavigationChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.webViewLoadingText}>Loading Paystack...</Text>
              </View>
            )}
            style={styles.webView}
          />
        </SafeAreaView>
      </Modal>
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
  backBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: {
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
    paddingBottom: 40,
  },
  // Property card
  propertyCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: BORDER,
  },
  propertyThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  propertyArea: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  propertyPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
  },
  // Accepted badge
  acceptedBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  acceptedBadgeText: {
    color: SUCCESS,
    fontWeight: '600',
    fontSize: 13,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 14,
  },
  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  breakdownLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  breakdownValue: {
    fontSize: 14,
    color: TEXT_COLOR,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },
  savingsBanner: {
    marginTop: 12,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  savingsText: {
    color: SUCCESS,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  // Escrow card
  escrowCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  escrowText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
  },
  // Channel chips
  channelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  channelIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  // Error banner
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: ERROR,
    fontSize: 13,
    textAlign: 'center',
  },
  // Pay button
  payButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.65,
  },
  payButtonText: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secureNote: {
    textAlign: 'center',
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  // WebView modal
  webViewRoot: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  webViewClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
  },
  webViewCloseText: {
    fontSize: 16,
    color: TEXT_COLOR,
    fontWeight: '600',
  },
  webViewTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  webViewSpacer: {
    width: 36,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  webViewLoadingText: {
    marginTop: 10,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
});
