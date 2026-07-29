import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../theme/tokens';
import PropertyCard from '../components/PropertyCard';
import EmptyState from '../components/EmptyState';
import { PropertyCardSkeleton } from '../components/Skeleton';
import { fetchListings } from '../services/listings';
import type { Listing } from '../types';
import type { BrowseStackParams } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<BrowseStackParams, 'BrowseList'>;

export default function BrowseScreen({ navigation }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setListings(await fetchListings());
    } catch {
      setError('Could not load properties. Pull down to try again.');
    }
  }, []);

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
      <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
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

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentGold}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Rent directly in Lagos</Text>
            <Text style={styles.sub}>
              {listings.length} verified {listings.length === 1 ? 'property' : 'properties'} · no agent fees
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🏠"
            title="No properties yet"
            body="Listings will appear here once they are published. Pull down to refresh."
          />
        }
        renderItem={({ item, index }) => (
          <PropertyCard
            listing={item}
            index={index}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          />
        )}
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
