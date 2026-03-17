import {
  normalizePhone,
  isValidNigerianPhone,
  maskPhone,
} from '../../../../packages/shared/src/utils/phone';

describe('normalizePhone', () => {
  describe('already in +234 format', () => {
    it('returns +234 number unchanged', () => {
      expect(normalizePhone('+2348012345678')).toBe('+2348012345678');
    });

    it('strips spaces from +234 format', () => {
      expect(normalizePhone('+234 801 234 5678')).toBe('+2348012345678');
    });

    it('strips hyphens from +234 format', () => {
      expect(normalizePhone('+234-801-234-5678')).toBe('+2348012345678');
    });
  });

  describe('234 prefix (no +)', () => {
    it('prepends + to 234-prefixed numbers', () => {
      expect(normalizePhone('2348012345678')).toBe('+2348012345678');
    });
  });

  describe('0 prefix (local format)', () => {
    it('converts 08012345678 to +2348012345678', () => {
      expect(normalizePhone('08012345678')).toBe('+2348012345678');
    });

    it('converts 07012345678 to +2347012345678', () => {
      expect(normalizePhone('07012345678')).toBe('+2347012345678');
    });

    it('converts 09012345678 to +2349012345678', () => {
      expect(normalizePhone('09012345678')).toBe('+2349012345678');
    });
  });
});

describe('isValidNigerianPhone', () => {
  describe('valid Nigerian mobile numbers', () => {
    const valid = [
      '+2348012345678',
      '+2347012345678',
      '+2349012345678',
      '+2348112345678',
      '08012345678',
      '07012345678',
      '09012345678',
      '2348012345678',
    ];

    it.each(valid)('accepts %s', (phone) => {
      expect(isValidNigerianPhone(phone)).toBe(true);
    });
  });

  describe('invalid numbers', () => {
    const invalid = [
      '080123456',
      '0801234567890',
      '+447911123456',
      'abcdefghijk',
      '',
      '+234',
    ];

    it.each(invalid)('rejects %s', (phone) => {
      expect(isValidNigerianPhone(phone)).toBe(false);
    });
  });
});

describe('maskPhone', () => {
  it('masks digits in the middle of a +234 number', () => {
    const masked = maskPhone('+2348012345678');
    expect(masked).toBe('+234801****678');
  });

  it('returns the input if shorter than 10 characters', () => {
    expect(maskPhone('123')).toBe('123');
  });

  it('does not expose the full number', () => {
    const masked = maskPhone('+2348012345678');
    expect(masked).not.toContain('2345');
  });
});
