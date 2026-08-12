import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, spring, stagger, travel } from '../theme/motion';
import { formatNaira } from '../lib/format';
import { calculateSavings } from '../lib/savings';
import { allImageSources, primaryImageSource } from '../lib/listingImage';
import type { Listing } from '../types';

/** How long each photo holds before the next one fades in. */
const HOLD_MS = 3600;
/** The cross-fade itself. Slow enough to read as a dissolve, not a flicker. */
const FADE_MS = 700;

interface PropertyCardProps {
  listing: Listing;
  onPress: () => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PropertyCard({ listing, onPress, index = 0 }: PropertyCardProps) {
  const image = primaryImageSource(listing);
  const photos = allImageSources(listing);
  const { savings } = calculateSavings(listing.pricing.annualRent);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  /**
   * Cycles a listing's photos on the card itself.
   *
   * Owners upload up to ten photos and Browse showed one, so a property with a
   * fine interior and a dull frontage lost on the frontage alone. Cycling gives
   * every listing its best shot at being the one someone taps.
   *
   * A cross-fade rather than a horizontal slide. Several cards animate at once
   * on a list, and a dissolve is two layers and an opacity — a slide is layout
   * work per frame per card, which is where a mid-range Android starts dropping
   * frames. It also leaves horizontal gestures free, so a slide never competes
   * with the scroll the finger is already doing.
   */
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const cycling = photos.length > 1 && isFocused && !reduceMotion;

  const [frame, setFrame] = useState({ previous: 0, current: 0 });
  const fade = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  useEffect(() => {
    if (!cycling) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    // Offset by position so a screenful of cards does not flip in unison —
    // that reads as a glitch, and it bunches the work into one frame.
    const start = setTimeout(
      () => {
        interval = setInterval(() => {
          setFrame(f => ({ previous: f.current, current: (f.current + 1) % photos.length }));
        }, HOLD_MS);
      },
      (index % 4) * 500,
    );

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [cycling, photos.length, index]);

  useEffect(() => {
    if (frame.current === frame.previous) return;
    fade.value = 0;
    fade.value = withTiming(1, { duration: FADE_MS });
  }, [frame, fade]);

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
              {/* The outgoing photo, held underneath so the fade dissolves
                  between two pictures rather than through the background. */}
              {frame.previous !== frame.current && (
                <Animated.Image
                  source={photos[frame.previous] ?? image}
                  style={[styles.image, styles.imageLayer]}
                  resizeMode="cover"
                />
              )}
              <Animated.Image
                source={photos[frame.current] ?? image}
                style={[
                  styles.image,
                  styles.imageLayer,
                  frame.previous !== frame.current && fadeStyle,
                ]}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                entering={FadeIn.duration(duration.quick)}
              />
              {!imageLoaded && <View style={styles.imagePlaceholder} />}

              {/* Dots, so a still card still says "there are more photos".
                  Without them a card that has not started cycling yet looks
                  identical to one with a single photo. */}
              {photos.length > 1 && (
                <View style={styles.dots} pointerEvents="none">
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === frame.current && styles.dotOn]}
                    />
                  ))}
                </View>
              )}
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
  imageWrap: { width: '100%', height: 190, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  // The cross-fade stacks two photos in the same space. In normal flow the
  // second one lays out *below* the first and shows through the bottom of the
  // card, which is what "it cuts in the middle" was.
  imageLayer: { ...StyleSheet.absoluteFillObject },
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
  // Bottom right, opposite the area tag, so the two never collide on a narrow
  // screen.
  dots: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotOn: { backgroundColor: colors.accentGold },
  areaTag: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    backgroundColor: 'rgba(26,10,10,0.6)',
    borderRadius: radius.control,
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
    borderRadius: radius.control,
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
