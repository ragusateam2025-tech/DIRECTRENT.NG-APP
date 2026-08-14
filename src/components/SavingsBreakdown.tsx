import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import { formatNaira } from '../lib/format';
import AnimatedNaira from './AnimatedNaira';
import {
  calculateSavings,
  TRADITIONAL_FEE_LABEL,
  DIRECTRENT_FEE_LABEL,
  SAVINGS_LABEL,
} from '../lib/savings';

interface SavingsBreakdownProps {
  annualRent: number;
}

/**
 * The centrepiece of the tenant story.
 *
 * Rows reveal in sequence rather than all at once, so the breakdown reads as an
 * argument being made — here is the rent, here is what agents take, here is
 * what we take — before landing on the figure that matters. The savings total
 * counts up, because that number is the product.
 */
export default function SavingsBreakdown({ annualRent }: SavingsBreakdownProps) {
  const { traditionalFees, directrentFee, savings } = calculateSavings(annualRent);

  return (
    <Animated.View
      entering={FadeIn.duration(duration.normal)}
      style={styles.card}
    >
      <LinearGradient
        colors={['rgba(212,168,83,0.10)', 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Text style={styles.title}>What you save renting directly</Text>

      <Row index={0} label="Annual Rent" value={formatNaira(annualRent)} />
      <Row index={1} label={TRADITIONAL_FEE_LABEL} value={formatNaira(traditionalFees)} muted />
      <Row index={2} label={DIRECTRENT_FEE_LABEL} value={formatNaira(directrentFee)} muted />

      <View style={styles.divider} />

      <Animated.View
        entering={FadeInDown.delay(stagger(3, 110)).duration(duration.normal).easing(easing.out)}
        style={styles.savingsRow}
      >
        <Text style={styles.savingsLabel}>{SAVINGS_LABEL}</Text>
        <AnimatedNaira value={savings} prefix="from " style={styles.savingsValue} />
      </Animated.View>

      <Text style={styles.footnote}>
        Traditional fees combine agency, legal, caution and inspection charges —
        at least 32% of annual rent, and often considerably more. We charge 2%.
      </Text>
    </Animated.View>
  );
}

function Row({
  index,
  label,
  value,
  muted,
}: {
  index: number;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(stagger(index, 110)).duration(duration.normal).easing(easing.out)}
      style={styles.row}
    >
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.md,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    paddingRight: spacing.sm,
  },
  rowLabelMuted: { color: colors.textSecondary },
  rowValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsLabel: {
    color: colors.accentGold,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
  },
  savingsValue: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  footnote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
