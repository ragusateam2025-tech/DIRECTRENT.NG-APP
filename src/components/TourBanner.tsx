import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration } from '../theme/motion';
import { IconTour360 } from './icons/Icon';

/**
 * Announces 360 tours before they exist.
 *
 * Deliberately not a button. A disabled control invites a tap and then refuses
 * it, which reads as a broken app rather than a promise — so this is a
 * statement, marked up as text for screen readers instead of as a control.
 *
 * The pill is gold rather than coral. Coral is reserved for things a tenant can
 * act on, and borrowing it here would make the one colour that means "do this"
 * mean "wait" as well.
 */
export default function TourBanner() {
  return (
    <Animated.View
      entering={FadeIn.duration(duration.normal)}
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel="360 degree tour, coming soon. Look around every room from your phone."
    >
      <View style={styles.icon}>
        <IconTour360 size={26} color={colors.accentGold} />
      </View>

      <View style={styles.copy}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>360° tour</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Coming soon</Text>
          </View>
        </View>

        <Text style={styles.body}>
          Look around every room from your phone before you spend a day and a
          transport fare crossing the city to find out it was misrepresented.
        </Text>
      </View>
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
    borderRadius: radius.sm,
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
