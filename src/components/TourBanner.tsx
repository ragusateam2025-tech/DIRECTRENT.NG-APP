import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration } from '../theme/motion';
import { IconTour360 } from './icons/Icon';
import type { ListingTour } from '../types';

interface TourBannerProps {
  /** Absent means no tour exists for this property. */
  tour?: ListingTour | null;
  onOpen?: () => void;
}

/**
 * The 360 tour, or the promise of one.
 *
 * Two states, and the difference between them is whether it is a control at
 * all. With a tour it is a button. Without one it stays plain text, because a
 * disabled control invites a tap and then refuses it, which reads as a broken
 * app rather than as a promise.
 *
 * The pill is gold in both states. Coral is reserved for the thing a tenant is
 * meant to do on this screen — enquire — and spending it here would make the
 * one colour that means "do this" compete with itself.
 */
export default function TourBanner({ tour, onOpen }: TourBannerProps) {
  const available = !!tour?.embedUrl && !!onOpen;

  const content = (
    <>
      <View style={styles.icon}>
        <IconTour360 size={26} color={colors.accentGold} />
      </View>

      <View style={styles.copy}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>360° tour</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{available ? 'Available' : 'Coming soon'}</Text>
          </View>
        </View>

        <Text style={styles.body}>
          {available
            ? 'Walk through every room from where you are sitting. Uses more data than the photos.'
            : 'Look around every room from your phone before you spend a day and a transport fare crossing the city to find out it was misrepresented.'}
        </Text>
      </View>
    </>
  );

  if (!available) {
    return (
      <Animated.View
        entering={FadeIn.duration(duration.normal)}
        style={styles.card}
        accessibilityRole="text"
        accessibilityLabel="360 degree tour, coming soon. Look around every room from your phone."
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Open the 360 degree tour of this property"
        accessibilityHint="Uses more mobile data than the photographs"
        style={({ pressed }) => [styles.card, styles.cardActive, pressed && styles.cardPressed]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  // A gold edge marks the card as something to act on without spending coral,
  // which belongs to the enquiry button further down the screen.
  cardActive: { borderColor: colors.borderGold },
  cardPressed: { opacity: 0.85 },
  icon: { marginRight: spacing.md, marginTop: 2 },
  copy: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
    marginRight: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  pillText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
});
