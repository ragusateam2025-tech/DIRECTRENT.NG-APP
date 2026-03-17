import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../store';
import { formatCurrency } from '../../../packages/shared/src/utils/currency';

// ─── Design tokens ─────────────────────────────────────────────────────────
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

// ─── Plans ──────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  features: string[];
  maxListings: number;
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    annualPrice: 0,
    features: [
      '1 active listing',
      'Basic messaging',
      'Tenant applications',
      'Standard profile',
    ],
    maxListings: 1,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 2000,
    annualPrice: 20000,
    features: [
      '5 active listings',
      'Priority messaging',
      'Analytics dashboard',
      'Verified badge',
      'Email support',
    ],
    maxListings: 5,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 5000,
    annualPrice: 50000,
    features: [
      '20 active listings',
      'Featured listings (5/month)',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Bulk messaging',
    ],
    maxListings: 20,
    recommended: true,
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface SubscriptionData {
  plan: string;
  status: 'active' | 'expired' | 'cancelled' | 'free';
  expiresAt?: { toDate: () => Date } | null;
}

interface SubscriptionPayment {
  id: string;
  amount: number;
  plan: string;
  status: string;
  billingCycle: 'monthly' | 'annual';
  createdAt: { toDate: () => Date } | null;
  reference?: string;
}

type BillingCycle = 'monthly' | 'annual';

// ─── Feature row ─────────────────────────────────────────────────────────────
function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: Plan;
  isActive: boolean;
  billingCycle: BillingCycle;
  onUpgrade: (plan: Plan) => void;
}

function PlanCard({ plan, isActive, billingCycle, onUpgrade }: PlanCardProps) {
  const displayPrice =
    billingCycle === 'monthly' ? plan.price : plan.annualPrice;
  const priceSuffix = billingCycle === 'monthly' ? '/month' : '/year';
  const monthlyEquiv =
    billingCycle === 'annual' && plan.annualPrice > 0
      ? Math.round(plan.annualPrice / 12)
      : null;

  return (
    <View
      style={[
        styles.planCard,
        isActive && styles.planCardActive,
        plan.recommended && !isActive && styles.planCardRecommended,
      ]}
    >
      {/* Recommended badge */}
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
        </View>
      )}

      {/* Plan name & price */}
      <View style={styles.planHeader}>
        <View style={styles.planNameWrap}>
          <Text style={[styles.planName, isActive && styles.planNameActive]}>
            {plan.name}
          </Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Current Plan</Text>
            </View>
          )}
        </View>

        <View style={styles.planPriceWrap}>
          {displayPrice === 0 ? (
            <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>
              Free
            </Text>
          ) : (
            <>
              <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>
                {formatCurrency(displayPrice)}
              </Text>
              <Text style={styles.planPriceSuffix}>{priceSuffix}</Text>
            </>
          )}
          {monthlyEquiv != null && (
            <Text style={styles.planMonthlyEquiv}>
              {formatCurrency(monthlyEquiv)}/mo
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.planMaxListings}>
        Up to {plan.maxListings} active listing{plan.maxListings !== 1 ? 's' : ''}
      </Text>

      {/* Features */}
      <View style={styles.featuresList}>
        {plan.features.map((f) => (
          <FeatureRow key={f} text={f} />
        ))}
      </View>

      {/* CTA */}
      {!isActive && (
        <TouchableOpacity
          style={[
            styles.planCta,
            plan.recommended && styles.planCtaRecommended,
          ]}
          onPress={() => onUpgrade(plan)}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.planCtaText,
              plan.recommended && styles.planCtaTextRecommended,
            ]}
          >
            {plan.id === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
          </Text>
        </TouchableOpacity>
      )}

      {isActive && (
        <View style={styles.planCurrentLabel}>
          <Text style={styles.planCurrentLabelText}>
            ✓ Your current plan
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [billingHistory, setBillingHistory] = useState<SubscriptionPayment[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const loadData = useCallback(async () => {
    if (!uid) return;

    try {
      // Load landlord subscription field
      const landlordDoc = await firestore().collection('landlords').doc(uid).get();
      const landlordData = landlordDoc.data() as
        | {
            subscription?: SubscriptionData;
          }
        | undefined;

      if (landlordData?.subscription) {
        setSubscription(landlordData.subscription);
      } else {
        setSubscription({ plan: 'free', status: 'free' });
      }

      // Load billing history
      const historySnap = await firestore()
        .collection('subscriptionPayments')
        .where('landlordId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const history: SubscriptionPayment[] = historySnap.docs.map((d) => {
        const data = d.data() as Omit<SubscriptionPayment, 'id'> & {
          landlordId?: string;
        };
        return {
          id: d.id,
          amount: data.amount ?? 0,
          plan: data.plan ?? '',
          status: data.status ?? '',
          billingCycle: data.billingCycle ?? 'monthly',
          createdAt: data.createdAt ?? null,
          reference: data.reference,
        };
      });

      setBillingHistory(history);
    } catch {
      // Keep defaults on error — don't block the screen
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleUpgrade = useCallback((plan: Plan) => {
    Alert.alert(
      'Upgrade Plan',
      `Subscription upgrade coming soon. Contact support@directrent.ng to upgrade to the ${plan.name} plan.`,
      [{ text: 'OK' }]
    );
  }, []);

  const currentPlanId = subscription?.plan ?? 'free';
  const subStatus = subscription?.status ?? 'free';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading subscription…</Text>
      </View>
    );
  }

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>← Subscription</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan banner */}
        <View style={styles.currentPlanBanner}>
          <View style={styles.currentPlanLeft}>
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
            <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: subStatusColor(subStatus) + '1A', borderColor: subStatusColor(subStatus) }]}>
            <Text style={[styles.statusBadgeText, { color: subStatusColor(subStatus) }]}>
              {subStatusLabel(subStatus)}
            </Text>
          </View>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'monthly' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('monthly')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.billingBtnText,
                billingCycle === 'monthly' && styles.billingBtnTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingBtn, billingCycle === 'annual' && styles.billingBtnActive]}
            onPress={() => setBillingCycle('annual')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.billingBtnText,
                billingCycle === 'annual' && styles.billingBtnTextActive,
              ]}
            >
              Annual{' '}
              <Text style={styles.savingsTag}>Save 17%</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan cards */}
        <View style={styles.plansWrap}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={plan.id === currentPlanId}
              billingCycle={billingCycle}
              onUpgrade={handleUpgrade}
            />
          ))}
        </View>

        {/* Billing history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing History</Text>
          {billingHistory.length > 0 ? (
            <View style={styles.historyList}>
              {billingHistory.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyRow,
                    index < billingHistory.length - 1 && styles.historyRowBorder,
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyPlan}>
                      {planDisplayName(item.plan)} —{' '}
                      {item.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </Text>
                    {item.reference ? (
                      <Text style={styles.historyRef}>Ref: {item.reference}</Text>
                    ) : null}
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(item.amount)}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(item.createdAt)}
                    </Text>
                    <View
                      style={[
                        styles.historyStatus,
                        {
                          backgroundColor:
                            item.status === 'success'
                              ? SUCCESS + '1A'
                              : ERROR + '1A',
                          borderColor:
                            item.status === 'success' ? SUCCESS : ERROR,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          {
                            color:
                              item.status === 'success' ? SUCCESS : ERROR,
                          },
                        ]}
                      >
                        {item.status === 'success' ? 'Paid' : item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>🧾</Text>
              <Text style={styles.emptyHistoryText}>No billing history yet.</Text>
              <Text style={styles.emptyHistorySubText}>
                Subscription payments will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Support note */}
        <View style={styles.supportNote}>
          <Text style={styles.supportNoteText}>
            For billing questions or to manage your subscription, contact{' '}
            <Text style={styles.supportEmail}>support@directrent.ng</Text>
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function subStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return SUCCESS;
    case 'expired':
      return ERROR;
    case 'cancelled':
      return TEXT_SECONDARY;
    default:
      return PRIMARY;
  }
}

function subStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'free':
      return 'Free';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function planDisplayName(planId: string): string {
  const plan = PLANS.find((p) => p.id === planId);
  return plan?.name ?? planId;
}

function formatDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate();
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  header: {
    backgroundColor: SURFACE,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBack: {},
  headerBackText: { fontSize: 17, fontWeight: '600', color: PRIMARY },

  scrollContent: { padding: 16 },

  currentPlanBanner: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  currentPlanLeft: {},
  currentPlanLabel: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 2 },
  currentPlanName: { fontSize: 20, fontWeight: '800', color: TEXT_COLOR },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  billingToggle: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    overflow: 'hidden',
  },
  billingBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  billingBtnActive: { backgroundColor: PRIMARY },
  billingBtnText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  billingBtnTextActive: { color: '#FFF' },
  savingsTag: {
    fontSize: 11,
    fontWeight: '700',
    color: SECONDARY,
  },

  plansWrap: { gap: 16, marginBottom: 24 },

  planCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  planCardActive: {
    borderColor: PRIMARY,
    borderWidth: 2,
    backgroundColor: PRIMARY_LIGHT,
  },
  planCardRecommended: {
    borderColor: SECONDARY,
    borderWidth: 2,
  },

  recommendedBadge: {
    backgroundColor: SECONDARY,
    borderRadius: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  planNameWrap: { flex: 1, marginRight: 8 },
  planName: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR, marginBottom: 4 },
  planNameActive: { color: PRIMARY },
  activeBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 22, fontWeight: '800', color: TEXT_COLOR },
  planPriceActive: { color: PRIMARY },
  planPriceSuffix: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  planMonthlyEquiv: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },

  planMaxListings: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 14,
  },

  featuresList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureCheck: { fontSize: 13, fontWeight: '800', color: SUCCESS, flexShrink: 0 },
  featureText: { fontSize: 13, color: TEXT_COLOR, flex: 1, lineHeight: 19 },

  planCta: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  planCtaRecommended: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  planCtaText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  planCtaTextRecommended: { color: '#FFF' },

  planCurrentLabel: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  planCurrentLabelText: { fontSize: 14, fontWeight: '600', color: PRIMARY },

  section: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 14,
  },

  historyList: { gap: 0 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historyLeft: { flex: 1, marginRight: 12 },
  historyPlan: { fontSize: 14, fontWeight: '600', color: TEXT_COLOR, marginBottom: 3 },
  historyRef: { fontSize: 11, color: TEXT_SECONDARY },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 15, fontWeight: '800', color: TEXT_COLOR },
  historyDate: { fontSize: 11, color: TEXT_SECONDARY },
  historyStatus: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  historyStatusText: { fontSize: 10, fontWeight: '700' },

  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyHistoryIcon: { fontSize: 36, marginBottom: 10 },
  emptyHistoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  emptyHistorySubText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  supportNote: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  supportNoteText: {
    fontSize: 13,
    color: SUCCESS,
    lineHeight: 20,
    textAlign: 'center',
  },
  supportEmail: {
    fontWeight: '700',
    color: PRIMARY,
  },
});
