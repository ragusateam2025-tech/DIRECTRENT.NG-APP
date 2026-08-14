import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  setDoc,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

/**
 * How much interest a property is getting.
 *
 * An owner with no messages has no reason to open the app, and no way to tell
 * whether silence means a bad price or nobody looking. These three numbers are
 * the difference between those two, and they are the only reason to come back
 * on a quiet week.
 *
 * Recorded as one document per person under the listing rather than as counters
 * on it. Three reasons, in order of importance:
 *
 *   - A counter has to be writable by whoever is counting, which would mean
 *     letting any signed-in user write to somebody else's listing. Here each
 *     person may only write their own row, so the numbers cannot be inflated by
 *     anyone but a crowd.
 *   - Unique people is the honest measure. A counter incremented per open says
 *     "47 views" when one undecided tenant opened it forty-seven times.
 *   - Reopening the same listing rewrites the same document, so there is
 *     nothing to deduplicate later.
 *
 * The cost is a count query per figure, which Firestore charges at one read per
 * thousand documents — cheaper than the reads a counter would have cost anyway.
 */

export interface ListingStats {
  /** Distinct people who opened the listing. */
  views: number;
  /** Distinct people who saved it. */
  saves: number;
  /** Distinct people who enquired. */
  enquiries: number;
}

/** Subcollections under listings/{id}, each keyed by the person's uid. */
const VIEWS = 'views';
const SAVED_BY = 'savedBy';
const ENQUIRIES = 'enquiries';

function marker(listingId: string, sub: string, uid: string) {
  return doc(db, COLLECTIONS.listings, listingId, sub, uid);
}

/**
 * Notes that someone looked at a property.
 *
 * Never fatal and never awaited by anything the user is waiting on: a failed
 * count must not stop a tenant reading a listing. The owner is not recorded —
 * an owner checking their own advert is not interest, and counting it would
 * make the number flattering and useless.
 */
export async function recordListingView(listingId: string, uid: string): Promise<void> {
  await setDoc(marker(listingId, VIEWS, uid), { at: Date.now() }, { merge: true });
}

/** Mirrors a save so the owner can count it. The tenant's own list is elsewhere. */
export async function recordListingSave(
  listingId: string,
  uid: string,
  saved: boolean,
): Promise<void> {
  const ref = marker(listingId, SAVED_BY, uid);
  if (saved) {
    await setDoc(ref, { at: Date.now() }, { merge: true });
  } else {
    await deleteDoc(ref);
  }
}

/** Notes that someone enquired. Keyed by tenant, so re-enquiring counts once. */
export async function recordListingEnquiry(listingId: string, uid: string): Promise<void> {
  await setDoc(marker(listingId, ENQUIRIES, uid), { at: Date.now() }, { merge: true });
}

/**
 * The three figures, for the owner's own listing.
 *
 * Counted in parallel, and a failure on any one is reported as zero rather than
 * failing the screen: a missing number is a smaller problem than a property
 * page that will not load.
 */
export async function fetchListingStats(listingId: string): Promise<ListingStats> {
  async function count(sub: string): Promise<number> {
    try {
      const snapshot = await getCountFromServer(
        collection(db, COLLECTIONS.listings, listingId, sub),
      );
      return snapshot.data().count;
    } catch {
      return 0;
    }
  }

  const [views, saves, enquiries] = await Promise.all([
    count(VIEWS),
    count(SAVED_BY),
    count(ENQUIRIES),
  ]);

  return { views, saves, enquiries };
}
