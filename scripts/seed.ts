import { doc, writeBatch } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../src/lib/firebase';
import { SEED_LISTINGS } from '../src/data/seedListings';

/**
 * Writes the six demo listings to Firestore.
 *
 * This runs inside the app (triggered from Profile) rather than as a standalone
 * Node script, because the React Native Firebase SDK is native and needs an app
 * context — `node scripts/seed.ts` cannot authenticate.
 *
 * Idempotent: each listing uses a fixed document ID, so running it twice
 * overwrites rather than duplicating.
 */
export async function seedListings(): Promise<number> {
  const batch = writeBatch(db);

  for (const listing of SEED_LISTINGS) {
    const { id, ...data } = listing;
    batch.set(doc(db, COLLECTIONS.listings, id), data);
  }

  await batch.commit();
  return SEED_LISTINGS.length;
}
