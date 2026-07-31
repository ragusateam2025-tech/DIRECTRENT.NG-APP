// Markets Directrent operates in.
//
// Everything that varies between cities lives here, so opening a new one is a
// data change rather than a code change: add an entry, and search scoping,
// area filters and price bands follow automatically.
//
// Rent thresholds are per-market on purpose. Lagos bands applied to Ibadan
// would put almost every property in the bottom band, which is the same as
// having no price filter at all.

import { formatNaira } from '../lib/format';

export interface Market {
  /** Stable key, stored on listings. Never rename one — it is written to data. */
  id: string;
  /** Nigerian state. */
  state: string;
  /** What a user sees in a market picker. */
  label: string;
  /**
   * Neighbourhoods offered in the area filter.
   *
   * Held here rather than derived from loaded listings: derivation only worked
   * while the app downloaded every listing, and would silently offer just the
   * areas on the current page once results are paginated.
   */
  areas: string[];
  /**
   * Annual-rent boundaries in naira, ascending, calibrated to this market.
   * Bands are built from these, so a market needs thresholds and nothing else.
   */
  rentThresholds: number[];
}

export const MARKETS: Market[] = [
  {
    id: 'lagos',
    state: 'Lagos',
    label: 'Lagos',
    areas: [
      'Yaba',
      'Surulere',
      'Ikeja',
      'Gbagada',
      'Maryland',
      'Ojota',
      'Ikoyi',
      'Lekki',
      'Victoria Island',
      'Ajah',
      'Magodo',
      'Ogba',
    ],
    rentThresholds: [500_000, 1_000_000, 2_000_000],
  },
  // Next markets slot in here. Each needs its own thresholds — a city where
  // ₦400,000 is a good flat should not inherit Lagos bands.
  //
  // {
  //   id: 'abuja', state: 'FCT', label: 'Abuja',
  //   areas: ['Wuse', 'Garki', 'Maitama', 'Gwarinpa', 'Asokoro'],
  //   rentThresholds: [800_000, 1_500_000, 3_000_000],
  // },
];

/**
 * The market the app opens in.
 *
 * Lagos while it is the only one. Once there are several this becomes a stored
 * user preference — the rest of the app already reads through this function
 * rather than assuming Lagos, so that change stays local to this file.
 */
export const DEFAULT_MARKET_ID = 'lagos';

export function marketById(id: string): Market | undefined {
  return MARKETS.find(m => m.id === id);
}

export function defaultMarket(): Market {
  const market = marketById(DEFAULT_MARKET_ID);
  if (!market) throw new Error(`Default market "${DEFAULT_MARKET_ID}" is missing from MARKETS.`);
  return market;
}

export interface MarketPriceBand {
  /**
   * Derived from the thresholds themselves — `under_500000`, `500000_1000000`,
   * `over_2000000` — rather than a positional `band_2`. Self-describing in
   * logs and tests, and stable as long as the thresholds are.
   */
  value: string;
  label: string;
  min: number;
  /** Infinity on the top band. */
  max: number;
}

/**
 * Builds price bands from a market's thresholds.
 *
 * Bands are generated rather than written out so labels cannot drift from the
 * numbers they filter on, which is the usual way a "Under ₦500,000" option ends
 * up quietly matching something else.
 */
export function priceBandsFor(market: Market): MarketPriceBand[] {
  const bands: MarketPriceBand[] = [{ value: 'any', label: 'Any price', min: 0, max: Infinity }];
  const thresholds = [...market.rentThresholds].sort((a, b) => a - b);

  thresholds.forEach((threshold, i) => {
    const min = i === 0 ? 0 : thresholds[i - 1];
    bands.push({
      value: i === 0 ? `under_${threshold}` : `${min}_${threshold}`,
      label:
        i === 0
          ? `Under ${formatNaira(threshold)}`
          : `${formatNaira(min)} – ${formatNaira(threshold)}`,
      min,
      max: threshold,
    });
  });

  const highest = thresholds[thresholds.length - 1];
  if (highest !== undefined) {
    bands.push({
      value: `over_${highest}`,
      label: `Over ${formatNaira(highest)}`,
      min: highest,
      max: Infinity,
    });
  }

  return bands;
}
