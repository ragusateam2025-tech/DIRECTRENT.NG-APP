import { collection, doc, getDocs, updateDoc } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../src/lib/firebase';
import { DEFAULT_MARKET_ID, defaultMarket } from '../src/data/markets';

/**
 * Whether the owner lives on each of the six demo properties.
 *
 * Chosen, not discovered — these are demo listings with no real owner behind
 * them, so the values exist to make the filter demonstrable rather than to
 * describe anything true. A mix, because a catalogue where every answer is the
 * same tests nothing.
 *
 * Deliberately keyed by document id and applied to nothing else. A listing a
 * real owner published is a real claim about where somebody lives, and this
 * script has no business guessing it.
 */
const DEMO_OWNER_OCCUPIED: Record<string, boolean> = {
  'yaba-selfcon-01': true,
  'yaba-minif-02': false,
  'surulere-1bed-03': false,
  'surulere-2bed-04': true,
  'yaba-2bed-05': false,
  'surulere-3bed-06': true,
};

export interface BackfillReport {
  scanned: number;
  updated: number;
  /** Already carried every field. */
  untouched: number;
  /** Documents whose owner-occupancy is not ours to invent. */
  needsOccupancy: string[];
}

/**
 * Adds the fields the catalogue grew after these documents were written.
 *
 * Three things are missing across the listings collection, all for the same
 * reason: each was added to the model after the documents existed, and
 * Firestore does not validate shape, so nothing complained.
 *
 *   location.marketId — Browse queries on it, so a listing without it is
 *                       invisible except through the migration shim
 *   location.state    — the market registry's own field
 *   ownerId           — without it the Message and Call buttons hide
 *                       themselves, which is why messaging has never once
 *                       completed end to end
 *   ownerOccupied     — the question the listing screen now shows
 *
 * Runs inside the app rather than as a Node script, for the same reason the
 * seeder does: React Native Firebase is a native SDK and cannot authenticate
 * from `node`.
 *
 * Merges rather than overwrites. Each field is written by its own dotted path,
 * so `location.marketId` lands beside the existing address and area instead of
 * replacing the whole location object — and a field that already has a value is
 * never touched. Uploaded photos, edited descriptions and manual console fixes
 * all survive, which a `set()` of the seed data would have destroyed.
 *
 * Idempotent: a second run finds nothing missing and writes nothing.
 */
export async function backfillListings(): Promise<BackfillReport> {
  const market = defaultMarket();
  const snapshot = await getDocs(collection(db, COLLECTIONS.listings));

  const report: BackfillReport = {
    scanned: snapshot.docs.length,
    updated: 0,
    untouched: 0,
    needsOccupancy: [],
  };

  for (const snap of snapshot.docs) {
    const data = snap.data() as Record<string, any>;
    const patch: Record<string, unknown> = {};

    if (!data.location?.marketId) patch['location.marketId'] = DEFAULT_MARKET_ID;
    if (!data.location?.state) patch['location.state'] = market.state;
    if (!data.ownerId) patch.ownerId = 'demo';

    if (data.ownerOccupied === undefined) {
      const demo = DEMO_OWNER_OCCUPIED[snap.id];
      if (demo === undefined) {
        // Someone's real listing. Left alone and reported, so a person who
        // knows the answer can give it.
        report.needsOccupancy.push(snap.id);
      } else {
        patch.ownerOccupied = demo;
      }
    }

    if (Object.keys(patch).length === 0) {
      report.untouched += 1;
      continue;
    }

    await updateDoc(doc(db, COLLECTIONS.listings, snap.id), patch);
    report.updated += 1;
  }

  return report;
}
