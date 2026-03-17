import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { ApplicationService } from '../../../../packages/shared/src/services/application.service';
import type { Application, ApplicationStatus } from '../../../../packages/shared/src/types/application';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import type { RootState } from '../../store';

// ─── Design tokens ───────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface EnrichedApplication extends Application {
  propertyTitle: string;
  propertyArea: string;
  propertyPhoto?: string;
}

type FilterType = 'all' | 'pending' | 'accepted' | 'rejected';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeDate(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function leaseDurationLabel(ld: string): string {
  switch (ld) {
    case '1_year': return '1 Year';
    case '2_years': return '2 Years';
    case '3_years': return '3 Years';
    default: return ld;
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: ApplicationStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<ApplicationStatus, { bg: string; label: string; textColor: string }> = {
    pending: { bg: SECONDARY, label: 'Pending', textColor: '#FFF' },
    viewed: { bg: '#1565C0', label: 'Viewed', textColor: '#FFF' },
    accepted: { bg: PRIMARY, label: 'Accepted ✓', textColor: '#FFF' },
    rejected: { bg: ERROR, label: 'Rejected', textColor: '#FFF' },
    withdrawn: { bg: TEXT_SECONDARY, label: 'Withdrawn', textColor: '#FFF' },
    expired: { bg: '#9E9E9E', label: 'Expired', textColor: '#FFF' },
  };

  const c = config[status] ?? { bg: '#9E9E9E', label: status, textColor: '#FFF' };

  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.textColor }]}>{c.label}</Text>
    </View>
  );
}

// ─── Application card ─────────────────────────────────────────────────────────
interface ApplicationCardProps {
  item: EnrichedApplication;
  onAccept: (app: EnrichedApplication) => void;
  onReject: (app: EnrichedApplication) => void;
  onPress: (app: EnrichedApplication) => void;
}

function ApplicationCard({ item, onAccept, onReject, onPress }: ApplicationCardProps) {
  const { tenantSnapshot, details, status } = item;
  const showActions = status === 'pending' || status === 'viewed';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(item)}>
      {/* Header row: thumbnail + title + status */}
      <View style={styles.cardHeader}>
        <View style={styles.thumbnail}>
          {item.propertyPhoto ? (
            <Image
              source={{ uri: item.propertyPhoto }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailPlaceholderText}>🏠</Text>
            </View>
          )}
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {item.propertyTitle}
            </Text>
            <StatusBadge status={status} />
          </View>
          <Text style={styles.propertyArea} numberOfLines={1}>
            📍 {item.propertyArea}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Tenant info row */}
      <View style={styles.tenantRow}>
        <View style={styles.tenantPhotoWrap}>
          {tenantSnapshot.photoUrl ? (
            <Image source={{ uri: tenantSnapshot.photoUrl }} style={styles.tenantPhoto} />
          ) : (
            <View style={styles.tenantPhotoPlaceholder}>
              <Text style={styles.tenantPhotoInitial}>
                {tenantSnapshot.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.tenantDetails}>
          <View style={styles.tenantNameRow}>
            <Text style={styles.tenantName}>{tenantSnapshot.name}</Text>
            <View style={styles.verificationChips}>
              {tenantSnapshot.verification.bvn && (
                <View style={styles.verifiedChip}>
                  <Text style={styles.verifiedChipText}>✓ BVN</Text>
                </View>
              )}
              {tenantSnapshot.verification.nin && (
                <View style={styles.verifiedChip}>
                  <Text style={styles.verifiedChipText}>✓ NIN</Text>
                </View>
              )}
            </View>
          </View>
          {tenantSnapshot.rating.count > 0 && (
            <Text style={styles.ratingText}>
              ⭐ {tenantSnapshot.rating.average.toFixed(1)}{' '}
              <Text style={styles.ratingCount}>({tenantSnapshot.rating.count} reviews)</Text>
            </Text>
          )}
          {tenantSnapshot.employmentInfo && (
            <Text style={styles.employmentText} numberOfLines={1}>
              {tenantSnapshot.employmentInfo.role
                ? `${tenantSnapshot.employmentInfo.role}${tenantSnapshot.employmentInfo.employer ? ` at ${tenantSnapshot.employmentInfo.employer}` : ''}`
                : tenantSnapshot.employmentInfo.status}
            </Text>
          )}
        </View>
      </View>

      {/* Application details */}
      <View style={styles.appDetails}>
        <View style={styles.appDetailRow}>
          <Text style={styles.appDetailLabel}>Applied:</Text>
          <Text style={styles.appDetailValue}>{formatRelativeDate(item.createdAt)}</Text>
        </View>
        <View style={styles.appDetailRow}>
          <Text style={styles.appDetailLabel}>Move-in:</Text>
          <Text style={styles.appDetailValue}>{formatDate(details.preferredMoveIn)}</Text>
        </View>
        <View style={styles.appDetailRow}>
          <Text style={styles.appDetailLabel}>Lease:</Text>
          <Text style={styles.appDetailValue}>{leaseDurationLabel(details.leaseDuration)}</Text>
        </View>
        <View style={styles.appDetailRow}>
          <Text style={styles.appDetailLabel}>Occupants:</Text>
          <Text style={styles.appDetailValue}>
            {details.occupants.adults} adult{details.occupants.adults !== 1 ? 's' : ''}
            {details.occupants.children > 0
              ? `, ${details.occupants.children} child${details.occupants.children !== 1 ? 'ren' : ''}`
              : ''}
            {details.occupants.pets.hasPets ? ' + pet(s)' : ''}
          </Text>
        </View>
      </View>

      {/* Message preview */}
      {details.message.trim().length > 0 && (
        <Text style={styles.messagePreview} numberOfLines={2}>
          "{details.message.trim().slice(0, 100)}{details.message.trim().length > 100 ? '…' : ''}"
        </Text>
      )}

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptBtnText}>✓ Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function InquiriesScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadApplications = useCallback(async () => {
    if (!uid) return;
    try {
      const raw = await ApplicationService.getApplicationsByLandlord(uid);

      const enriched = await Promise.all(
        raw.map(async (app): Promise<EnrichedApplication> => {
          try {
            const propDoc = await firestore()
              .collection('properties')
              .doc(app.propertyId)
              .get();

            if (propDoc.exists) {
              const data = propDoc.data() as {
                title?: string;
                location?: { area?: string };
                media?: { photos?: Array<{ url?: string; isPrimary?: boolean }> };
              };
              const photos = data.media?.photos ?? [];
              const primary = photos.find(p => p.isPrimary) ?? photos[0];
              return {
                ...app,
                propertyTitle: data.title ?? 'Property',
                propertyArea: data.location?.area ?? '',
                propertyPhoto: primary?.url,
              };
            }
          } catch {
            // silently fall through
          }
          return {
            ...app,
            propertyTitle: 'Property',
            propertyArea: '',
            propertyPhoto: undefined,
          };
        })
      );

      setApplications(enriched);
    } catch (err) {
      Alert.alert('Error', 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadApplications();
  }, [loadApplications]);

  const handleAccept = useCallback(
    (app: EnrichedApplication) => {
      Alert.alert(
        'Accept Application',
        `Accept ${app.tenantSnapshot.name}'s application for ${app.propertyTitle}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            style: 'default',
            onPress: async () => {
              try {
                const respond = functions().httpsCallable('respondToApplication');
                await respond({ applicationId: app.id, action: 'accept' });
                Alert.alert(
                  'Application Accepted!',
                  'The tenant will be notified.',
                  [{ text: 'OK' }]
                );
                setApplications(prev =>
                  prev.map(a => (a.id === app.id ? { ...a, status: 'accepted' } : a))
                );
              } catch (err: unknown) {
                const msg =
                  err instanceof Error ? err.message : 'Failed to accept application.';
                Alert.alert('Error', msg);
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleReject = useCallback(
    (app: EnrichedApplication) => {
      Alert.alert(
        'Reject Application',
        `Reject ${app.tenantSnapshot.name}'s application?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () => {
              Alert.prompt(
                'Rejection Reason (Optional)',
                'Add a brief message to the tenant (optional):',
                [
                  { text: 'Skip', style: 'cancel', onPress: () => doReject(app, '') },
                  {
                    text: 'Send',
                    onPress: (text?: string) => doReject(app, text ?? ''),
                  },
                ],
                'plain-text',
                '',
                'default'
              );
            },
          },
        ]
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const doReject = useCallback(async (app: EnrichedApplication, message: string) => {
    try {
      const respond = functions().httpsCallable('respondToApplication');
      await respond({ applicationId: app.id, action: 'reject', message });
      setApplications(prev =>
        prev.map(a => (a.id === app.id ? { ...a, status: 'rejected' } : a))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject application.';
      Alert.alert('Error', msg);
    }
  }, []);

  const handleCardPress = useCallback((_app: EnrichedApplication) => {
    router.push(`/property/${_app.propertyId}/applicants`);
  }, []);

  // Filter data client-side
  const filtered = applications.filter(a => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return a.status === 'pending' || a.status === 'viewed';
    return a.status === activeFilter;
  });

  const pendingCount = applications.filter(
    a => a.status === 'pending' || a.status === 'viewed'
  ).length;

  const emptyConfig: Record<FilterType, { icon: string; title: string; message: string }> = {
    all: {
      icon: '📋',
      title: 'No applications yet',
      message: 'Applications from interested tenants will appear here.',
    },
    pending: { icon: '⏳', title: 'No pending applications', message: '' },
    accepted: { icon: '✅', title: 'No accepted applications', message: '' },
    rejected: { icon: '❌', title: 'No rejected applications', message: '' },
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading applications…</Text>
      </View>
    );
  }

  const filters: FilterType[] = ['all', 'pending', 'accepted', 'rejected'];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Applications Inbox</Text>
        {applications.length > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{applications.length}</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map(f => {
            const isActive = activeFilter === f;
            const showCount = f === 'pending' && pendingCount > 0;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {FILTER_LABELS[f]}
                </Text>
                {showCount && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
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
            icon={emptyConfig[activeFilter].icon}
            title={emptyConfig[activeFilter].title}
            message={emptyConfig[activeFilter].message}
          />
        }
        renderItem={({ item }) => (
          <ApplicationCard
            item={item}
            onAccept={handleAccept}
            onReject={handleReject}
            onPress={handleCardPress}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT_COLOR },
  totalBadge: {
    marginLeft: 10,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalBadgeText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  filterWrap: {
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
  },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  filterChipActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  filterChipText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  filterChipTextActive: { color: PRIMARY },
  filterBadge: {
    marginLeft: 6,
    backgroundColor: SECONDARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1 },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    flexShrink: 0,
  },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: { fontSize: 28 },
  cardHeaderInfo: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
    flex: 1,
  },
  propertyArea: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 12 },

  tenantRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  tenantPhotoWrap: { marginRight: 10, flexShrink: 0 },
  tenantPhoto: { width: 44, height: 44, borderRadius: 22 },
  tenantPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantPhotoInitial: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  tenantDetails: { flex: 1 },
  tenantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  tenantName: { fontSize: 15, fontWeight: '700', color: TEXT_COLOR },
  verificationChips: { flexDirection: 'row', gap: 4 },
  verifiedChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  verifiedChipText: { fontSize: 10, fontWeight: '700', color: SUCCESS },
  ratingText: { fontSize: 12, color: TEXT_COLOR, marginBottom: 2 },
  ratingCount: { color: TEXT_SECONDARY },
  employmentText: { fontSize: 12, color: TEXT_SECONDARY },

  appDetails: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 3,
  },
  appDetailRow: { flexDirection: 'row', alignItems: 'center' },
  appDetailLabel: { fontSize: 12, color: TEXT_SECONDARY, width: 72 },
  appDetailValue: { fontSize: 12, color: TEXT_COLOR, fontWeight: '500', flex: 1 },

  messagePreview: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginHorizontal: 12,
    marginBottom: 10,
    lineHeight: 18,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    paddingTop: 8,
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
