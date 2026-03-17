import { formatCurrency } from '../../../../packages/shared/src/utils/currency';

function normalise(value: string): string {
  return value.replace(/[\u202F\u00A0 ]/g, '');
}

describe('formatCurrency', () => {
  describe('Naira symbol', () => {
    it('starts with the ₦ symbol', () => {
      expect(formatCurrency(500000).trim()).toMatch(/^₦/);
    });

    it('never uses plain N as the currency symbol', () => {
      expect(formatCurrency(500000)).not.toMatch(/^N[^₦]/);
    });
  });

  describe('correct numeric formatting', () => {
    it('formats 500,000 as ₦500,000', () => {
      expect(normalise(formatCurrency(500000))).toBe('₦500,000');
    });

    it('formats 0 without decimal digits', () => {
      const result = formatCurrency(0);
      expect(result).not.toContain('.');
      expect(result).toContain('0');
    });

    it('formats 1,000,000 correctly', () => {
      expect(normalise(formatCurrency(1000000))).toBe('₦1,000,000');
    });

    it('formats 4,000,000 (island max rent) correctly', () => {
      expect(normalise(formatCurrency(4000000))).toBe('₦4,000,000');
    });

    it('formats 75,000 (typical agent fee) correctly', () => {
      expect(normalise(formatCurrency(75000))).toBe('₦75,000');
    });
  });

  describe('decimal handling', () => {
    it('does not show decimal places for whole numbers', () => {
      expect(formatCurrency(650000)).not.toContain('.');
    });

    it('strips decimals even for fractional input', () => {
      expect(formatCurrency(650000.99)).not.toContain('.');
    });
  });

  describe('edge cases', () => {
    it('formats ₦1 correctly', () => {
      expect(normalise(formatCurrency(1))).toBe('₦1');
    });

    it('formats ₦50,000,000 correctly', () => {
      expect(normalise(formatCurrency(50000000))).toBe('₦50,000,000');
    });

    it('returns a string type', () => {
      expect(typeof formatCurrency(100000)).toBe('string');
    });
  });

  describe('Lagos rent range fixtures', () => {
    const rentFixtures: [string, number, string][] = [
      ['mainland min', 300000, '₦300,000'],
      ['mainland typical', 700000, '₦700,000'],
      ['mainland max', 2000000, '₦2,000,000'],
      ['island min', 900000, '₦900,000'],
      ['island typical', 2000000, '₦2,000,000'],
      ['island max', 4000000, '₦4,000,000'],
    ];

    it.each(rentFixtures)(
      'formats %s (%i) as %s',
      (_label, amount, expected) => {
        expect(normalise(formatCurrency(amount))).toBe(expected);
      }
    );
  });
});
