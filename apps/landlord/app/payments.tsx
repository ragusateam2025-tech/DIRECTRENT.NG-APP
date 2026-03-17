import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../store';
import { formatCurrency } from '../../../packages/shared/src/utils/currency';

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

type Tab = 'received' | 'payouts';

interface Payment {
  id: string;
  reference: string;
  tenantId: string;
  tenantName?: string;
  propertyId: string;
  propertyTitle?: string;
  amount: number;
  status: string;
  type: string;
  createdAt: { toDate: () => Date } | null;
  paidAt: { toDate: () => Date } | null;
  breakdown?: {
    deposit?: number;
    firstRent?: number;
    platformFee?: number;
  };
  payout?: {
    status: string;
    amount: number;
    scheduledAt: { toDate: () => Date } | null;
    completedAt: { toDate: () => Date } | null;
    reference?: string;
  };
}

function formatDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate();
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function payoutStatusColor(status: string): string {
  switch (status) {
    case 'completed': return SUCCESS;
    case 'pending': return SECONDARY;
    case 'processing': return PRIMARY;
    case 'failed': return ERROR;
    default: return TEXT_SECONDARY;
  }
}

function payoutStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Paid Out';
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'failed': return 'Failed';
    default: return status;
  }
}

interface ReceivedItemProps {
  item: Payment;
}

function ReceivedItem({ item }: ReceivedItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.propertyTitle ?? 'Property'}
          </Text>
          <Text style={styles.cardSub}>{item.tenantName ?? 'Tenant'}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: SUCCESS + '1A', borderColor: SUCCESS }]}>
            <Text style={[styles.statusBadgeText, { color: SUCCESS }]}>Received</Text>
          </View>
        </View>
      </View>

      {item.breakdown && (
        <View style={styles.breakdown}>
          {item.breakdown.deposit != null && item.breakdown.deposit > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Security Deposit</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(item.breakdown.deposit)}</Text>
            </View>
          )}
          {item.breakdown.firstRent != null && item.breakdown.firstRent > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>First Rent</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(item.breakdown.firstRent)}</Text>
            </View>
          )}
          {item.breakdown.platformFee != null && item.breakdown.platformFee > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee (deducted)</Text>
              <Text style={[styles.breakdownValue, { color: ERROR }]}>
                -{formatCurrency(item.breakdown.platformFee)}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardRef}>Ref: {item.reference}</Text>
        <Text style={styles.cardDate}>{formatDate(item.paidAt ?? item.createdAt)}</Text>
      </View>
    </View>
  );
}

interface PayoutItemProps {
  item: Payment;
}

function PayoutItem({ item }: PayoutItemProps) {
  const payout = item.payout!;
  const color = payoutStatusColor(payout.status);
  const label = payoutStatusLabel(payout.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.propertyTitle ?? 'Property'}
          </Text>
          <Text style={styles.cardSub}>{item.tenantName ?? 'Tenant'}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{formatCurrency(payout.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '1A', borderColor: color }]}>
            <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {payout.reference ? (
          <Text style={styles.cardRef}>Ref: {payout.reference}</Text>
        ) : (
          <Text style={styles.cardRef}>—</Text>
        )}
        <Text style={styles.cardDate}>
          {payout.status === 'completed'
            ? formatDate(payout.completedAt)
            : `Expected: ${formatDate(payout.scheduledAt)}`}
        </Text>
      </View>
    </View>
  );
}

export default function PaymentsScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [received, setReceived] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPayouts, setTotalPayouts] = useState(0);

  const loadPayments = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await firestore()
        .collection('payments')
        .where('landlordId', '==', uid)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .get();

      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

      // Enrich with property + tenant names
      const enriched = await Promise.all(
        raw.map(async (p) => {
          const [propSnap, userSnap] = await Promise.all([
            firestore().collection('properties').doc(p.propertyId).get(),
            firestore().collection('users').doc(p.tenantId).get(),
          ]);
          const propData = propSnap.data() as { title?: string } | undefined;
          const userData = userSnap.data() as { firstName?: string; lastName?: string } | undefined;
          const tenantName = userData
            ? `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() || 'Tenant'
            : 'Tenant';
          return {
            ...p,
            propertyTitle: propData?.title,
            tenantName,
          };
        })
      );

      const receivedList = enriched;
      const payoutList = enriched.filter(p => p.payout != null);

      setReceived(receivedList);
      setPayouts(payoutList);
      setTotalReceived(receivedList.reduce((s, p) => s + (p.amount ?? 0), 0));
      setTotalPayouts(payoutList.reduce((s, p) => s + (p.payout?.amount ?? 0), 0));
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const activeData = activeTab === 'received' ? received : payouts;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: SUCCESS }]}>
          <Text style={styles.summaryLabel}>Total Received</Text>
          <Text style={[styles.summaryAmount, { color: SUCCESS }]}>
            {formatCurrency(totalReceived)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: PRIMARY }]}>
          <Text style={styles.summaryLabel}>Total Payouts</Text>
          <Text style={[styles.summaryAmount, { color: PRIMARY }]}>
            {formatCurrency(totalPayouts)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received ({received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}
          onPress={() => setActiveTab('payouts')}
        >
          <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]}>
            Payouts ({payouts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading payments…</Text>
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={item => item.id}
          contentContainerStyle={
            activeData.length === 0 ? styles.emptyContainer : styles.listContent
          }
          renderItem={({ item }) =>
            activeTab === 'received' ? (
              <ReceivedItem item={item} />
            ) : (
              <PayoutItem item={item} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'received' ? '💳' : '🏦'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'received' ? 'No payments received yet' : 'No payouts yet'}
              </Text>
              <Text style={styles.emptyMsg}>
                {activeTab === 'received'
                  ? 'Payments from tenants will appear here once received.'
                  : 'Payout records will appear here after payment processing.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Bank account link */}
      <View style={styles.bankAccountBanner}>
        <Text style={styles.bankAccountText}>
          💡 Payouts go to your verified bank account
        </Text>
        <TouchableOpacity onPress={() => router.push('/bank-account' as never)}>
          <Text style={styles.bankAccountLink}>Update →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 22, fontWeight: '700', color: TEXT_COLOR },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 },
  summaryAmount: { fontSize: 18, fontWeight: '800' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  tabTextActive: { color: PRIMARY },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  listContent: { padding: 16, paddingBottom: 80 },
  emptyContainer: { flexGrow: 1 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_COLOR, marginBottom: 3 },
  cardSub: { fontSize: 13, color: TEXT_SECONDARY },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 17, fontWeight: '800', color: TEXT_COLOR },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  breakdown: {
    backgroundColor: BG,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: { fontSize: 12, color: TEXT_SECONDARY },
  breakdownValue: { fontSize: 12, fontWeight: '600', color: TEXT_COLOR },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRef: { fontSize: 11, color: TEXT_SECONDARY },
  cardDate: { fontSize: 11, color: TEXT_SECONDARY },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR, marginBottom: 8, textAlign: 'center' },
  emptyMsg: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 22 },

  bankAccountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  bankAccountText: { fontSize: 13, color: SUCCESS, flex: 1 },
  bankAccountLink: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginLeft: 12 },
});
