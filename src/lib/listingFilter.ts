import type { Listing } from '../types';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'savings_desc';

/** Preset bands rather than a slider — no extra dependency, and easier to hit on a phone. */
export type PriceBand = 'any' | 'under_500k' | '500k_1m' | '1m_2m' | 'over_2m';

export interface Filters {
  /** Free text, matched against title, area and address. */
  query: string;
  /** Empty means every area. */
  areas: string[];
  /** Empty means any number of bedrooms. A value of 3 means "3 or more". */
  bedrooms: number | null;
  priceBand: PriceBand;
  sort: SortOption;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  areas: [],
  bedrooms: null,
  priceBand: 'any',
  sort: 'newest',
};

export const PRICE_BANDS: Array<{ value: PriceBand; label: string; min: number; max: number }> = [
  { value: 'any', label: 'Any price', min: 0, max: Infinity },
  { value: 'under_500k', label: 'Under ₦500,000', min: 0, max: 500000 },
  { value: '500k_1m', label: '₦500,000 – ₦1,000,000', min: 500000, max: 1000000 },
  { value: '1m_2m', label: '₦1,000,000 – ₦2,000,000', min: 1000000, max: 2000000 },
  { value: 'over_2m', label: 'Over ₦2,000,000', min: 2000000, max: Infinity },
];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  savings_desc: 'Biggest saving',
};

/** True when anything is narrowing the results, used to show a "Clear all" affordance. */
export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.areas.length > 0 ||
    filters.bedrooms !== null ||
    filters.priceBand !== 'any'
  );
}

/** How many filters are narrowing results. Sort is excluded — it reorders, it does not narrow. */
export function activeFilterCount(filters: Filters): number {
  let count = 0;
  if (filters.query.trim().length > 0) count += 1;
  if (filters.areas.length > 0) count += 1;
  if (filters.bedrooms !== null) count += 1;
  if (filters.priceBand !== 'any') count += 1;
  return count;
}

function matchesQuery(listing: Listing, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;

  // Matched against what a tenant would actually type: the property, the
  // neighbourhood, or the street.
  const haystack = [
    listing.basicInfo.title,
    listing.location.area,
    listing.location.address,
    listing.location.lga,
  ]
    .join(' ')
    .toLowerCase();

  // Every word must appear somewhere, so "yaba flat" narrows rather than widens.
  return q.split(/\s+/).every(word => haystack.includes(word));
}

function matchesPrice(listing: Listing, band: PriceBand): boolean {
  const config = PRICE_BANDS.find(b => b.value === band);
  if (!config) return true;
  const rent = listing.pricing.annualRent;
  // Upper bound is exclusive so adjacent bands cannot both claim the same rent.
  return rent >= config.min && (config.max === Infinity ? true : rent < config.max);
}

/** Applies every filter. Order does not matter — all conditions must hold. */
export function filterListings(listings: Listing[], filters: Filters): Listing[] {
  return listings.filter(listing => {
    if (!matchesQuery(listing, filters.query)) return false;
    if (filters.areas.length > 0 && !filters.areas.includes(listing.location.area)) return false;
    // A bedroom filter means "at least this many" — someone wanting 2 will take 3.
    if (filters.bedrooms !== null && listing.basicInfo.bedrooms < filters.bedrooms) return false;
    if (!matchesPrice(listing, filters.priceBand)) return false;
    return true;
  });
}

/** Returns a new sorted array; the input is left alone. */
export function sortListings(listings: Listing[], sort: SortOption): Listing[] {
  const copy = [...listings];

  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.pricing.annualRent - b.pricing.annualRent);
    case 'price_desc':
      return copy.sort((a, b) => b.pricing.annualRent - a.pricing.annualRent);
    case 'savings_desc':
      // Savings scale linearly with rent, so this is the expensive ones first —
      // but expressed as the thing a tenant actually cares about.
      return copy.sort((a, b) => b.pricing.annualRent - a.pricing.annualRent);
    case 'newest':
    default:
      return copy;
  }
}

/** Filter then sort, which is the order the Browse screen needs. */
export function applyFilters(listings: Listing[], filters: Filters): Listing[] {
  return sortListings(filterListings(listings, filters), filters.sort);
}

/** Every area present in the data, so the filter never offers an empty result. */
export function availableAreas(listings: Listing[]): string[] {
  return Array.from(new Set(listings.map(l => l.location.area))).sort();
}
