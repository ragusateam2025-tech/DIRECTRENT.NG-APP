import { defaultMarket, priceBandsFor, type MarketPriceBand } from '../data/markets';
import type { Listing } from '../types';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'savings_desc';

/**
 * Preset bands rather than a slider — no extra dependency, and easier to hit on
 * a phone.
 *
 * A plain string rather than a union of Lagos-shaped literals: the bands
 * themselves come from the market, so the set of valid values differs between
 * cities and cannot be enumerated here.
 */
export type PriceBand = string;

export interface Filters {
  /** Free text, matched against title, area and address. */
  query: string;
  /** Empty means every area. */
  areas: string[];
  /** Empty means any number of bedrooms. A value of 3 means "3 or more". */
  bedrooms: number | null;
  priceBand: PriceBand;
  /**
   * Whether the property owner lives on the property. Null means either.
   *
   * A filter rather than a note on the listing because it is disqualifying in
   * both directions: some renters will not take a place with the owner in the
   * compound, and others specifically want one for the security and the
   * repairs. Neither group should have to open ten listings to find out.
   */
  ownerOccupied: boolean | null;
  sort: SortOption;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  areas: [],
  bedrooms: null,
  priceBand: 'any',
  ownerOccupied: null,
  sort: 'newest',
};

/**
 * Bands for the market currently being browsed.
 *
 * Previously a hardcoded Lagos ladder. Applied unchanged to a cheaper city it
 * would put nearly every property in the bottom band, leaving the filter
 * technically present and practically useless.
 */
export function priceBands(market = defaultMarket()): MarketPriceBand[] {
  return priceBandsFor(market);
}

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
    filters.priceBand !== 'any' ||
    filters.ownerOccupied !== null
  );
}

/** How many filters are narrowing results. Sort is excluded — it reorders, it does not narrow. */
export function activeFilterCount(filters: Filters): number {
  let count = 0;
  if (filters.query.trim().length > 0) count += 1;
  if (filters.areas.length > 0) count += 1;
  if (filters.bedrooms !== null) count += 1;
  if (filters.priceBand !== 'any') count += 1;
  if (filters.ownerOccupied !== null) count += 1;
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

function matchesPrice(listing: Listing, band: PriceBand, bands: MarketPriceBand[]): boolean {
  const config = bands.find(b => b.value === band);
  if (!config) return true;
  const rent = listing.pricing.annualRent;
  // Upper bound is exclusive so adjacent bands cannot both claim the same rent.
  return rent >= config.min && (config.max === Infinity ? true : rent < config.max);
}

/**
 * Applies every filter. Order does not matter — all conditions must hold.
 *
 * Takes the market's bands so the same rent is judged against local
 * expectations rather than Lagos ones.
 */
export function filterListings(
  listings: Listing[],
  filters: Filters,
  bands: MarketPriceBand[] = priceBands(),
): Listing[] {
  return listings.filter(listing => {
    if (!matchesQuery(listing, filters.query)) return false;
    if (filters.areas.length > 0 && !filters.areas.includes(listing.location.area)) return false;
    // A bedroom filter means "at least this many" — someone wanting 2 will take 3.
    if (filters.bedrooms !== null && listing.basicInfo.bedrooms < filters.bedrooms) return false;
    if (!matchesPrice(listing, filters.priceBand, bands)) return false;
    // A listing that never answered matches neither Yes nor No. Guessing would
    // send someone across Lagos on a filter that promised something specific.
    if (filters.ownerOccupied !== null && listing.ownerOccupied !== filters.ownerOccupied) {
      return false;
    }
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
export function applyFilters(
  listings: Listing[],
  filters: Filters,
  bands: MarketPriceBand[] = priceBands(),
): Listing[] {
  return sortListings(filterListings(listings, filters, bands), filters.sort);
}

/**
 * Areas the filter offers, from the market rather than from loaded listings.
 *
 * Deriving them from the results was only correct while every listing was
 * downloaded. Now that Browse fetches a capped page, derivation would offer
 * only the areas that happened to appear on it — so a neighbourhood would
 * vanish from the filter precisely when it had too few listings to show up.
 */
export function availableAreas(market = defaultMarket()): string[] {
  return [...market.areas].sort();
}
