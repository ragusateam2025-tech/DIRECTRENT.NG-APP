import { collection, doc, getDocs, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Listing, ListingTour, TourProvider } from '../types';

/**
 * Properties waiting for a 360 shoot.
 *
 * The queue is derived, not stored. A job exists because an owner ticked the
 * box and no tour has been attached yet — there is no separate jobs collection
 * to keep in step with the listings, and nothing to go stale if a listing is
 * deleted or a tour is attached from somewhere else.
 *
 * Firestore cannot express "field is absent" in a query, so the tour check
 * happens here. The `tourRequested` filter has already cut the set to the
 * handful of properties that asked, so this reads almost nothing.
 */
export async function fetchTourQueue(): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('tourRequested', '==', true),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }) as Listing)
    .filter(listing => !listing.tour?.embedUrl);
}

/**
 * Every property that already has a tour, for checking and re-shooting.
 *
 * Kept alongside the queue because "what have we shot" is the other half of
 * the operator's job — without it a mistake can only be found by a tenant.
 */
export async function fetchCapturedTours(): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('tourRequested', '==', true),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }) as Listing)
    .filter(listing => !!listing.tour?.embedUrl);
}

export class InvalidTourUrl extends Error {}

/**
 * Checks a pasted link before it reaches a listing.
 *
 * The failure this prevents is silent: a wrong or truncated link saves without
 * complaint and produces a tour that only fails when a tenant taps it, by which
 * time the operator has moved on and nobody knows which property is broken.
 *
 * Deliberately does not check that the link is a Kuula one. The provider is
 * meant to be replaceable, and a validator that only accepts today's host would
 * have to be edited to accept tomorrow's.
 */
export function normaliseTourUrl(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new InvalidTourUrl('Paste the tour link first.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidTourUrl(
      'That is not a web address. Copy the share link from the tour and paste the whole thing.',
    );
  }

  if (parsed.protocol !== 'https:') {
    // An http tour is blocked by Android's network policy anyway, so it would
    // fail as a blank screen rather than as an error anyone could act on.
    throw new InvalidTourUrl('The link must start with https://');
  }

  return parsed.toString();
}

/**
 * Attaches a captured tour to a listing.
 *
 * Writes only the tour. `tourRequested` deliberately stays true — it is the
 * record that this property was asked for and visited, and clearing it would
 * make the request vanish the moment it was fulfilled.
 */
export async function attachTour(
  listingId: string,
  embedUrl: string,
  staffUid: string,
  provider: TourProvider = 'kuula',
): Promise<ListingTour> {
  const tour: ListingTour = {
    provider,
    embedUrl: normaliseTourUrl(embedUrl),
    capturedAt: new Date().toISOString(),
    attachedBy: staffUid,
  };

  await updateDoc(doc(db, COLLECTIONS.listings, listingId), { tour });

  return tour;
}

/**
 * Removes a tour, for when the wrong link was pasted or the shoot was bad.
 *
 * Explicit null rather than a field delete: the listing goes back into the
 * queue, and null is a value the reader already treats as "no tour".
 */
export async function detachTour(listingId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.listings, listingId), { tour: null });
}
