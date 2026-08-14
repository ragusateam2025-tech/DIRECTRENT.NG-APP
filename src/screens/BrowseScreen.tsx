import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../theme/tokens';
import PropertyCard from '../components/PropertyCard';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import HomeHero from '../components/HomeHero';
import FilterSheet from '../components/FilterSheet';
import { PropertyCardSkeleton } from '../components/Skeleton';
import { fetchListings } from '../services/listings';
import {
  applyFilters,
  availableAreas,
  activeFilterCount,
  hasActiveFilters,
  EMPTY_FILTERS,
  type Filters,
} from '../lib/listingFilter';
import type { Listing } from '../types';
import type { BrowseStackParams } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<BrowseStackParams, 'BrowseList'>;

export default function BrowseScreen({ navigation }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The market scopes the fetch; text, bedrooms and price refine what comes
  // back. Firestore cannot do substring matching, and these run against a
  // capped page rather than the whole catalogue, so they stay on the device —
  // which also keeps search working offline from Firestore's cache.
  const visible = useMemo(() => applyFilters(listings, filters), [listings, filters]);
  const areas = useMemo(() => availableAreas(), []);

  /**
   * Areas the search hint offers, taken from the properties on screen rather
   * than from the market registry.
   *
   * The registry lists every area we have opened, including ones nobody has
   * listed in yet. Suggesting one of those hands the user a search that returns
   * nothing, which reads as a broken app rather than an empty area.
   */
  const suggestions = useMemo(
    () => [...new Set(listings.map(l => l.location?.area).filter(Boolean))] as string[],
    [listings],
  );

  const load = useCallback(async () => {
    setError('');
    try {
      // A single selected area narrows server-side; several still have to be
      // filtered here, because Firestore cannot OR across equality checks.
      const area = filters.areas.length === 1 ? filters.areas[0] : undefined;
      setListings(await fetchListings({ area }));
    } catch {
      setError('Could not load properties. Pull down to try again.');
    }
  }, [filters.areas]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Skeletons rather than a spinner: they hold the layout, so nothing jumps
  // when the real cards arrive, and they read as "content is coming".
  if (loading) {
    return (
      <SafeAreaView style={styles.wrapper} edges={['top', 'left', 'right']}>
        <View style={styles.list}>
          <View style={styles.header}>
            <Text style={styles.heading}>Rent directly in Lagos</Text>
            <Text style={styles.sub}>Finding verified properties…</Text>
          </View>
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  const filtering = hasActiveFilters(filters);

  return (
    <SafeAreaView style={styles.wrapper} edges={['top', 'left', 'right']}>
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentGold}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/*
              The pitch, and then out of the way.

              Someone who has started searching has already decided to look for
              a flat; arguing the case for the app above their results would be
              selling to a customer who has bought. It comes back when they
              clear the search, which is also when they are least sure what to
              do next.
            */}
            {filtering ? (
              <Text style={styles.heading}>Rent directly in Lagos</Text>
            ) : (
              <HomeHero />
            )}

            <Text style={styles.sub}>
              {filtering
                ? `${visible.length} of ${listings.length} ${listings.length === 1 ? 'property' : 'properties'}`
                : `${listings.length} verified ${listings.length === 1 ? 'property' : 'properties'} · no agent fees`}
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.searchWrap}>
              <SearchBar
                value={filters.query}
                onChangeText={query => setFilters(f => ({ ...f, query }))}
                onOpenFilters={() => setSheetOpen(true)}
                activeFilters={activeFilterCount(filters)}
                suggestions={suggestions}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          filtering ? (
            <EmptyState
              variant="noMatch"
              title="Nothing matches those filters"
              body="Try widening your search — a different area, fewer bedrooms, or a higher price range."
            />
          ) : (
            <EmptyState
              variant="empty"
              title="No properties yet"
              body="Listings will appear here once they are published. Pull down to refresh."
            />
          )
        }
        renderItem={({ item, index }) => (
          <PropertyCard
            listing={item}
            index={index}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          />
        )}
      />

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        areas={areas}
        listings={listings}
        onApply={next => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.md, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  searchWrap: { marginTop: spacing.md },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
});
