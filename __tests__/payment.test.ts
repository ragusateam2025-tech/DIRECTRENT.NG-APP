import { calculatePayment, toKobo } from '../src/lib/payment';
import { calculateSavings } from '../src/lib/savings';
import type { Listing } from '../src/types';

function listing(pricing: Partial<Listing['pricing']> = {}): Listing {
  return {
    id: 'l1',
    ownerId: 'demo',
    basicInfo: {
      title: 'Two bedroom flat',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: {
      address: '1 Somewhere Street',
      area: 'Yaba',
      lga: 'Lagos Mainland',
      marketId: 'lagos',
      state: 'Lagos',
    },
    media: {},
    pricing: {
      annualRent: 1000000,
      cautionDepositMonths: 12,
      serviceCharge: 0,
      ...pricing,
    },
    details: { description: 'x', amenities: [], maxOccupants: 4 },
    status: { listing: 'active' },
  };
}

describe('calculatePayment', () => {
  it('charges the platform fee at 2% of annual rent', () => {
    // The number the whole pitch rests on: ₦20,000 on ₦1,000,000, against the
    // ~₦320,000 a tenant would pay through the traditional chain.
    expect(calculatePayment(listing()).platformFee).toBe(20000);
  });

  it('treats twelve months of caution as one year of rent', () => {
    expect(calculatePayment(listing()).cautionDeposit).toBe(1000000);
  });

  it('scales the caution deposit by months', () => {
    expect(calculatePayment(listing({ cautionDepositMonths: 6 })).cautionDeposit).toBe(500000);
    expect(calculatePayment(listing({ cautionDepositMonths: 2 })).cautionDeposit).toBe(166667);
  });

  it('handles no caution deposit at all', () => {
    expect(calculatePayment(listing({ cautionDepositMonths: 0 })).cautionDeposit).toBe(0);
  });

  it('adds the service charge without touching the fee', () => {
    const payment = calculatePayment(listing({ serviceCharge: 50000 }));
    expect(payment.serviceCharge).toBe(50000);
    // The fee is a percentage of rent, not of the total. Charging 2% of the
    // service charge too would be the sort of quiet padding we exist to oppose.
    expect(payment.platformFee).toBe(20000);
  });

  it('totals every line', () => {
    const payment = calculatePayment(listing({ serviceCharge: 50000 }));
    expect(payment.total).toBe(
      payment.annualRent + payment.cautionDeposit + payment.serviceCharge + payment.platformFee,
    );
    expect(payment.total).toBe(2070000);
  });

  it('never returns a fractional naira', () => {
    const payment = calculatePayment(listing({ annualRent: 999999, cautionDepositMonths: 7 }));
    for (const value of Object.values(payment)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('agrees with the savings figure shown on the listing', () => {
    // Both derive from the same 2%. If these ever disagree, one screen is
    // promising a saving the checkout does not honour.
    const { directrentFee } = calculateSavings(1000000);
    expect(calculatePayment(listing()).platformFee).toBe(directrentFee);
  });

  it('charges the owner nothing', () => {
    // There is no owner-side line, and adding one would be a pricing decision
    // rather than a code change. This test is here to make that deliberate.
    const payment = calculatePayment(listing());
    expect(Object.keys(payment).sort()).toEqual(
      ['annualRent', 'cautionDeposit', 'platformFee', 'serviceCharge', 'total'].sort(),
    );
  });
});

describe('toKobo', () => {
  it('multiplies by one hundred', () => {
    expect(toKobo(20000)).toBe(2000000);
  });

  it('returns whole kobo', () => {
    expect(Number.isInteger(toKobo(166666.67))).toBe(true);
  });

  it('handles zero', () => {
    expect(toKobo(0)).toBe(0);
  });
});
