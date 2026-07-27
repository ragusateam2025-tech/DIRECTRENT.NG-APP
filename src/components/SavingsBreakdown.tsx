import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { formatNaira } from '../lib/format';
import {
  calculateSavings,
  TRADITIONAL_FEE_LABEL,
  DIRECTRENT_FEE_LABEL,
  SAVINGS_LABEL,
} from '../lib/savings';

interface SavingsBreakdownProps {
  annualRent: number;
}

export default function SavingsBreakdown({ annualRent }: SavingsBreakdownProps) {
  const { traditionalFees, directrentFee, savings } = calculateSavings(annualRent);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>What you save renting directly</Text>

      <Row label="Annual Rent" value={formatNaira(annualRent)} />
      <Row label={TRADITIONAL_FEE_LABEL} value={formatNaira(traditionalFees)} muted />
      <Row label={DIRECTRENT_FEE_LABEL} value={formatNaira(directrentFee)} muted />

      <View style={styles.divider} />

      <View style={styles.savingsRow}>
        <Text style={styles.savingsLabel}>{SAVINGS_LABEL}</Text>
        <Text style={styles.savingsValue}>{formatNaira(savings)}</Text>
      </View>

      <Text style={styles.footnote}>
        Traditional fees combine agency, legal, caution and inspection charges —
        typically 32% of annual rent. We charge 2%.
      </Text>
    </View>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
