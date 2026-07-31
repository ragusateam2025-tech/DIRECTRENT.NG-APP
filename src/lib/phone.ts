// Nigerian phone numbers.
//
// Regex, accepted forms and error copy are taken verbatim from
// DIRECTRENT_MOBILE_HANDOFF.md §7.1 so the app and the website reject exactly
// the same numbers. Do not "improve" this pattern in isolation — the website
// would then accept numbers the app refuses.

const NIGERIAN_PHONE = /^(\+234|234|0)[789][01]\d{8}$/;

export const PHONE_ERROR = 'Please enter a valid Nigerian phone number';

/** Whitespace and dashes are stripped first — people paste numbers formatted. */
export function isValidNigerianPhone(input: string): boolean {
  return NIGERIAN_PHONE.test(input.replace(/[\s-]/g, ''));
}

/**
 * Normalises to +234XXXXXXXXXX, the single stored form.
 *
 * Storing one form matters more than it looks: 08012345678 and +2348012345678
 * are the same person, and without normalisation they would be two records
 * that never match.
 */
export function normaliseNigerianPhone(input: string): string {
  const cleaned = input.replace(/[\s-]/g, '');

  if (cleaned.startsWith('+234')) return cleaned;
  if (cleaned.startsWith('234')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;

  return cleaned;
}

/** Groups a stored number for display: +234 801 234 5678. */
export function formatNigerianPhone(stored: string): string {
  if (!stored.startsWith('+234') || stored.length !== 14) return stored;
  return `+234 ${stored.slice(4, 7)} ${stored.slice(7, 10)} ${stored.slice(10)}`;
}
