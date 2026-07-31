import {
  isValidNigerianPhone,
  normaliseNigerianPhone,
  formatNigerianPhone,
} from '../src/lib/phone';

/**
 * The regex and the accepted forms come from DIRECTRENT_MOBILE_HANDOFF.md §7.1
 * and must match the website exactly. A number the website accepts and the app
 * rejects is a user who cannot finish signing up.
 */
describe('Nigerian phone numbers', () => {
  describe('validation', () => {
    it.each([
      ['08012345678', 'local 0-prefixed'],
      ['+2348012345678', 'international'],
      ['2348012345678', 'country code, no plus'],
      ['08112345678', '081 prefix'],
      ['09012345678', '090 prefix'],
      ['07031234567', '070 prefix'],
    ])('accepts %s (%s)', input => {
      expect(isValidNigerianPhone(input)).toBe(true);
    });

    it('accepts numbers typed with spaces or dashes', () => {
      expect(isValidNigerianPhone('0703 123 4567')).toBe(true);
      expect(isValidNigerianPhone('0703-123-4567')).toBe(true);
    });

    it.each([
      ['0601234567', 'invalid network prefix'],
      ['08012345', 'too short'],
      ['080123456789', 'too long'],
      ['+1234567890', 'not Nigerian'],
      ['0801234567a', 'contains a letter'],
      ['', 'empty'],
    ])('rejects %s (%s)', input => {
      expect(isValidNigerianPhone(input)).toBe(false);
    });
  });

  describe('normalisation', () => {
    it('collapses every accepted form to one stored value', () => {
      // The point of normalising: these are one person, not three records.
      const stored = '+2348012345678';

      expect(normaliseNigerianPhone('08012345678')).toBe(stored);
      expect(normaliseNigerianPhone('+2348012345678')).toBe(stored);
      expect(normaliseNigerianPhone('2348012345678')).toBe(stored);
      expect(normaliseNigerianPhone('0801 234 5678')).toBe(stored);
    });

    it('is idempotent — normalising twice changes nothing', () => {
      const once = normaliseNigerianPhone('08012345678');
      expect(normaliseNigerianPhone(once)).toBe(once);
    });
  });

  describe('display', () => {
    it('groups a stored number for reading', () => {
      expect(formatNigerianPhone('+2348012345678')).toBe('+234 801 234 5678');
    });

    it('leaves anything unexpected untouched rather than mangling it', () => {
      expect(formatNigerianPhone('08012345678')).toBe('08012345678');
      expect(formatNigerianPhone('')).toBe('');
    });
  });
});
