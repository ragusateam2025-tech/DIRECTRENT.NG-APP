import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import { duration, easing, stagger } from '../../theme/motion';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { PropertyCardSkeleton } from '../../components/Skeleton';
import { formatNaira } from '../../lib/format';
import { primaryImageSource } from '../../lib/listingImage';
import { fetchMyListings } from '../../services/landlord';
import { useAuth } from '../../context/AuthContext';
import type { LandlordListing, ListingStatus } from '../../types';

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Draft',
  pending: 'Under review',
  active: 'Live',
  rented: 'Rented',
};

const STATUS_COLOUR: Record<ListingStatus, string> = {
  draft: colors.textMuted,
  pending: colors.warning,
  active: colors.success,
  rented: colors.textSecondary,
};

/** Drafts first — they are the ones needing the owner's attention. */
const STATUS_ORDER: Record<ListingStatus, number> = {
  draft: 0,
  pending: 1,
  active: 2,
  rented: 3,
};

export default function MyPropertiesScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [listings, setListings] = useState<LandlordListing[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!profile) {
          setLoading(false);
          return;
        }
        try {
          const mine = await fetchMyListings(profile.uid);
          if (!active) return;
          setListings(
            mine.sort(
              (a, b) => STATUS_ORDER[a.status.listing] - STATUS_ORDER[b.status.listing],
            ),
          );
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

  function startNew() {
    navigation.navigate('AddProperty', {});
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
        <View style={styles.list}>
          <Text style={styles.heading}>Your properties</Text>
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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Your properties</Text>
            <Text style={styles.sub}>
              {listings.length === 0
                ? 'Nothing listed yet'
                : `${listings.length} ${listings.length === 1 ? 'property' : 'properties'}`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            variant="empty"
            title="List your first property"
            body="Add photos, set your rent, and reach tenants directly — no agent in the middle."
          />
        }
        renderItem={({ item, index }) => (
          <LandlordListingRow
            listing={item}
            index={index}
            onPress={() =>
              item.status.listing === 'draft'
                ? navigation.navigate('AddProperty', { draftId: item.id })
                : navigation.navigate('LandlordListingDetail', { listingId: item.id })
            }
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button label="Add a property" onPress={startNew} feedback="medium" />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function LandlordListingRow({
  listing,
  index,
  onPress,
}: {
  listing: LandlordListing;
  index: number;
  onPress: () => void;
}) {
  const image = primaryImageSource(listing);
  const status = listing.status.listing;

  return (
    <Animated.View
      entering={FadeInDown.delay(stagger(index)).duration(duration.normal).easing(easing.out)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${listing.basicInfo?.title || 'Untitled draft'}, ${STATUS_LABEL[status]}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.thumb}>
          {image ? (
            <Animated.Image source={image} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbEmpty}>
              <Text style={styles.thumbEmptyText}>No photos</Text>
            </View>
          )}
        </View>

        <View style={styles.rowBody}>
          <View style={[styles.badge, { borderColor: STATUS_COLOUR[status] }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOUR[status] }]}>
              {STATUS_LABEL[status]}
            </Text>
          </View>

          <Text style={styles.rowTitle} numberOfLines={2}>
            {listing.basicInfo?.title || 'Untitled draft'}
          </Text>

          <Text style={styles.rowMeta}>
            {listing.pricing?.annualRent
              ? `${formatNaira(listing.pricing.annualRent)}/year`
              : 'Rent not set'}
            {listing.media?.photos?.length
              ? ` · ${listing.media.photos.length} photos`
              : ''}
          </Text>

          {status === 'draft' && <Text style={styles.continue}>Continue →</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
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
  row: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  rowPressed: { opacity: 0.85 },
  thumb: { width: 110, height: 130 },
  thumbImage: { width: '100%', height: '100%' },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmptyText: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  rowBody: { flex: 1, padding: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
  },
  rowMeta: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  continue: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  footer: { marginTop: spacing.md, marginBottom: spacing.lg },
});
