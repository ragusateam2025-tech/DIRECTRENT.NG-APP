// Currency formatting. The ₦ below is the literal Unicode naira sign (U+20A6).
// Never replace it with an escape sequence — see CLAUDE.md §3.

/**
 * Formats a naira amount for display: rounded to whole naira, comma-separated,
 * prefixed with the literal ₦ sign.
 *
 * Comma grouping is done with a regex rather than toLocaleString so the output
 * is identical across the JS engines this runs on (Hermes on device, Node in
 * tests). toLocaleString silently drops separators when locale data is absent.
 */
export function formatNaira(amount: number): string {
  const whole = Math.round(amount);
  const separated = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₦${separated}`;
}
