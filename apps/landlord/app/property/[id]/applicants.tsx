import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import functions from '@react-native-firebase/functions';
import { PropertyService } from '../../../../../packages/shared/src/services/property.service';
import { ApplicationService } from '../../../../../packages/shared/src/services/application.service';
import type {
  Application,
  ApplicationStatus,
  TenantSnapshot,
} from '../../../../../packages/shared/src/types/application';
import type { Property } from '../../../../../packages/shared/src/types/property';
import { EmptyState } from '../../../../../packages/shared/src/components/EmptyState';
import type { RootState } from '../../../store';

// ─── Design tokens ────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeDate(
  timestamp: { toDate: () => Date } | null | undefined
): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function leaseDurationLabel(ld: string): string {
  switch (ld) {
    case '1_year': return '1 Year';
    case '2_years': return '2 Years';
    case '3_years': return '3 Years';
    default: return ld;
  }
}

function employmentStatusLabel(status: string): string {
  switch (status) {
    case 'employed': return 'Employed';
    case 'self_employed': return 'Self-Employed';
    case 'student': return 'Student';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config: Record<ApplicationStatus, { bg: string; label: string }> = {
    pending: { bg: SECONDARY, label: 'Pending' },
    viewed: { bg: '#1565C0', label: 'Viewed' },
    accepted: { bg: PRIMARY, label: 'Accepted ✓' },
    rejected: { bg: ERROR, label: 'Rejected' },
    withdrawn: { bg: TEXT_SECONDARY, label: 'Withdrawn' },
    expired: { bg: '#9E9E9E', label: 'Expired' },
  };
  const c = config[status] ?? { bg: '#9E9E9E', label: status };
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={styles.statusBadgeText}>{c.label}</Text>
    </View>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  color = TEXT_COLOR,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Applicant card ───────────────────────────────────────────────────────────
interface ApplicantCardProps {
  application: Application;
  onAccept: (app: Application) => void;
  onReject: (app: Application) => void;
}

function ApplicantCard({ application, onAccept, onReject }: ApplicantCardProps) {
  const { tenantSnapshot, details, status } = application;
  const showActions = status === 'pending' || status === 'viewed';

  const employmentChipColor =
    tenantSnapshot.employmentInfo?.status === 'employed'
      ? SUCCESS
      : tenantSnapshot.employmentInfo?.status === 'student'
      ? '#1565C0'
      : SECONDARY;

  return (
    <View style={styles.applicantCard}>
      {/* Top: photo + name + verified badges */}
      <View style={styles.applicantTop}>
        <View style={styles.applicantAvatarWrap}>
          {tenantSnapshot.photoUrl ? (
            <Image
              source={{ uri: tenantSnapshot.photoUrl }}
              style={styles.applicantAvatar}
            />
          ) : (
            <View style={styles.applicantAvatarPlaceholder}>
              <Text style={styles.applicantAvatarInitial}>
                {tenantSnapshot.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.applicantTopInfo}>
          <Text style={styles.applicantName}>{tenantSnapshot.name}</Text>
          <View style={styles.badgeRow}>
            {tenantSnapshot.verification.bvn && (
              <View style={styles.verifiedChip}>
                <Text style={styles.verifiedChipText}>BVN ✓</Text>
              </View>
            )}
            {tenantSnapshot.verification.nin && (
              <View style={styles.verifiedChip}>
                <Text style={styles.verifiedChipText}>NIN ✓</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rating */}
      {tenantSnapshot.rating.count > 0 && (
        <Text style={styles.ratingLine}>
          ⭐ {tenantSnapshot.rating.average.toFixed(1)}{' '}
          <Text style={styles.ratingCount}>
            ({tenantSnapshot.rating.count} review
            {tenantSnapshot.rating.count !== 1 ? 's' : ''})
          </Text>
        </Text>
      )}

      {/* Employment info */}
      {tenantSnapshot.employmentInfo && (
        <View style={styles.employmentRow}>
          <View
            style={[
              styles.employmentStatusChip,
              { backgroundColor: employmentChipColor + '1A', borderColor: employmentChipColor },
            ]}
          >
            <Text style={[styles.employmentStatusText, { color: employmentChipColor }]}>
              {employmentStatusLabel(tenantSnapshot.employmentInfo.status)}
            </Text>
          </View>
          {tenantSnapshot.employmentInfo.employer && (
            <Text style={styles.employerText} numberOfLines={1}>
              {tenantSnapshot.employmentInfo.role
                ? `${tenantSnapshot.employmentInfo.role} @ ${tenantSnapshot.employmentInfo.employer}`
                : tenantSnapshot.employmentInfo.employer}
            </Text>
          )}
          {tenantSnapshot.employmentInfo.monthlyIncome && (
            <Text style={styles.incomeText}>
              {tenantSnapshot.employmentInfo.monthlyIncome}/month
            </Text>
          )}
        </View>
      )}

      {/* Message preview */}
      {details.message.trim().length > 0 && (
        <Text style={styles.msgPreview} numberOfLines={3}>
          "{details.message.trim().slice(0, 100)}
          {details.message.trim().length > 100 ? '…' : ''}"
        </Text>
      )}

      {/* Application detail chips */}
      <View style={styles.detailsRow}>
        <View style={styles.detailChip}>
          <Text style={styles.detailChipText}>
            📅 {new Date(details.preferredMoveIn).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
        <View style={styles.detailChip}>
          <Text style={styles.detailChipText}>
            🔑 {leaseDurationLabel(details.leaseDuration)}
          </Text>
        </View>
        <View style={styles.detailChip}>
          <Text style={styles.detailChipText}>
            👥 {details.occupants.adults} adult
            {details.occupants.adults !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Profile completeness bar */}
      <View style={styles.completenessRow}>
        <Text style={styles.completenessLabel}>
          Profile: {tenantSnapshot.profileCompleteness}%
        </Text>
        <View style={styles.completenessBar}>
          <View
            style={[
              styles.completenessBarFill,
              {
                width: `${Math.max(0, Math.min(100, tenantSnapshot.profileCompleteness))}%`,
                backgroundColor:
                  tenantSnapshot.profileCompleteness >= 80
                    ? SUCCESS
                    : tenantSnapshot.profileCompleteness >= 50
                    ? SECONDARY
                    : ERROR,
              },
            ]}
          />
        </View>
      </View>

      {/* Status + applied date */}
      <View style={styles.statusRow}>
        <StatusBadge status={status} />
        <Text style={styles.appliedDate}>{formatRelativeDate(application.createdAt)}</Text>
      </View>

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(application)}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(application)}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptBtnText}>✓ Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ApplicantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [applications, setApplications] = useState<Application[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!uid || !id) return;

    try {
      const prop = await PropertyService.getProperty(id);

      if (!prop) {
        Alert.alert('Not Found', 'This property does not exist.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      if (prop.landlordId !== uid) {
        Alert.alert('Access Denied', 'You do not have permission to view this property.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      setProperty(prop);

      const apps = await ApplicationService.getApplicationsByProperty(id);
      setApplications(apps);
    } catch (err) {
      Alert.alert('Error', 'Failed to load applicants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid, id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const doRespond = useCallback(
    async (app: Application, action: 'accept' | 'reject', message?: string) => {
      try {
        const respond = functions().httpsCallable('respondToApplication');
        await respond({ applicationId: app.id, action, message });
        const newStatus: ApplicationStatus = action === 'accept' ? 'accepted' : 'rejected';
        setApplications(prev =>
          prev.map(a => (a.id === app.id ? { ...a, status: newStatus } : a))
        );
        if (action === 'accept') {
          Alert.alert('Application Accepted!', 'The tenant will be notified.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Operation failed.';
        Alert.alert('Error', msg);
      }
    },
    []
  );

  const handleAccept = useCallback(
    (app: Application) => {
      Alert.alert(
        'Accept Application',
        `Accept ${app.tenantSnapshot.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => doRespond(app, 'accept') },
        ]
      );
    },
    [doRespond]
  );

  const handleReject = useCallback(
    (app: Application) => {
      Alert.alert(
        'Reject Application',
        `Reject ${app.tenantSnapshot.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () =>
              Alert.prompt(
                'Rejection Reason (Optional)',
                'Add a brief message (optional):',
                [
                  { text: 'Skip', onPress: () => doRespond(app, 'reject', '') },
                  {
                    text: 'Send',
                    onPress: (text?: string) => doRespond(app, 'reject', text ?? ''),
                  },
                ],
                'plain-text',
                '',
                'default'
              ),
          },
        ]
      );
    },
    [doRespond]
  );

  const totalCount = applications.length;
  const pendingCount = applications.filter(
    a => a.status === 'pending' || a.status === 'viewed'
  ).length;
  const acceptedCount = applications.filter(a => a.status === 'accepted').length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading applicants…</Text>
      </View>
    );
  }

  const propertyTitle = property?.title ?? 'Property';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>
        <View style={styles.applicantCountBadge}>
          <Text style={styles.applicantCountText}>{totalCount}</Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatChip label="Total" value={totalCount} color={TEXT_COLOR} />
        <View style={styles.statDivider} />
        <StatChip label="Pending" value={pendingCount} color={SECONDARY} />
        <View style={styles.statDivider} />
        <StatChip label="Accepted" value={acceptedCount} color={SUCCESS} />
      </View>

      {/* List */}
      <FlatList
        data={applications}
        keyExtractor={item => item.id}
        contentContainerStyle={
          applications.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No applicants yet"
            message="Tenants who apply for this property will appear here."
          />
        }
        renderItem={({ item }) => (
          <ApplicantCard
            application={item}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  backBtn: { paddingRight: 8 },
  backBtnText: { fontSize: 18, color: PRIMARY, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },
  applicantCountBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  applicantCountText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statChip: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: BORDER },

  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1 },

  applicantCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  applicantTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  applicantAvatarWrap: { marginRight: 10, flexShrink: 0 },
  applicantAvatar: { width: 48, height: 48, borderRadius: 24 },
  applicantAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantAvatarInitial: { fontSize: 20, fontWeight: '700', color: PRIMARY },
  applicantTopInfo: { flex: 1 },
  applicantName: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  verifiedChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedChipText: { fontSize: 10, fontWeight: '700', color: SUCCESS },

  ratingLine: { fontSize: 13, color: TEXT_COLOR, marginBottom: 6 },
  ratingCount: { color: TEXT_SECONDARY },

  employmentRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  employmentStatusChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  employmentStatusText: { fontSize: 11, fontWeight: '700' },
  employerText: { fontSize: 12, color: TEXT_COLOR, flex: 1 },
  incomeText: { fontSize: 12, color: SUCCESS, fontWeight: '600' },

  msgPreview: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },

  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip: {
    backgroundColor: BG,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailChipText: { fontSize: 11, color: TEXT_COLOR },

  completenessRow: { marginBottom: 8 },
  completenessLabel: { fontSize: 11, color: TEXT_SECONDARY, marginBottom: 4 },
  completenessBar: {
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  completenessBarFill: { height: '100%', borderRadius: 2 },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  appliedDate: { fontSize: 12, color: TEXT_SECONDARY },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ERROR,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: ERROR },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
