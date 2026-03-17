import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ApplicationService } from '../../../packages/shared/src/services/application.service';
import { PropertyService } from '../../../packages/shared/src/services/property.service';
import { formatCurrency } from '../../../packages/shared/src/utils/currency';
import type { Application, ApplicationStatus, LeaseDuration } from '../../../packages/shared/src/types/application';
import type { Property } from '../../../packages/shared/src/types/property';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EnrichedApplication extends Application {
  propertyTitle: string;
  propertyArea: string;
  propertyPrice: number;
  propertyPhoto: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEASE_LABELS: Record<LeaseDuration, string> = {
  '1_year': '1 Year',
  '2_years': '2 Years',
  '3_years': '3 Years',
};

function getStatusStyle(status: ApplicationStatus): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'pending':
      return { bg: '#FF6F00', text: '#FFFFFF', label: 'Pending' };
    case 'viewed':
      return { bg: '#1565C0', text: '#FFFFFF', label: 'Viewed' };
    case 'accepted':
      return { bg: PRIMARY, text: '#FFFFFF', label: 'Accepted' };
    case 'rejected':
      return { bg: '#C62828', text: '#FFFFFF', label: 'Rejected' };
    case 'withdrawn':
      return { bg: TEXT_SECONDARY, text: '#FFFFFF', label: 'Withdrawn' };
    case 'expired':
      return { bg: TEXT_SECONDARY, text: '#FFFFFF', label: 'Expired' };
    default:
      return { bg: BORDER, text: TEXT_SECONDARY, label: status };
  }
}

function getRelativeDays(timestamp: { seconds: number; nanoseconds: number }): string {
  const msNow = Date.now();
  const msCreated = timestamp.seconds * 1000;
  const diffDays = Math.floor((msNow - msCreated) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Applied today';
  if (diffDays === 1) return 'Applied 1 day ago';
  return `Applied ${diffDays} days ago`;
}

// ─── Application Card ─────────────────────────────────────────────────────────
function ApplicationCard({
  item,
  onWithdraw,
}: {
  item: EnrichedApplication;
  onWithdraw: (id: string) => void;
}) {
  const statusStyle = getStatusStyle(item.status);
  const canWithdraw = item.status === 'pending' || item.status === 'viewed';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/application/${item.id}`)}
    >
      <View style={styles.cardInner}>
        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {item.propertyPhoto ? (
            <Image
              source={{ uri: item.propertyPhoto }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.thumbnailPlaceholderText}>🏠</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {item.propertyTitle}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          <Text style={styles.propertySubtitle} numberOfLines={1}>
            {item.propertyArea}
            {item.propertyPrice > 0
              ? ` · ${formatCurrency(item.propertyPrice)}/yr`
              : ''}
          </Text>

          <Text style={styles.appliedDate}>
            {getRelativeDays(item.createdAt)}
          </Text>

          <Text style={styles.leaseDuration}>
            Lease: {LEASE_LABELS[item.details.leaseDuration]}
          </Text>

          {canWithdraw && (
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => onWithdraw(item.id)}
            >
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No applications yet</Text>
      <Text style={styles.emptyMessage}>
        Apply for properties to track your applications here.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Text style={styles.emptyBtnText}>Browse Properties</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyApplicationsScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadApplications = useCallback(async (isRefresh = false) => {
    if (!uid) return;
    if (!isRefresh) setLoading(true);

    try {
      const raw = await ApplicationService.getApplicationsByTenant(uid);

      // Enrich each application with property details in parallel
      const enriched = await Promise.all(
        raw.map(async (app): Promise<EnrichedApplication> => {
          let propertyTitle = 'Property';
          let propertyArea = '';
          let propertyPrice = 0;
          let propertyPhoto: string | null = null;

          try {
            const prop: Property | null = await PropertyService.getProperty(
              app.propertyId
            );
            if (prop) {
              propertyTitle = prop.title;
              propertyArea = prop.location.area;
              propertyPrice = prop.pricing.annualRent;
              const primaryPhoto = prop.media.photos.find(p => p.isPrimary);
              propertyPhoto =
                primaryPhoto?.url ?? prop.media.photos[0]?.url ?? null;
            }
          } catch {
            // Leave defaults if property fetch fails
          }

          return {
            ...app,
            propertyTitle,
            propertyArea,
            propertyPrice,
            propertyPhoto,
          };
        })
      );

      setApplications(enriched);
    } catch {
      Alert.alert('Error', 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useEffect(() => {
    loadApplications(false);
  }, [loadApplications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadApplications(true);
  }, [loadApplications]);

  const handleWithdraw = useCallback(
    (applicationId: string) => {
      Alert.alert(
        'Withdraw Application',
        'Are you sure you want to withdraw this application? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              try {
                await ApplicationService.withdrawApplication(applicationId);
                setApplications(prev =>
                  prev.map(a =>
                    a.id === applicationId ? { ...a, status: 'withdrawn' } : a
                  )
                );
              } catch {
                Alert.alert('Error', 'Failed to withdraw application. Please try again.');
              }
            },
          },
        ]
      );
    },
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Applications</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={applications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ApplicationCard item={item} onWithdraw={handleWithdraw} />
        )}
        contentContainerStyle={[
          styles.listContent,
          applications.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '600',
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: 12,
  },
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  thumbnailWrapper: {
    width: 80,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnail: {
    width: 80,
    height: 70,
  },
  thumbnailPlaceholder: {
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  propertySubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  appliedDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  leaseDuration: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  withdrawBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  withdrawBtnText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: SURFACE,
  },
});
