import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { RootState } from '../../store';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PropertyPhoto {
  url?: string;
  isPrimary?: boolean;
}

interface SavedProperty {
  id: string;
  title?: string;
  propertyType?: string;
  location?: { area?: string; address?: string };
  pricing?: { annualRent?: number };
  details?: { bedrooms?: number };
  media?: { photos?: PropertyPhoto[] };
  availability?: { status?: string };
}

type AvailabilityStatus = 'available' | 'pending' | 'rented' | string;

interface StatusBadgeConfig {
  label: string;
  color: string;
  bg: string;
}

function getAvailabilityConfig(status: AvailabilityStatus): StatusBadgeConfig {
  switch (status) {
    case 'available':
      return { label: 'Available', color: SUCCESS, bg: '#E8F5E9' };
    case 'pending':
      return { label: 'Pending', color: SECONDARY, bg: '#FFF3E0' };
    case 'rented':
      return { label: 'Rented', color: TEXT_SECONDARY, bg: '#F5F5F5' };
    default:
      return { label: status, color: TEXT_SECONDARY, bg: '#F5F5F5' };
  }
}

// ─── Property Card ────────────────────────────────────────────────────────────
function SavedPropertyCard({
  property,
  onPress,
  onRemove,
}: {
  property: SavedProperty;
  onPress: () => void;
  onRemove: () => void;
}) {
  const photoUrl = property.media?.photos?.find((p) => p.isPrimary)?.url
    ?? property.media?.photos?.[0]?.url;

  const status = property.availability?.status ?? 'available';
  const statusConfig = getAvailabilityConfig(status);
  const bedrooms = property.details?.bedrooms ?? 0;

  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress} activeOpacity={0.85}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>🏠</Text>
          </View>
        )}
        {/* Status badge overlay */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {property.title ?? 'Unnamed Property'}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {[property.location?.area, property.propertyType].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {/* Remove / heart button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={onRemove}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.heartIcon}>❤️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.priceText}>
            {typeof property.pricing?.annualRent === 'number'
              ? `${formatCurrency(property.pricing.annualRent)}/year`
              : 'Price on request'}
          </Text>
          {bedrooms > 0 && (
            <Text style={styles.bedroomText}>
              {bedrooms} bedroom{bedrooms !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>♡</Text>
      <Text style={styles.emptyTitle}>No saved properties</Text>
      <Text style={styles.emptySubtitle}>
        Explore properties to save your favourites
      </Text>
      <TouchableOpacity
        style={styles.emptyActionBtn}
        onPress={() => router.push('/(tabs)/search')}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyActionBtnText}>Browse Properties</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SavedScreen(): React.JSX.Element {
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // ── Batch-fetch property docs for given IDs ────────────────────────────────
  const fetchProperties = useCallback(
    async (ids: string[]): Promise<SavedProperty[]> => {
      if (ids.length === 0) return [];

      // Firestore 'in' queries accept max 30 items; chunk if needed
      const CHUNK = 30;
      const results: SavedProperty[] = [];

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const snap = await firestore()
          .collection('properties')
          .where(firestore.FieldPath.documentId(), 'in', chunk)
          .get();

        snap.docs.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as Omit<SavedProperty, 'id'>) });
        });
      }

      // Preserve saved order
      const indexMap = new Map(ids.map((id, idx) => [id, idx]));
      results.sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));

      return results;
    },
    []
  );

  const loadSaved = useCallback(async (): Promise<void> => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      const tenantSnap = await firestore().collection('tenants').doc(uid).get();
      const ids: string[] = tenantSnap.data()?.savedProperties ?? [];
      const props = await fetchProperties(ids);
      setProperties(props);
    } catch {
      // fail silently — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid, fetchProperties]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const handleRefresh = useCallback((): void => {
    setRefreshing(true);
    void loadSaved();
  }, [loadSaved]);

  const handleRemove = useCallback(
    (propertyId: string, propertyTitle?: string): void => {
      Alert.alert(
        'Remove Saved Property',
        `Remove "${propertyTitle ?? 'this property'}" from your saved list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              if (!uid) return;
              // Optimistic remove
              setProperties((prev) => prev.filter((p) => p.id !== propertyId));
              setRemoving(propertyId);
              try {
                await firestore()
                  .collection('tenants')
                  .doc(uid)
                  .update({
                    savedProperties: firestore.FieldValue.arrayRemove(propertyId),
                  });
              } catch {
                // Roll back on failure
                void loadSaved();
                Alert.alert('Error', 'Failed to remove property. Please try again.');
              } finally {
                setRemoving(null);
              }
            },
          },
        ]
      );
    },
    [uid, loadSaved]
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Properties</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Properties</Text>
        {properties.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{properties.length}</Text>
          </View>
        )}
      </View>

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          renderItem={({ item }) => (
            <View style={removing === item.id ? styles.removingOverlay : undefined}>
              <SavedPropertyCard
                property={item}
                onPress={() => router.push(`/property/${item.id}`)}
                onRemove={() => handleRemove(item.id, item.title)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_COLOR,
    flex: 1,
  },
  countBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: SURFACE,
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  // Property card
  propertyCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  removingOverlay: {
    opacity: 0.4,
  },
  // Photo
  photoContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: '#E0E0E0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 40,
    opacity: 0.4,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Card content
  cardContent: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  heartBtn: {
    padding: 4,
  },
  heartIcon: {
    fontSize: 22,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY,
  },
  bedroomText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    color: '#BDBDBD',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyActionBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: SURFACE,
  },
});
