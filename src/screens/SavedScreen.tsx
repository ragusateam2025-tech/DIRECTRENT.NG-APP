import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme/tokens';
import PropertyCard from '../components/PropertyCard';
import EmptyState from '../components/EmptyState';
import { fetchListings } from '../services/listings';
import { fetchSavedIds } from '../services/saved';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types';

export default function SavedScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload on focus so a property saved on the detail screen shows up here
  // immediately, without needing a manual refresh.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!profile) {
          setLoading(false);
          return;
        }

        try {
          const [all, savedIds] = await Promise.all([
            fetchListings(),
            fetchSavedIds(profile.uid),
          ]);
          if (!active) return;
          setListings(all.filter(l => savedIds.includes(l.id)));
        } catch {
          if (active) setListings([]);
        }

        if (active) setLoading(false);
      }

      load();
      return () => {
        active = false;
      };
    }, [profile]),
  );

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="♥"
            title="Nothing saved yet"
            body="Tap the save button on any property and it will appear here."
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            listing={item}
            onPress={() =>
              navigation.navigate('Browse', {
                screen: 'ListingDetail',
                params: { listingId: item.id },
              })
            }
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
});
