/**
 * Nigerian Naira currency formatter.
 * Amount is in Naira (not kobo).
 */
export function formatCurrency(amountNaira: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountNaira);
}

/** Add n calendar days to a Date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Add n calendar years to a Date */
export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/** Cryptographically-random alphanumeric string of given length */
import { randomBytes } from 'crypto';
export function randomString(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
}
