import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, spring, stagger, travel } from '../theme/motion';
import { formatNaira } from '../lib/format';
import { calculateSavings } from '../lib/savings';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing } from '../types';

interface PropertyCardProps {
  listing: Listing;
  onPress: () => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PropertyCard({ listing, onPress, index = 0 }: PropertyCardProps) {
  const image = PROPERTY_IMAGES[listing.media.photoKey];
  const { savings } = calculateSavings(listing.pricing.annualRent);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePressIn() {
    scale.value = withSpring(0.975, spring.press);
  }

  function handlePressOut() {
    scale.value = withSpring(1, spring.press);
  }

  function handlePress() {
    // Light tap: this opens a screen, it does not commit anything.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(stagger(index))
        .duration(duration.normal)
        .easing(easing.out)
        .withInitialValues({ transform: [{ translateY: travel }] })}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${listing.basicInfo.title}, ${listing.location.area}, ${formatNaira(listing.pricing.annualRent)} per year`}
        style={[styles.card, pressStyle]}
      >
        <View style={styles.imageWrap}>
          {image ? (
            <>
              <Animated.Image
                source={image}
                style={styles.image}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                entering={FadeIn.duration(duration.quick)}
              />
              {!imageLoaded && <View style={styles.imagePlaceholder} />}
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderArea}>{listing.location.area}</Text>
              <Text style={styles.placeholderType}>
                {listing.basicInfo.bedrooms} bed · {listing.basicInfo.bathrooms} bath
              </Text>
            </View>
          )}

          {/* Darkens the lower edge so the area label stays legible over any photo. */}
          <LinearGradient
            colors={['transparent', 'rgba(26,10,10,0.85)']}
            style={styles.imageScrim}
            pointerEvents="none"
          />

          <View style={styles.areaTag} pointerEvents="none">
            <Text style={styles.areaTagText}>{listing.location.area}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {listing.basicInfo.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.rent}>{formatNaira(listing.pricing.annualRent)}</Text>
            <Text style={styles.perYear}>/year</Text>
          </View>

          <View style={styles.savingsChip}>
            <Text style={styles.savingsChipText}>Save from {formatNaira(savings)}</Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
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
  imageWrap: { width: '100%', height: 190 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundElevated,
  },
  placeholder: {
    width: '100%',
    height: '100%',
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
  imageScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  areaTag: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    backgroundColor: 'rgba(26,10,10,0.6)',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  areaTagText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
  body: { padding: spacing.md },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
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
