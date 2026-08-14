import type { PowerBand } from '../types';

/**
 * NERC electricity bands, in the terms a renter cares about.
 *
 * The band is a guaranteed minimum of supply hours per day set by the
 * distribution company, not a claim the owner invented — which is exactly why
 * it is worth asking for. "24/7 power supply" as a tick-box means whatever the
 * person ticking it wants it to mean.
 *
 * The hours lead the label because the hours are the answer. Somebody choosing
 * between two flats is not comparing letters.
 */
export const POWER_BAND_LABELS: Record<PowerBand, string> = {
  A: 'Band A — 20+ hours a day',
  B: 'Band B — 16+ hours a day',
  C: 'Band C — 12+ hours a day',
  D: 'Band D — 8+ hours a day',
  E: 'Band E — 4+ hours a day',
};

/** The short form, for the listing's facts row where space is tight. */
export const POWER_BAND_SHORT: Record<PowerBand, string> = {
  A: 'Band A',
  B: 'Band B',
  C: 'Band C',
  D: 'Band D',
  E: 'Band E',
};

/**
 * Just the guarantee, for the listing's facts row.
 *
 * "Band A" on its own means nothing to somebody who has not had to care about
 * tariff bands. Pairing the letter with the hours makes the fact readable
 * without a glossary, which is the whole reason for asking.
 */
export const POWER_BAND_HOURS: Record<PowerBand, string> = {
  A: '20+ hrs a day',
  B: '16+ hrs a day',
  C: '12+ hrs a day',
  D: '8+ hrs a day',
  E: '4+ hrs a day',
};

/** Best first, which is also the order the bands are named in. */
export const POWER_BAND_OPTIONS: PowerBand[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * What a tariff band does not tell you.
 *
 * Shown next to the choice so neither side mistakes the band for a promise of
 * uninterrupted power. It is a floor the distribution company is meant to hold
 * to, and a generator or an inverter is still worth listing separately.
 */
export const POWER_BAND_NOTE =
  'Your band is on your electricity bill. It is the supply your disco is meant to guarantee — list a generator or inverter separately.';
