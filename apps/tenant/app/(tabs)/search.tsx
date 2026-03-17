import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { PropertyCard } from '../../../../packages/shared/src/components/PropertyCard';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import type { Property, PropertyType, SearchFilters } from '../../../../packages/shared/src/types/property';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';

const QUICK_AREAS = ['Yaba', 'Ikeja', 'Lekki', 'Surulere', 'Ajah', 'Gbagada'];

const PROPERTY_TYPE_OPTIONS = [
  { id: 'self_contained', label: 'Self Contained' },
  { id: 'mini_flat', label: 'Mini Flat' },
  { id: 'one_bedroom', label: '1 Bedroom' },
  { id: 'two_bedroom', label: '2 Bedroom' },
  { id: 'three_bedroom', label: '3 Bedroom' },
  { id: 'duplex', label: 'Duplex' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'boys_quarters', label: 'Boys Quarters' },
];

const AMENITY_OPTIONS = [
  '24hr Electricity (Estate Power)',
  'Prepaid Meter',
  'Borehole Water',
  'Security (Gateman)',
  'CCTV',
  'Parking Space',
  'Generator Backup',
  'Tarred Road Access',
];

const PRICE_PRESETS = [
  { label: 'Under ₦500K', min: 0, max: 500000 },
  { label: '₦500K–₦1M', min: 500000, max: 1000000 },
  { label: '₦1M–₦2M', min: 1000000, max: 2000000 },
  { label: 'Above ₦2M', min: 2000000, max: 10000000 },
];

const BEDROOM_OPTIONS = [
  { label: 'Studio', value: 0 },
  { label: '1 Bed', value: 1 },
  { label: '2 Beds', value: 2 },
  { label: '3 Beds', value: 3 },
  { label: '4+', value: 4 },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' as const },
  { label: 'Price ↑', value: 'price_asc' as const },
  { label: 'Price ↓', value: 'price_desc' as const },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ area?: string }>();

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(() =>
    params.area ? { areas: [params.area] } : {}
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load saved IDs from Firestore
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    firestore()
      .collection('tenants')
      .doc(uid)
      .get()
      .then(doc => {
        if (doc.exists) {
          setSavedIds((doc.data() as { savedProperties?: string[] }).savedProperties || []);
        }
      })
      .catch(() => {});
  }, []);

  // Reload when filters change (but not on first mount from params)
  const fetchProperties = useCallback(async (activeFilters: SearchFilters) => {
    setLoading(true);
    try {
      const result = await PropertyService.searchProperties(activeFilters, 20);
      setProperties(result.properties);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters);
  }, [filters, fetchProperties]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await PropertyService.searchProperties(filters, 20, cursor);
      setProperties(prev => [...prev, ...result.properties]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      // fail silently
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, filters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor(undefined);
    fetchProperties(filters);
  }, [filters, fetchProperties]);

  const handleToggleArea = useCallback((area: string) => {
    setFilters(prev => {
      const existing = prev.areas || [];
      return {
        ...prev,
        areas: existing.includes(area)
          ? existing.filter(a => a !== area)
          : [...existing, area],
      };
    });
  }, []);

  const handleSave = useCallback(async (propertyId: string) => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    const isSaved = savedIds.includes(propertyId);
    setSavedIds(prev =>
      isSaved ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
    );
    try {
      if (isSaved) {
        await PropertyService.unsaveProperty(uid, propertyId);
      } else {
        await PropertyService.saveProperty(uid, propertyId);
      }
    } catch {
      // revert on error
      setSavedIds(prev =>
        isSaved ? [...prev, propertyId] : prev.filter(id => id !== propertyId)
      );
    }
  }, [savedIds]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.areas && filters.areas.length > 0) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.bedrooms && filters.bedrooms.length > 0) count++;
    if (filters.propertyTypes && filters.propertyTypes.length > 0) count++;
    if (filters.amenities && filters.amenities.length > 0) count++;
    if (filters.verifiedOnly) count++;
    return count;
  }, [filters]);

  // Client-side text filter
  const displayedProperties = useMemo(() => {
    if (!searchText.trim()) return properties;
    const q = searchText.toLowerCase();
    return properties.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.location.area.toLowerCase().includes(q) ||
        p.location.address.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [properties, searchText]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search apartments in Lagos..."
            placeholderTextColor={TEXT_SECONDARY}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Area Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {QUICK_AREAS.map(area => (
          <TouchableOpacity
            key={area}
            style={[
              styles.areaChip,
              (filters.areas || []).includes(area) && styles.areaChipActive,
            ]}
            onPress={() => handleToggleArea(area)}
          >
            <Text
              style={[
                styles.areaChipText,
                (filters.areas || []).includes(area) && styles.areaChipTextActive,
              ]}
            >
              {area}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.areaChip, activeFilterCount > 0 && styles.areaChipActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.areaChipText, activeFilterCount > 0 && styles.areaChipTextActive]}>
            🎛 Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersRow}
        >
          {filters.areas && filters.areas.map(area => (
            <TouchableOpacity
              key={area}
              style={styles.activeFilterChip}
              onPress={() => setFilters(prev => ({
                ...prev,
                areas: (prev.areas || []).filter(a => a !== area),
              }))}
            >
              <Text style={styles.activeFilterText}>📍 {area} ✕</Text>
            </TouchableOpacity>
          ))}
          {(filters.minPrice || filters.maxPrice) && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setFilters(prev => ({ ...prev, minPrice: undefined, maxPrice: undefined }))}
            >
              <Text style={styles.activeFilterText}>
                ₦{filters.minPrice ? (filters.minPrice / 1000) + 'K' : '0'} –{' '}
                {filters.maxPrice ? (filters.maxPrice / 1000) + 'K' : '∞'} ✕
              </Text>
            </TouchableOpacity>
          )}
          {filters.verifiedOnly && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setFilters(prev => ({ ...prev, verifiedOnly: false }))}
            >
              <Text style={styles.activeFilterText}>✓ Verified only ✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={() => setFilters({})}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultCount}>
          {loading ? 'Searching...' : `${displayedProperties.length} apartments found`}
        </Text>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={displayedProperties}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              variant="full"
              onPress={() => router.push(`/property/${item.id}`)}
              onSave={() => handleSave(item.id)}
              isSaved={savedIds.includes(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No properties found"
              message="Try adjusting your filters or search a different area."
              actionLabel="Clear Filters"
              onAction={() => setFilters({})}
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={PRIMARY} style={{ padding: 16 }} /> : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={
            displayedProperties.length === 0 ? { flex: 1 } : { paddingVertical: 8 }
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={newFilters => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Filter Modal ──────────────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
}

function FilterModal({ visible, filters, onApply, onClose }: FilterModalProps) {
  const [local, setLocal] = useState<SearchFilters>(filters);
  const [customMinText, setCustomMinText] = useState('');
  const [customMaxText, setCustomMaxText] = useState('');

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      setCustomMinText(filters.minPrice ? String(filters.minPrice) : '');
      setCustomMaxText(filters.maxPrice ? String(filters.maxPrice) : '');
    }
  }, [visible, filters]);

  const toggleArray = <T,>(field: keyof SearchFilters, value: T) => {
    setLocal(prev => {
      const arr = ((prev[field] as T[]) || []);
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const isPresetActive = (preset: typeof PRICE_PRESETS[0]) =>
    local.minPrice === preset.min && local.maxPrice === preset.max;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={filterStyles.container}>
        {/* Header */}
        <View style={filterStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={filterStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={filterStyles.title}>Filters</Text>
          <TouchableOpacity onPress={() => setLocal({})}>
            <Text style={filterStyles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={filterStyles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Price Range (per year)</Text>
            <View style={filterStyles.chipGrid}>
              {PRICE_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.label}
                  style={[filterStyles.chip, isPresetActive(preset) && filterStyles.chipActive]}
                  onPress={() =>
                    setLocal(prev => ({
                      ...prev,
                      minPrice: isPresetActive(preset) ? undefined : preset.min,
                      maxPrice: isPresetActive(preset) ? undefined : preset.max,
                    }))
                  }
                >
                  <Text
                    style={[filterStyles.chipText, isPresetActive(preset) && filterStyles.chipTextActive]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={filterStyles.customPriceRow}>
              <View style={filterStyles.customPriceInput}>
                <Text style={filterStyles.nairaPrefix}>₦</Text>
                <TextInput
                  style={filterStyles.priceInput}
                  value={customMinText}
                  onChangeText={v => {
                    setCustomMinText(v);
                    const n = parseInt(v.replace(/\D/g, ''), 10);
                    if (!isNaN(n)) setLocal(prev => ({ ...prev, minPrice: n }));
                  }}
                  placeholder="Min"
                  keyboardType="number-pad"
                  placeholderTextColor={TEXT_SECONDARY}
                />
              </View>
              <Text style={filterStyles.priceSep}>–</Text>
              <View style={filterStyles.customPriceInput}>
                <Text style={filterStyles.nairaPrefix}>₦</Text>
                <TextInput
                  style={filterStyles.priceInput}
                  value={customMaxText}
                  onChangeText={v => {
                    setCustomMaxText(v);
                    const n = parseInt(v.replace(/\D/g, ''), 10);
                    if (!isNaN(n)) setLocal(prev => ({ ...prev, maxPrice: n }));
                  }}
                  placeholder="Max"
                  keyboardType="number-pad"
                  placeholderTextColor={TEXT_SECONDARY}
                />
              </View>
            </View>
          </View>

          {/* Bedrooms */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Bedrooms</Text>
            <View style={filterStyles.chipRow}>
              {BEDROOM_OPTIONS.map(opt => {
                const active = (local.bedrooms || []).includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[filterStyles.chip, active && filterStyles.chipActive]}
                    onPress={() => toggleArray('bedrooms', opt.value)}
                  >
                    <Text style={[filterStyles.chipText, active && filterStyles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Property Type */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Property Type</Text>
            <View style={filterStyles.chipGrid}>
              {PROPERTY_TYPE_OPTIONS.map(opt => {
                const active = (local.propertyTypes || []).includes(opt.id as PropertyType);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[filterStyles.chip, active && filterStyles.chipActive]}
                    onPress={() => toggleArray('propertyTypes', opt.id as PropertyType)}
                  >
                    <Text style={[filterStyles.chipText, active && filterStyles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Amenities */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Amenities</Text>
            <View style={filterStyles.chipGrid}>
              {AMENITY_OPTIONS.map(amenity => {
                const active = (local.amenities || []).includes(amenity);
                return (
                  <TouchableOpacity
                    key={amenity}
                    style={[filterStyles.chip, active && filterStyles.chipActive]}
                    onPress={() => toggleArray('amenities', amenity)}
                  >
                    <Text style={[filterStyles.chipText, active && filterStyles.chipTextActive]}>
                      {amenity.length > 20 ? amenity.slice(0, 18) + '…' : amenity}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Verified Only */}
          <View style={filterStyles.section}>
            <View style={filterStyles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={filterStyles.switchLabel}>Verified Landlords Only</Text>
                <Text style={filterStyles.switchDesc}>Show only properties from verified landlords</Text>
              </View>
              <Switch
                value={local.verifiedOnly ?? false}
                onValueChange={v => setLocal(prev => ({ ...prev, verifiedOnly: v }))}
                trackColor={{ true: PRIMARY }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Sort By */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Sort By</Text>
            <View style={filterStyles.chipRow}>
              {SORT_OPTIONS.map(opt => {
                const active = local.sortBy === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[filterStyles.chip, active && filterStyles.chipActive]}
                    onPress={() => setLocal(prev => ({ ...prev, sortBy: opt.value }))}
                  >
                    <Text style={[filterStyles.chipText, active && filterStyles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Apply Button */}
        <View style={filterStyles.footer}>
          <TouchableOpacity style={filterStyles.applyBtn} onPress={() => onApply(local)}>
            <Text style={filterStyles.applyBtnText}>Show Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { paddingRight: 8 },
  backText: { fontSize: 30, color: PRIMARY, lineHeight: 34 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT_COLOR },
  clearIcon: { fontSize: 14, color: TEXT_SECONDARY, padding: 2 },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  areaChip: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  areaChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  areaChipText: { fontSize: 13, color: TEXT_COLOR, fontWeight: '600' },
  areaChipTextActive: { color: '#FFF' },
  activeFiltersRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  activeFilterChip: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  activeFilterText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  clearAllChip: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: SECONDARY,
  },
  clearAllText: { fontSize: 12, color: SECONDARY, fontWeight: '600' },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  resultCount: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

const filterStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cancelText: { fontSize: 15, color: TEXT_SECONDARY },
  title: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },
  resetText: { fontSize: 15, color: SECONDARY, fontWeight: '600' },
  content: { flex: 1 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_COLOR, marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: TEXT_COLOR, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  customPriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  customPriceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nairaPrefix: { fontSize: 15, color: TEXT_SECONDARY, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 14, color: TEXT_COLOR },
  priceSep: { fontSize: 18, color: TEXT_SECONDARY },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: TEXT_COLOR },
  switchDesc: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SURFACE,
  },
  applyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
