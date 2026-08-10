import { buildShareMessage } from '../src/lib/shareListing';
import type { Listing } from '../src/types';

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    ownerId: 'demo',
    basicInfo: {
      title: 'Two bedroom flat, quiet Surulere street',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: {
      address: '14 Shitta Street, Surulere',
      area: 'Surulere',
      lga: 'Surulere',
      marketId: 'lagos',
      state: 'Lagos',
    },
    media: { photoKey: 'property-4' },
    pricing: { annualRent: 1000000, cautionDepositMonths: 12, serviceCharge: 0 },
    details: { description: 'x', amenities: [], maxOccupants: 4 },
    status: { listing: 'active' },
    ...over,
  };
}

describe('buildShareMessage', () => {
  it('leads with the property, where it is, and what it costs', () => {
    const message = buildShareMessage(listing());

    expect(message).toContain('Two bedroom flat, quiet Surulere street');
    expect(message).toContain('Surulere · 2 bed · 2 bath');
    expect(message).toContain('/year');
  });

  it('uses a literal naira sign, never an escape', () => {
    // CLAUDE.md §3: ₦ renders incorrectly on some devices.
    const message = buildShareMessage(listing());

    expect(message).toContain('₦');
    expect(message).not.toContain('\\u20A6');
    expect(message).not.toContain('&#x20A6;');
  });

  it('states the saving as a floor, not a ceiling', () => {
    // "up to" understates the problem: 32% is the research-backed floor and
    // real fees reach 65% of annual rent.
    const message = buildShareMessage(listing());

    expect(message).toContain('Save from');
    expect(message).not.toContain('up to');
  });

  it('quotes ₦300,000 on a ₦1,000,000 rent', () => {
    // The number the whole pitch rests on. 32% traditional less our 2%.
    const message = buildShareMessage(listing());
    expect(message).toContain('₦300,000');
  });

  it('scales the saving with the rent', () => {
    const message = buildShareMessage(
      listing({ pricing: { annualRent: 2000000, cautionDepositMonths: 12, serviceCharge: 0 } }),
    );
    expect(message).toContain('₦600,000');
  });

  it('never labels the traditional charges as an agent fee', () => {
    // The rule is about the *label on the 32%*, not the phrase. The composite
    // is agency (~10%), legal (~10%), caution (~7%) and misc (~5%), so calling
    // that figure an agent fee is inaccurate — but the brand voice does say
    // "agent fees" when describing what a renter pays today
    // (DIRECTRENT_MOBILE_HANDOFF.md §2). What must never appear is the number
    // attributed to agents alone.
    const message = buildShareMessage(listing());

    expect(message).not.toContain('32%');
    expect(message.toLowerCase()).not.toContain('agent fee (32');
    // The saving is attributed to the charges as a whole, not to one party.
    expect(message).toContain('against the usual charges');
  });

  it('carries none of the forbidden words', () => {
    const message = buildShareMessage(listing()).toLowerCase();

    for (const word of ['mba', 'capstone', 'rome business school', 'academic', 'school project']) {
      expect(message).not.toContain(word);
    }
  });

  it('says whether the owner lives there when the listing knows', () => {
    expect(buildShareMessage(listing({ ownerOccupied: true }))).toContain(
      'The owner lives on the property.',
    );
    expect(buildShareMessage(listing({ ownerOccupied: false }))).toContain(
      'The owner does not live on the property.',
    );
  });

  it('stays silent about occupancy when the listing never answered', () => {
    // Silence is not a denial, and a forwarded message cannot be corrected.
    const message = buildShareMessage(listing());
    expect(message).not.toContain('owner lives on');
    expect(message).not.toContain('does not live on');
  });

  it('ends with somewhere to go', () => {
    // The reader has no idea what Directrent is.
    expect(buildShareMessage(listing()).trim().endsWith('directrent.ng')).toBe(true);
  });

  it('reads as plain lines, with no markup a chat app would show raw', () => {
    const message = buildShareMessage(listing());

    expect(message).not.toContain('**');
    expect(message).not.toContain('<');
  });
});
