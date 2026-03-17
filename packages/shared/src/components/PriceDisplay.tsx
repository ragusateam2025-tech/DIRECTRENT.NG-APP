import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/currency';
import { theme } from '../theme';

interface PriceBreakdown {
  rent: number;
  deposit: number;
  serviceCharge: number;
  platformFee: number;
}

interface PriceDisplayProps {
  amount: number;
  period?: 'year' | 'month' | 'total';
  showSavings?: boolean;
  savingsAmount?: number;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  breakdown?: PriceBreakdown;
}

const PERIOD_LABEL: Record<NonNullable<PriceDisplayProps['period']>, string> = {
  year: '/year',
  month: '/month',
  total: ' total',
};

const AMOUNT_FONT_SIZE: Record<NonNullable<PriceDisplayProps['size']>, number> = {
  sm: 16,
  md: 22,
  lg: 30,
};

const PRIMARY = theme.colors.primary;
const SUCCESS = '#2E7D32';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  period = 'year',
  showSavings = false,
  savingsAmount,
  size = 'md',
  showBreakdown = false,
  breakdown,
}) => {
  const amountFontSize = AMOUNT_FONT_SIZE[size];

  return (
    <View style={styles.container}>
      {/* Main amount */}
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { fontSize: amountFontSize }]}>
          {formatCurrency(amount)}
        </Text>
        <Text style={styles.period}>{PERIOD_LABEL[period]}</Text>
      </View>

      {/* Agent savings callout */}
      {showSavings && savingsAmount !== undefined && savingsAmount > 0 && (
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsText}>
            {'💰 Save '}
            {formatCurrency(savingsAmount)}
            {' vs agent'}
          </Text>
        </View>
      )}

      {/* Cost breakdown */}
      {showBreakdown && breakdown && (
        <View style={styles.breakdown}>
          <BreakdownRow label="Annual Rent" value={breakdown.rent} />
          <BreakdownRow label="Caution Deposit" value={breakdown.deposit} />
          {breakdown.serviceCharge > 0 && (
            <BreakdownRow label="Service Charge" value={breakdown.serviceCharge} />
          )}
          <BreakdownRow label="Platform Fee (2%)" value={breakdown.platformFee} />
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(amount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

interface BreakdownRowProps {
  label: string;
  value: number;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({ label, value }) => (
  <View style={styles.breakdownRow}>
    <Text style={styles.breakdownLabel}>{label}</Text>
    <Text style={styles.breakdownValue}>{formatCurrency(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    fontWeight: '800',
    color: PRIMARY,
  },
  period: {
    fontSize: 13,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    marginLeft: 2,
  },
  savingsContainer: {
    marginTop: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: SUCCESS,
  },
  breakdown: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    width: '100%',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },
});
