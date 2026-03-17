import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import auth from '@react-native-firebase/auth';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';

interface PropertyData {
  id: string;
  title: string;
  location: {
    address: string;
    area: string;
    lga: string;
    state: string;
    coordinates: { latitude: number; longitude: number };
    nearbyLandmarks: string[];
  };
  pricing: {
    annualRent: number;
    cautionDeposit: number;
    serviceCharge: number;
    agreementFee: number;
    totalUpfront: number;
    platformFee: number;
    agentSavings: number;
  };
  status: {
    listing: 'draft' | 'active' | 'paused' | 'rented' | 'expired';
    availability: 'available' | 'pending' | 'rented';
    featured: boolean;
    verified: boolean;
  };
  analytics: {
    viewCount: number;
    savedCount: number;
    inquiryCount: number;
    applicationCount: number;
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      const props = await PropertyService.getPropertiesByLandlord(uid);
      setProperties(props as PropertyData[]);
    } catch (_err) {
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const firstName = profile?.firstName || 'Landlord';

  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(
    (p) => p.status?.availability === 'rented'
  ).length;
  const vacantProperties = totalProperties - occupiedProperties;
  const expectedRevenue = properties.reduce(
    (sum, p) => sum + (p.pricing?.annualRent || 0),
    0
  );

  const bvnVerified = profile?.verification?.bvn?.status === 'verified';
  const ninVerified = profile?.verification?.nin?.status === 'verified';
  const isIdentityVerified = bvnVerified || ninVerified;

  const totalViews = properties.reduce(
    (sum, p) => sum + (p.analytics?.viewCount || 0),
    0
  );
  const totalInquiries = properties.reduce(
    (sum, p) => sum + (p.analytics?.inquiryCount || 0),
    0
  );
  const totalApplications = properties.reduce(
    (sum, p) => sum + (p.analytics?.applicationCount || 0),
    0
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}!
            </Text>
            <Text style={styles.subGreeting}>Manage your Lagos portfolio</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() =>
              Alert.alert('Notifications', 'No new notifications')
            }
          >
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Verification Banner */}
        {!isIdentityVerified && (
          <TouchableOpacity
            style={styles.verifyBanner}
            onPress={() => router.push('/(verification)/bvn')}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyBannerIcon}>⚠️</Text>
            <View style={styles.verifyBannerContent}>
              <Text style={styles.verifyBannerTitle}>
                Complete Identity Verification
              </Text>
              <Text style={styles.verifyBannerText}>
                Verify your BVN or NIN to unlock all features
              </Text>
            </View>
            <Text style={styles.verifyBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Verification Badges (when verified) */}
        {isIdentityVerified && (
          <View style={styles.verificationBadges}>
            {bvnVerified && (
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>🏦</Text>
                <Text style={styles.badgeText}>BVN Verified</Text>
              </View>
            )}
            {ninVerified && (
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>🪪</Text>
                <Text style={styles.badgeText}>NIN Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Portfolio Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Portfolio Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{totalProperties}</Text>
              <Text style={styles.statLabel}>
                {'Total\nProperties'}
              </Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={[styles.statValue, { color: '#1565C0' }]}>
                {occupiedProperties}
              </Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={[styles.statValue, { color: SECONDARY }]}>
                {vacantProperties}
              </Text>
              <Text style={styles.statLabel}>Vacant</Text>
            </View>
          </View>
          {expectedRevenue > 0 && (
            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>
                Expected Annual Revenue
              </Text>
              <Text style={styles.revenueValue}>
                {formatCurrency(expectedRevenue)}
              </Text>
            </View>
          )}
        </View>

        {/* Activity Summary */}
        {totalProperties > 0 && (
          <View style={styles.activityCard}>
            <Text style={styles.sectionTitle}>Overall Performance</Text>
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{totalViews}</Text>
                <Text style={styles.activityLabel}>Total Views</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{totalInquiries}</Text>
                <Text style={styles.activityLabel}>Inquiries</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{totalApplications}</Text>
                <Text style={styles.activityLabel}>Applications</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle2}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionPrimary]}
            onPress={() => router.push('/property/create')}
            activeOpacity={0.8}
          >
            <Text style={[styles.quickActionIcon, { color: '#FFFFFF' }]}>+</Text>
            <Text style={styles.quickActionTextWhite}>Add Property</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/inquiries')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionText}>Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/messages')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionIcon}>💬</Text>
            <Text style={styles.quickActionText}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Properties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle2}>Recent Properties</Text>
          {properties.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/properties')}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {properties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="🏠"
              title="No properties listed yet"
              message="Create your first property listing to start receiving tenant inquiries."
              actionLabel="Add First Property"
              onAction={() => router.push('/property/create')}
            />
          </View>
        ) : (
          properties.slice(0, 3).map((property) => (
            <TouchableOpacity
              key={property.id}
              style={styles.recentPropertyCard}
              onPress={() =>
                router.push(`/property/${property.id}/analytics`)
              }
              activeOpacity={0.8}
            >
              <View style={styles.recentPropertyInfo}>
                <Text style={styles.recentPropertyTitle} numberOfLines={1}>
                  {property.title}
                </Text>
                <Text style={styles.recentPropertyPrice}>
                  {formatCurrency(property.pricing?.annualRent || 0)}/yr
                </Text>
                <Text style={styles.recentPropertyArea}>
                  📍 {property.location?.area}
                </Text>
              </View>
              <View style={styles.recentPropertyStats}>
                <Text style={styles.recentStat}>
                  👁 {property.analytics?.viewCount || 0}
                </Text>
                <Text style={styles.recentStat}>
                  💬 {property.analytics?.inquiryCount || 0}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    property.status?.availability === 'available'
                      ? styles.statusVacant
                      : styles.statusOccupied,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      property.status?.availability === 'available'
                        ? styles.statusVacantText
                        : styles.statusOccupiedText,
                    ]}
                  >
                    {property.status?.availability === 'available'
                      ? 'Vacant'
                      : property.status?.availability === 'pending'
                      ? 'Pending'
                      : 'Occupied'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_COLOR,
  },
  subGreeting: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  notificationBtn: {
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  verifyBannerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  verifyBannerContent: {
    flex: 1,
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
  },
  verifyBannerText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  verifyBannerArrow: {
    fontSize: 22,
    color: '#E65100',
    fontWeight: '700',
  },
  verificationBadges: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 4,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  revenueLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SUCCESS,
  },
  activityCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
  },
  sectionTitle2: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_COLOR,
  },
  activityLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionPrimary: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: TEXT_COLOR,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickActionTextWhite: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '600',
  },
  emptyContainer: {
    marginHorizontal: 16,
  },
  recentPropertyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  recentPropertyInfo: {
    flex: 1,
    marginRight: 12,
  },
  recentPropertyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  recentPropertyPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 4,
  },
  recentPropertyArea: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  recentPropertyStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recentStat: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  statusVacant: {
    backgroundColor: PRIMARY_LIGHT,
  },
  statusOccupied: {
    backgroundColor: '#E3F2FD',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusVacantText: {
    color: SUCCESS,
  },
  statusOccupiedText: {
    color: '#1565C0',
  },
  bottomSpacer: {
    height: 32,
  },
});
