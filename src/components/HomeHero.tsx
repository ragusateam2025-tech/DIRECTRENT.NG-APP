import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import HomeBackdrop from './HomeBackdrop';

/**
 * The opening statement, and nothing else.
 *
 * An earlier version carried the whole fee argument — a dial, both percentages,
 * the reference rent. All of it already appears on every listing the moment
 * anybody opens one, and the count of verified properties sits directly below
 * this card. A hero that repeats the next three things on screen is not an
 * introduction, it is a delay.
 *
 * So: the house, and the promise. Two lines that say what we are rather than
 * what anybody else is — you deal with the person who owns the place, and the
 * money that used to disappear on the way stays with you. The arithmetic
 * behind that belongs where somebody is actually deciding, which is the
 * listing, not here.
 */
export default function HomeHero() {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(duration.normal)}
      style={styles.hero}
    >
      {/* Depth without a photograph. A warm wash from the top-left gives the
          card a light source, so it reads as an object rather than a rectangle
          with text on it. */}
      <LinearGradient
        colors={['rgba(212,168,83,0.22)', 'rgba(212,168,83,0.06)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.row}>
        <View style={styles.copy}>
          {/* Gold fill, burgundy letters. Gold cannot be used as text here —
              #D4A853 on white measures about 2.9:1, under the 3:1 floor for
              large type — so it does its shouting as a fill, which is louder
              anyway. */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RENT DIRECT</Text>
          </View>

          <Text style={styles.headline}>
            Meet the owner.{'\n'}
            <Text style={styles.headlineGold}>Keep the difference.</Text>
          </Text>
        </View>

        <Animated.View
          entering={
            reduceMotion
              ? undefined
              : FadeInDown.delay(stagger(1, 120)).duration(duration.normal).easing(easing.out)
          }
          style={styles.house}
          pointerEvents="none"
        >
          <HomeBackdrop size={110} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /**
   * The one light panel in a dark app, and deliberately so.
   *
   * Everything else is burgundy, so a white card does not need a border, a
   * shadow or a larger typeface to be the first thing seen — the inversion is
   * the emphasis.
   */
  hero: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, marginRight: spacing.sm },
  // Nudged down so the house sits on the card's floor rather than centred in
  // it — a building with air underneath reads as a model, not a home.
  house: { marginBottom: -spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGold,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.primaryDark,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
    letterSpacing: 1.4,
  },
  headline: {
    color: colors.primaryDark,
    fontFamily: typography.families.display,
    // Sized so "Keep the difference." holds on one line beside the house.
    // A display headline that wraps mid-phrase reads as an accident, and the
    // fix is the type size, not a narrower drawing.
    fontSize: typography.sizes.lg,
    // Tight, because a two-line display headline set with default leading
    // reads as two separate remarks rather than one thought.
    lineHeight: 24,
  },
  /**
   * The second line, in coral rather than gold. Gold on white is illegible at
   * any weight; coral-dark measures about 4.3:1 and is already in the palette,
   * so the two-tone headline survives without a contrast failure.
   */
  headlineGold: { color: colors.accentCoralDark },
});
