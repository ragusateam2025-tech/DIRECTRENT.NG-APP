import { PHONE_REGEX } from '../constants/validation';

/**
 * Normalize a Nigerian phone number to +234 international format.
 * Accepts: 08012345678, 2348012345678, +2348012345678
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');

  if (cleaned.startsWith('+234')) {
    return cleaned;
  }
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Validate that a phone number is a valid Nigerian mobile number.
 */
export function isValidNigerianPhone(phone: string): boolean {
  return PHONE_REGEX.test(normalizePhone(phone));
}

/**
 * Mask a phone number for display to unverified users.
 * @example maskPhone("+2348012345678") // "+234801****678"
 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return normalized;
  return `${normalized.slice(0, 7)}****${normalized.slice(-3)}`;
}
