const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a number as Nigerian Naira.
 * @example formatCurrency(500000) // "₦500,000"
 */
export function formatCurrency(amount: number): string {
  return nairaFormatter.format(amount);
}
