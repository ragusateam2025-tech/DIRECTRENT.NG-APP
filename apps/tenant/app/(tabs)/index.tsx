import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { PropertyCard } from '../../../../packages/shared/src/components/PropertyCard';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import type { Property } from '../../../../packages/shared/src/types/property';

const PRIMARY = '#1B5E20';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';

const QUICK_AREAS = ['Yaba', 'Ikeja', 'Lekki', 'Surulere', 'Ajah', 'Gbagada', 'Maryland', 'Magodo'];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [featured, recent] = await Promise.all([
        PropertyService.getFeaturedProperties(6),
        PropertyService.getRecentProperties(10),
      ]);
      setFeaturedProperties(featured);
      setRecentProperties(recent);
    } catch {
      // fail silently — show empty states
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAreaPress = useCallback((area: string) => {
    router.push({ pathname: '/(tabs)/search', params: { area } });
  }, []);

  const handlePropertyPress = useCallback((id: string) => {
    router.push(`/property/${id}`);
  }, []);

  const handleToggleSave = useCallback((propertyId: string) => {
    // TODO: Persist savedIds to Firestore via PropertyService.saveProperty()
    setSavedIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  }, []);

  const firstName = profile?.firstName || 'there';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Finding properties for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}! 👋
            </Text>
            <Text style={styles.subGreeting}>Find your perfect Lagos home</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Text style={{ fontSize: 24 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar (tappable) */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search apartments in Lagos...</Text>
        </TouchableOpacity>

        {/* Quick Area Chips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse by Area</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {QUICK_AREAS.map(area => (
            <TouchableOpacity
              key={area}
              style={styles.areaChip}
              onPress={() => handleAreaPress(area)}
            >
              <Text style={styles.areaChipText}>📍 {area}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Properties */}
        {featuredProperties.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Featured Properties</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredProperties}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.featuredList}
              renderItem={({ item }) => (
                <PropertyCard
                  property={item}
                  variant="compact"
                  onPress={() => handlePropertyPress(item.id)}
                  onSave={() => handleToggleSave(item.id)}
                  isSaved={savedIds.includes(item.id)}
                  style={{ width: 280, marginRight: 12 }}
                />
              )}
            />
          </>
        )}

        {/* Recently Listed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🆕 Recently Listed</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentProperties.length === 0 ? (
          <EmptyState
            icon="🏠"
            title="No properties yet"
            message="Be the first to find great Lagos properties. Check back soon!"
            actionLabel="Search Now"
            onAction={() => router.push('/(tabs)/search')}
          />
        ) : (
          recentProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              variant="full"
              onPress={() => handlePropertyPress(property.id)}
              onSave={() => handleToggleSave(property.id)}
              isSaved={savedIds.includes(property.id)}
            />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: TEXT_COLOR },
  subGreeting: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 2 },
  notificationBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchPlaceholder: { color: TEXT_SECONDARY, fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR },
  seeAll: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  areaChip: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  areaChipText: { fontSize: 13, color: TEXT_COLOR, fontWeight: '600' },
  featuredList: { paddingHorizontal: 16, paddingBottom: 16 },
});
