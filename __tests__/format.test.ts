import { formatNaira } from '../src/lib/format';

describe('formatNaira', () => {
  it('formats a million with the literal naira sign and commas', () => {
    expect(formatNaira(1000000)).toBe('₦1,000,000');
  });

  it('formats the headline savings figure', () => {
    expect(formatNaira(300000)).toBe('₦300,000');
  });

  it('formats small amounts without commas', () => {
    expect(formatNaira(500)).toBe('₦500');
  });

  it('formats zero', () => {
    expect(formatNaira(0)).toBe('₦0');
  });

  it('rounds fractional kobo to whole naira', () => {
    expect(formatNaira(1234.56)).toBe('₦1,235');
  });

  it('uses the literal naira character, never an escape sequence', () => {
    expect(formatNaira(1000)).toContain('₦');
    expect(formatNaira(1000)).not.toContain('\\u20A6');
    expect(formatNaira(1000)).not.toContain('&#x20A6;');
  });
});
