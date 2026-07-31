import {
  applyFilters,
  filterListings,
  sortListings,
  availableAreas,
  hasActiveFilters,
  activeFilterCount,
  EMPTY_FILTERS,
  priceBands,
  type Filters,
} from '../src/lib/listingFilter';
import type { Listing } from '../src/types';

function listing(over: {
  id: string;
  title?: string;
  area?: string;
  address?: string;
  bedrooms?: number;
  rent: number;
}): Listing {
  return {
    id: over.id,
    ownerId: 'demo',
    basicInfo: {
      title: over.title ?? 'A property',
      propertyType: 'two_bedroom',
      bedrooms: over.bedrooms ?? 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: {
      address: over.address ?? '1 Some Street',
      area: over.area ?? 'Yaba',
      lga: 'Lagos Mainland',
    },
    media: { photoKey: 'property-1' },
    pricing: { annualRent: over.rent, cautionDepositMonths: 12, serviceCharge: 0 },
    details: { description: 'x', amenities: [], maxOccupants: 4 },
    status: { listing: 'active' },
  };
}

const DATA: Listing[] = [
  listing({ id: 'a', title: 'Bright self-contained near Yaba College', area: 'Yaba', bedrooms: 1, rent: 450000 }),
  listing({ id: 'b', title: 'Mini flat with balcony, Sabo', area: 'Yaba', bedrooms: 1, rent: 750000 }),
  listing({ id: 'c', title: 'One bedroom off Adeniran', area: 'Surulere', bedrooms: 1, rent: 900000 }),
  listing({ id: 'd', title: 'Two bedroom flat, quiet street', area: 'Surulere', bedrooms: 2, rent: 1000000 }),
  listing({ id: 'e', title: 'Two bedroom, Herbert Macaulay', area: 'Yaba', bedrooms: 2, rent: 1400000 }),
  listing({ id: 'f', title: 'Three bedroom family flat', area: 'Surulere', bedrooms: 3, rent: 1800000 }),
];

function withFilters(over: Partial<Filters>): Filters {
  return { ...EMPTY_FILTERS, ...over };
}

describe('filterListings', () => {
  it('returns everything when no filter is set', () => {
    expect(filterListings(DATA, EMPTY_FILTERS)).toHaveLength(6);
  });

  it('matches a query against the area', () => {
    const result = filterListings(DATA, withFilters({ query: 'surulere' }));
    expect(result.map(l => l.id)).toEqual(['c', 'd', 'f']);
  });

  it('matches a query against the title', () => {
    const result = filterListings(DATA, withFilters({ query: 'balcony' }));
    expect(result.map(l => l.id)).toEqual(['b']);
  });

  it('is case insensitive', () => {
    expect(filterListings(DATA, withFilters({ query: 'YABA' })).length).toBe(3);
  });

  it('requires every word to match, so extra words narrow', () => {
    const oneWord = filterListings(DATA, withFilters({ query: 'yaba' }));
    const twoWords = filterListings(DATA, withFilters({ query: 'yaba balcony' }));
    expect(oneWord.length).toBeGreaterThan(twoWords.length);
    expect(twoWords.map(l => l.id)).toEqual(['b']);
  });

  it('ignores surrounding whitespace', () => {
    expect(filterListings(DATA, withFilters({ query: '   ' }))).toHaveLength(6);
  });

  it('filters by a single area', () => {
    expect(filterListings(DATA, withFilters({ areas: ['Yaba'] })).map(l => l.id)).toEqual([
      'a',
      'b',
      'e',
    ]);
  });

  it('filters by several areas at once', () => {
    expect(filterListings(DATA, withFilters({ areas: ['Yaba', 'Surulere'] }))).toHaveLength(6);
  });

  it('treats a bedroom filter as "at least"', () => {
    const result = filterListings(DATA, withFilters({ bedrooms: 2 }));
    expect(result.map(l => l.id)).toEqual(['d', 'e', 'f']);
  });

  it('filters by price band, upper bound exclusive', () => {
    const result = filterListings(DATA, withFilters({ priceBand: '500000_1000000' }));
    // 750,000 and 900,000 qualify; 1,000,000 belongs to the next band up.
    expect(result.map(l => l.id)).toEqual(['b', 'c']);
  });

  it('puts a boundary rent in exactly one band', () => {
    const lower = filterListings(DATA, withFilters({ priceBand: '500000_1000000' })).map(l => l.id);
    const upper = filterListings(DATA, withFilters({ priceBand: '1000000_2000000' })).map(l => l.id);
    expect(lower).not.toContain('d');
    expect(upper).toContain('d');
  });

  it('handles the open-ended top band', () => {
    expect(filterListings(DATA, withFilters({ priceBand: 'over_2000000' }))).toHaveLength(0);
  });

  it('combines filters, requiring all to hold', () => {
    const result = filterListings(
      DATA,
      withFilters({ areas: ['Surulere'], bedrooms: 2, priceBand: '1000000_2000000' }),
    );
    // Both Surulere properties in this price band qualify: 'd' has exactly two
    // bedrooms and 'f' has three, which satisfies "at least two".
    expect(result.map(l => l.id)).toEqual(['d', 'f']);
  });

  it('includes larger properties when combining a bedroom filter with others', () => {
    const twoPlus = filterListings(DATA, withFilters({ areas: ['Surulere'], bedrooms: 2 }));
    const threePlus = filterListings(DATA, withFilters({ areas: ['Surulere'], bedrooms: 3 }));
    expect(twoPlus.map(l => l.id)).toEqual(['d', 'f']);
    expect(threePlus.map(l => l.id)).toEqual(['f']);
  });

  it('returns nothing when filters cannot all be satisfied', () => {
    const result = filterListings(DATA, withFilters({ areas: ['Yaba'], bedrooms: 3 }));
    expect(result).toHaveLength(0);
  });
});

describe('sortListings', () => {
  it('sorts by price ascending', () => {
    expect(sortListings(DATA, 'price_asc').map(l => l.pricing.annualRent)).toEqual([
      450000, 750000, 900000, 1000000, 1400000, 1800000,
    ]);
  });

  it('sorts by price descending', () => {
    expect(sortListings(DATA, 'price_desc')[0].id).toBe('f');
  });

  it('puts the biggest saving first', () => {
    expect(sortListings(DATA, 'savings_desc')[0].id).toBe('f');
  });

  it('does not mutate the input', () => {
    const before = DATA.map(l => l.id);
    sortListings(DATA, 'price_asc');
    expect(DATA.map(l => l.id)).toEqual(before);
  });
});

describe('applyFilters', () => {
  it('filters then sorts', () => {
    const result = applyFilters(DATA, withFilters({ areas: ['Yaba'], sort: 'price_asc' }));
    expect(result.map(l => l.id)).toEqual(['a', 'b', 'e']);
  });
});

describe('helpers', () => {
  it('offers the market’s areas, sorted — not just those in the loaded page', () => {
    // Deliberately no longer derived from results. Browse now fetches a capped
    // page, so deriving would drop a neighbourhood from the filter exactly when
    // it had too few listings to appear on that page.
    const areas = availableAreas();

    expect(areas).toEqual([...areas].sort());
    expect(areas).toContain('Yaba');
    expect(areas).toContain('Lekki');
    expect(areas.length).toBeGreaterThan(new Set(DATA.map(l => l.location.area)).size);
  });

  it('reports no active filters for the empty state', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('does not count sort as a filter, because it reorders rather than narrows', () => {
    const sorted = withFilters({ sort: 'price_asc' });
    expect(hasActiveFilters(sorted)).toBe(false);
    expect(activeFilterCount(sorted)).toBe(0);
  });

  it('counts each narrowing filter once', () => {
    expect(
      activeFilterCount(withFilters({ query: 'yaba', bedrooms: 2, priceBand: '1000000_2000000' })),
    ).toBe(3);
  });

  it('covers every rent with exactly one band besides "any"', () => {
    const bands = priceBands().filter(b => b.value !== 'any');
    for (const rent of [0, 499999, 500000, 999999, 1000000, 1999999, 2000000, 9999999]) {
      const matching = bands.filter(
        b => rent >= b.min && (b.max === Infinity ? true : rent < b.max),
      );
      expect(matching).toHaveLength(1);
    }
  });
});
