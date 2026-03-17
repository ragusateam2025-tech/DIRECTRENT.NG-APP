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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../../../store';
import { formatCurrency } from '../../../../../packages/shared/src/utils/currency';

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

// ─── Types ──────────────────────────────────────────────────────────────────
interface PropertyData {
  id: string;
  title?: string;
  pricing?: { annualRent?: number };
  location?: { area?: string };
  analytics?: {
    viewCount?: number;
    savedCount?: number;
    inquiryCount?: number;
    applicationCount?: number;
  };
  availability?: { status?: string };
}

interface ApplicationSummary {
  id: string;
  status: string;
  createdAt: { toDate: () => Date } | null;
}

type Period = '7d' | '30d' | 'all';

// ─── Metric card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value.toLocaleString('en-NG')}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────
interface StatusBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StatusBar({ label, count, total, color }: StatusBarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const fillWidth = count > 0 ? Math.max(pct, 2) : 0;
  return (
    <View style={styles.statusBarRow}>
      <Text style={styles.statusBarLabel}>{label}</Text>
      <View style={styles.statusBarTrack}>
        <View
          style={[
            styles.statusBarFill,
            { width: `${fillWidth}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.statusBarCount, { color }]}>{count}</Text>
    </View>
  );
}

// ─── Funnel row ───────────────────────────────────────────────────────────────
interface FunnelRowProps {
  label: string;
  count: number;
  baseCount: number;
  isBase?: boolean;
}

function FunnelRow({ label, count, baseCount, isBase = false }: FunnelRowProps) {
  const pct = baseCount > 0 ? (count / baseCount) * 100 : 0;
  const barWidth = isBase ? 100 : Math.max(pct, count > 0 ? 2 : 0);

  return (
    <View style={styles.funnelRow}>
      <Text style={styles.funnelLabel}>{label}</Text>
      <Text style={styles.funnelCount}>{count.toLocaleString('en-NG')}</Text>
      <View style={styles.funnelBarTrack}>
        <View
          style={[
            styles.funnelBarFill,
            {
              width: `${barWidth}%`,
              backgroundColor: isBase ? PRIMARY : PRIMARY_LIGHT,
            },
          ]}
        />
      </View>
      {!isBase && (
        <Text style={styles.funnelPct}>
          {baseCount > 0 ? `${pct.toFixed(1)}%` : '—'}
        </Text>
      )}
      {isBase && <Text style={styles.funnelPct} />}
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function PropertyAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');

  const loadData = useCallback(async () => {
    if (!uid || !id) return;

    try {
      // Load property document
      const propDoc = await firestore().collection('properties').doc(id).get();

      if (!propDoc.exists) {
        Alert.alert('Not Found', 'This property does not exist.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const propData = { id: propDoc.id, ...propDoc.data() } as PropertyData & {
        landlordId?: string;
      };

      if (propData.landlordId !== uid) {
        Alert.alert(
          'Access Denied',
          'You do not have permission to view this property.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setProperty(propData);

      // Load applications for this property
      const appsSnap = await firestore()
        .collection('applications')
        .where('propertyId', '==', id)
        .get();

      const appList: ApplicationSummary[] = appsSnap.docs.map((d) => {
        const data = d.data() as {
          status?: string;
          createdAt?: { toDate: () => Date } | null;
        };
        return {
          id: d.id,
          status: data.status ?? 'pending',
          createdAt: data.createdAt ?? null,
        };
      });

      setApplications(appList);
    } catch {
      Alert.alert('Error', 'Failed to load analytics. Please try again.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [uid, id, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading analytics…</Text>
      </View>
    );
  }

  if (!property) return null;

  // ── Derived metrics ──
  const viewCount = property.analytics?.viewCount ?? 0;
  const savedCount = property.analytics?.savedCount ?? 0;
  const inquiryCount = property.analytics?.inquiryCount ?? 0;
  const appCount = applications.length;

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const expiredCount = applications.filter(
    (a) => a.status === 'expired' || a.status === 'withdrawn'
  ).length;

  const availabilityStatus = property.availability?.status ?? 'available';
  const annualRent = property.pricing?.annualRent;
  const showTip = viewCount > 0 && appCount === 0;

  const PERIOD_LABELS: Record<Period, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    all: 'All Time',
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>← Analytics</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {property.title ?? 'Property Analytics'}
          </Text>
          {(property.location?.area != null || annualRent != null) && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {property.location?.area ?? ''}
              {property.location?.area != null && annualRent != null ? ' · ' : ''}
              {annualRent != null ? `${formatCurrency(annualRent)}/yr` : ''}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', 'all'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(p)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  selectedPeriod === p && styles.periodBtnTextActive,
                ]}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedPeriod !== 'all' && (
          <View style={styles.periodNote}>
            <Text style={styles.periodNoteText}>
              Showing all-time totals. Per-period breakdown coming soon.
            </Text>
          </View>
        )}

        {/* 4 metric cards */}
        <View style={styles.metricsRow}>
          <MetricCard icon="👁️" label="Views" value={viewCount} />
          <MetricCard icon="💾" label="Saves" value={savedCount} />
          <MetricCard icon="💬" label="Inquiries" value={inquiryCount} />
          <MetricCard icon="📝" label="Applications" value={appCount} />
        </View>

        {/* Application status breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Status</Text>
          {appCount > 0 ? (
            <View style={styles.statusBarsWrap}>
              <StatusBar
                label="Pending"
                count={pendingCount}
                total={appCount}
                color={SECONDARY}
              />
              <StatusBar
                label="Accepted"
                count={acceptedCount}
                total={appCount}
                color={SUCCESS}
              />
              <StatusBar
                label="Rejected"
                count={rejectedCount}
                total={appCount}
                color={ERROR}
              />
              <StatusBar
                label="Expired / Withdrawn"
                count={expiredCount}
                total={appCount}
                color={TEXT_SECONDARY}
              />
            </View>
          ) : (
            <Text style={styles.emptyMsg}>No applications received yet.</Text>
          )}
        </View>

        {/* Conversion funnel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Funnel</Text>
          <Text style={styles.sectionHint}>How viewers convert to applicants</Text>
          {viewCount > 0 ? (
            <View style={styles.funnelWrap}>
              <FunnelRow
                label="Views"
                count={viewCount}
                baseCount={viewCount}
                isBase
              />
              <FunnelRow
                label="Saves"
                count={savedCount}
                baseCount={viewCount}
              />
              <FunnelRow
                label="Inquiries"
                count={inquiryCount}
                baseCount={viewCount}
              />
              <FunnelRow
                label="Applications"
                count={appCount}
                baseCount={viewCount}
              />
              {acceptedCount > 0 && (
                <FunnelRow
                  label="Accepted"
                  count={acceptedCount}
                  baseCount={viewCount}
                />
              )}
            </View>
          ) : (
            <Text style={styles.emptyMsg}>
              No view data yet. Share your listing to start tracking.
            </Text>
          )}
        </View>

        {/* Listing status banner */}
        <View
          style={[
            styles.statusBanner,
            { borderColor: availabilityStatusColor(availabilityStatus) },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: availabilityStatusColor(availabilityStatus) },
            ]}
          />
          <Text
            style={[
              styles.statusBannerText,
              { color: availabilityStatusColor(availabilityStatus) },
            ]}
          >
            Listing Status: {availabilityStatusLabel(availabilityStatus)}
          </Text>
        </View>

        {/* Tips card — only shown when there are views but zero applications */}
        {showTip && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Improve Your Listing</Text>
            <Text style={styles.tipsText}>
              Low application rate. Consider reducing price or adding more photos.
            </Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipsItem}>
                • Reduce your asking price to match market rates
              </Text>
              <Text style={styles.tipsItem}>
                • Add more high-quality photos (5–10 recommended)
              </Text>
              <Text style={styles.tipsItem}>
                • List additional amenities to stand out
              </Text>
              <Text style={styles.tipsItem}>
                • Respond to inquiries quickly to build trust
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function availabilityStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return SUCCESS;
    case 'pending':
      return SECONDARY;
    case 'rented':
      return PRIMARY;
    default:
      return TEXT_SECONDARY;
  }
}

function availabilityStatusLabel(status: string): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'pending':
      return 'Pending';
    case 'rented':
      return 'Rented';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
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
  headerBack: { marginBottom: 6 },
  headerBackText: { fontSize: 17, fontWeight: '600', color: PRIMARY },
  headerTitleWrap: { marginTop: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR },
  headerSubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },

  scrollContent: { padding: 16 },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
    overflow: 'hidden',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  periodBtnTextActive: { color: '#FFF' },

  periodNote: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  periodNoteText: { fontSize: 12, color: SUCCESS },

  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  metricIcon: { fontSize: 18, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', color: TEXT_COLOR, marginBottom: 2 },
  metricLabel: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

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
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 14,
  },
  emptyMsg: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 8,
    fontStyle: 'italic',
  },

  statusBarsWrap: { gap: 12, marginTop: 12 },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBarLabel: {
    fontSize: 12,
    color: TEXT_COLOR,
    width: 120,
    flexShrink: 0,
  },
  statusBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: BG,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statusBarCount: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },

  funnelWrap: { gap: 10, marginTop: 6 },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  funnelLabel: {
    width: 88,
    fontSize: 12,
    color: TEXT_COLOR,
    fontWeight: '500',
    flexShrink: 0,
  },
  funnelCount: {
    width: 44,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_COLOR,
    textAlign: 'right',
  },
  funnelBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: BG,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  funnelBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  funnelPct: {
    width: 44,
    fontSize: 11,
    color: TEXT_SECONDARY,
    textAlign: 'right',
    fontWeight: '500',
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusBannerText: { fontSize: 14, fontWeight: '700' },

  tipsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 16,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#E65100', marginBottom: 6 },
  tipsText: { fontSize: 13, color: TEXT_COLOR, lineHeight: 20, marginBottom: 10 },
  tipsList: { gap: 6 },
  tipsItem: { fontSize: 13, color: TEXT_COLOR, lineHeight: 20 },
});
