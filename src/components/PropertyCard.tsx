import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { formatNaira } from '../lib/format';
import { calculateSavings } from '../lib/savings';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing } from '../types';

interface PropertyCardProps {
  listing: Listing;
  onPress: () => void;
}

export default function PropertyCard({ listing, onPress }: PropertyCardProps) {
  const image = PROPERTY_IMAGES[listing.media.photoKey];
  const { savings } = calculateSavings(listing.pricing.annualRent);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listing.basicInfo.title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {image ? (
        <Image source={image} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderArea}>{listing.location.area}</Text>
          <Text style={styles.placeholderType}>
            {listing.basicInfo.bedrooms} bed · {listing.basicInfo.bathrooms} bath
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.basicInfo.title}
        </Text>
        <Text style={styles.area}>{listing.location.area}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.rent}>{formatNaira(listing.pricing.annualRent)}</Text>
          <Text style={styles.perYear}>/year</Text>
        </View>

        <View style={styles.savingsChip}>
          <Text style={styles.savingsChipText}>Save from {formatNaira(savings)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 180 },
  placeholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderArea: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  placeholderType: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  body: { padding: spacing.md },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
  },
  area: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  rent: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  perYear: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
  },
  savingsChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successDark,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  savingsChipText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
});
