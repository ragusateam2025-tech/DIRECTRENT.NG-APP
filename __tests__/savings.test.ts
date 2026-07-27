import {
  calculateSavings,
  TRADITIONAL_FEE_RATE,
  DIRECTRENT_FEE_RATE,
  TRADITIONAL_FEE_LABEL,
  DIRECTRENT_FEE_LABEL,
  SAVINGS_LABEL,
} from '../src/lib/savings';

describe('calculateSavings', () => {
  it('produces the headline figures at ₦1,000,000 annual rent', () => {
    const result = calculateSavings(1000000);
    expect(result.annualRent).toBe(1000000);
    expect(result.traditionalFees).toBe(320000);
    expect(result.directrentFee).toBe(20000);
    expect(result.savings).toBe(300000);
  });

  it('scales linearly with rent', () => {
    const result = calculateSavings(2000000);
    expect(result.traditionalFees).toBe(640000);
    expect(result.directrentFee).toBe(40000);
    expect(result.savings).toBe(600000);
  });

  it('handles rent below a million', () => {
    const result = calculateSavings(450000);
    expect(result.traditionalFees).toBe(144000);
    expect(result.directrentFee).toBe(9000);
    expect(result.savings).toBe(135000);
  });

  it('always makes savings equal traditional fees minus our fee', () => {
    for (const rent of [350000, 800000, 1000000, 1750000, 5000000]) {
      const r = calculateSavings(rent);
      expect(r.savings).toBe(r.traditionalFees - r.directrentFee);
    }
  });

  it('returns whole naira, never fractions', () => {
    const result = calculateSavings(333333);
    expect(Number.isInteger(result.traditionalFees)).toBe(true);
    expect(Number.isInteger(result.directrentFee)).toBe(true);
    expect(Number.isInteger(result.savings)).toBe(true);
  });

  it('treats zero rent as zero everything', () => {
    const result = calculateSavings(0);
    expect(result.traditionalFees).toBe(0);
    expect(result.savings).toBe(0);
  });
});

describe('fee constants', () => {
  it('uses the rates from the handoff document', () => {
    expect(TRADITIONAL_FEE_RATE).toBe(0.32);
    expect(DIRECTRENT_FEE_RATE).toBe(0.02);
  });

  it('labels traditional fees as a composite, never as an agent fee', () => {
    expect(TRADITIONAL_FEE_LABEL).toBe('Traditional Fees (Agent + Legal + Misc)');
    expect(TRADITIONAL_FEE_LABEL).not.toContain('Agent Fee');
  });

  it('labels our fee and the savings row correctly', () => {
    expect(DIRECTRENT_FEE_LABEL).toBe('Directrent.ng Fee (2%)');
    expect(SAVINGS_LABEL).toBe('Your Savings');
  });
});
