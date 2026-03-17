import { Timestamp } from '../types/common';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Resolve a Date | Timestamp into a native Date.
 */
function toDate(value: Date | Timestamp): Date {
  if (value instanceof Date) return value;
  return new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1_000_000));
}

/**
 * Format a date for display.
 * - 'short'    → "12 Mar 2026"
 * - 'long'     → "12 March 2026"
 * - 'relative' → "2 days ago" / "just now"
 */
export function formatDate(
  date: Date | Timestamp,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const d = toDate(date);

  if (format === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  }

  const day = d.getDate();
  const month = format === 'long' ? MONTH_NAMES_LONG[d.getMonth()] : MONTH_NAMES_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format a date range.
 * @example formatDateRange(new Date('2026-03-01'), new Date('2027-03-01')) // "Mar 2026 – Mar 2027"
 */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = MONTH_NAMES_SHORT[start.getMonth()];
  const startYear = start.getFullYear();
  const endMonth = MONTH_NAMES_SHORT[end.getMonth()];
  const endYear = end.getFullYear();
  return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
}

/**
 * Number of whole days until the given date (negative if in the past).
 */
export function getDaysUntil(date: Date): number {
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Number of whole days since the given date.
 */
export function getDaysSince(date: Date): number {
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the date is within `withinDays` days from now (default 30).
 */
export function isExpiringSoon(date: Date, withinDays: number = 30): boolean {
  const days = getDaysUntil(date);
  return days >= 0 && days <= withinDays;
}

/**
 * Add a number of days to a date and return a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Convert a native Date to a plain Firestore-compatible timestamp object.
 */
export function toFirestoreTimestamp(date: Date): { seconds: number; nanoseconds: number } {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1_000_000,
  };
}
