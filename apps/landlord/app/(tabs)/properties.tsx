import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
const WARNING = '#F57F17';

type FilterTab = 'all' | 'vacant' | 'occupied';

interface PropertyData {
  id: string;
  title: string;
  description: string;
  propertyType: string;
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
  media: {
    photos: Array<{
      url: string;
      thumbnail?: string;
      isPrimary: boolean;
      order: number;
    }>;
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
  createdAt: { toDate?: () => Date; seconds?: number } | null;
  publishedAt: { toDate?: () => Date; seconds?: number } | null;
}

function getDaysAgo(timestamp: PropertyData['createdAt']): number {
  if (!timestamp) return 0;
  let date: Date;
  if (typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'object' && 'seconds' in timestamp && timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    return 0;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getStatusConfig(availability: string, listing: string) {
  if (listing === 'paused') {
    return { label: 'Paused', bgColor: '#F5F5F5', textColor: TEXT_SECONDARY };
  }
  if (listing === 'draft') {
    return { label: 'Draft', bgColor: '#FFF3E0', textColor: WARNING };
  }
  switch (availability) {
    case 'available':
      return { label: 'Vacant', bgColor: PRIMARY_LIGHT, textColor: SUCCESS };
    case 'rented':
      return { label: 'Occupied', bgColor: '#E3F2FD', textColor: '#1565C0' };
    case 'pending':
      return { label: 'Pending', bgColor: '#FFF3E0', textColor: SECONDARY };
    default:
      return { label: 'Unknown', bgColor: '#F5F5F5', textColor: TEXT_SECONDARY };
  }
}

function PropertyManagementCard({ property }: { property: PropertyData }) {
  const daysListed = getDaysAgo(property.createdAt);
  const views = property.analytics?.viewCount || 0;
  const inquiries = property.analytics?.inquiryCount || 0;
  const applications = property.analytics?.applicationCount || 0;
  const statusConfig = getStatusConfig(
    property.status?.availability || 'available',
    property.status?.listing || 'active'
  );

  const isLowEngagement = views < 10 && daysListed >= 7;

  const primaryPhoto = property.media?.photos?.find((p) => p.isPrimary)
    || property.media?.photos?.[0];
  const photoUrl = primaryPhoto?.thumbnail || primaryPhoto?.url;

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.topRow}>
        {/* Thumbnail */}
        <View style={cardStyles.thumbnailContainer}>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={cardStyles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={cardStyles.thumbnailPlaceholder}>
              <Text style={cardStyles.thumbnailPlaceholderText}>🏠</Text>
            </View>
          )}
        </View>

        {/* Property Info */}
        <View style={cardStyles.infoContainer}>
          <View style={cardStyles.titleRow}>
            <Text style={cardStyles.title} numberOfLines={1}>
              {property.title}
            </Text>
            <View
              style={[
                cardStyles.statusBadge,
                { backgroundColor: statusConfig.bgColor },
              ]}
            >
              <Text
                style={[
                  cardStyles.statusBadgeText,
                  { color: statusConfig.textColor },
                ]}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <Text style={cardStyles.price}>
            {formatCurrency(property.pricing?.annualRent || 0)}/yr
          </Text>

          <Text style={cardStyles.area} numberOfLines={1}>
            📍 {property.location?.area}
            {daysListed > 0 ? `  ·  Listed ${daysListed}d ago` : ''}
          </Text>
        </View>
      </View>

      {/* Analytics Row */}
      <View style={cardStyles.analyticsRow}>
        <Text style={cardStyles.analyticItem}>
          👁 {views} views
        </Text>
        <Text style={cardStyles.analyticDot}>·</Text>
        <Text style={cardStyles.analyticItem}>
          💬 {inquiries} inquiries
        </Text>
        <Text style={cardStyles.analyticDot}>·</Text>
        <Text style={cardStyles.analyticItem}>
          📝 {applications} applications
        </Text>
      </View>

      {/* Low Engagement Warning */}
      {isLowEngagement && (
        <View style={cardStyles.warningBanner}>
          <Text style={cardStyles.warningText}>
            ⚠️ Low engagement. Consider updating photos or adjusting price.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={cardStyles.actionsRow}>
        <TouchableOpacity
          style={cardStyles.actionBtn}
          onPress={() =>
            router.push(`/property/${property.id}/edit`)
          }
          activeOpacity={0.7}
        >
          <Text style={cardStyles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.actionBtn, cardStyles.actionBtnPrimary]}
          onPress={() =>
            router.push(`/property/${property.id}/analytics`)
          }
          activeOpacity={0.7}
        >
          <Text style={cardStyles.actionBtnTextPrimary}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cardStyles.actionBtn}
          onPress={() =>
            router.push(`/property/${property.id}/applicants`)
          }
          activeOpacity={0.7}
        >
          <Text style={cardStyles.actionBtnText}>Applicants</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: 100,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_LIGHT,
  },
  thumbnailPlaceholderText: {
    fontSize: 32,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 4,
  },
  area: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  analyticItem: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  analyticDot: {
    fontSize: 12,
    color: BORDER,
    marginHorizontal: 6,
  },
  warningBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  actionBtnPrimary: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: '#C8E6C9',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  actionBtnTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
});

export default function PropertiesScreen() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const loadProperties = useCallback(async () => {
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
    loadProperties();
  }, [loadProperties]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProperties();
  }, [loadProperties]);

  const filteredProperties = properties.filter((p) => {
    switch (activeFilter) {
      case 'vacant':
        return p.status?.availability !== 'rented';
      case 'occupied':
        return p.status?.availability === 'rented';
      default:
        return true;
    }
  });

  const allCount = properties.length;
  const vacantCount = properties.filter(
    (p) => p.status?.availability !== 'rented'
  ).length;
  const occupiedCount = properties.filter(
    (p) => p.status?.availability === 'rented'
  ).length;

  const filterTabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: allCount },
    { key: 'vacant', label: 'Vacant', count: vacantCount },
    { key: 'occupied', label: 'Occupied', count: occupiedCount },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Properties</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/property/create')}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      {properties.length > 0 && (
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                activeFilter === tab.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === tab.key && styles.filterTabTextActive,
                ]}
              >
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Property List */}
      {properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="🏠"
            title="No properties listed yet"
            message="Add your first property to start attracting verified tenants in Lagos."
            actionLabel="Add First Property"
            onAction={() => router.push('/property/create')}
          />
        </View>
      ) : filteredProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.noResultsCard}>
            <Text style={styles.noResultsIcon}>🔍</Text>
            <Text style={styles.noResultsTitle}>
              No {activeFilter} properties
            </Text>
            <Text style={styles.noResultsMessage}>
              {activeFilter === 'vacant'
                ? 'All your properties are currently occupied.'
                : 'None of your properties are currently occupied.'}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyManagementCard property={item} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/property/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_COLOR,
  },
  addButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterTabActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  noResultsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  noResultsIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 6,
  },
  noResultsMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
});
