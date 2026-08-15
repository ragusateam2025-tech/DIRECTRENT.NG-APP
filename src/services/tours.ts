import { collection, doc, getDocs, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { partitionTourQueue, type TourQueue } from '../lib/tourQueue';
import type {
  Listing,
  ListingTour,
  TourDecision,
  TourProvider,
  TourReview,
} from '../types';

export type { TourQueue } from '../lib/tourQueue';

/**
 * Every property that has ever asked for a shoot, sorted into what to do next.
 *
 * One query, sorted on the device. The queue is derived rather than stored: a
 * job exists because an owner ticked the box, and which pile it belongs in
 * follows from two fields on the listing itself. There is no jobs collection to
 * keep in step, and nothing to go stale if a listing is deleted or a tour is
 * attached from somewhere else.
 *
 * Firestore cannot express "field is absent" in a query, which is why the
 * sorting cannot be pushed into it. The `tourRequested` filter has already cut
 * the set to the handful of properties that asked, so this reads almost
 * nothing.
 */
export async function fetchTourQueue(): Promise<TourQueue> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('tourRequested', '==', true),
  );

  const snapshot = await getDocs(q);

  return partitionTourQueue(
    snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Listing),
  );
}

export class InvalidTourUrl extends Error {}

export class MissingDeclineReason extends Error {}

/**
 * Approves or declines a shoot request.
 *
 * A decline without a reason is refused here rather than left to the screen to
 * remember. "Declined" on its own tells an owner nothing they can act on, and
 * the real reasons — we do not cover your area yet, the photographs suggest the
 * property is not ready — are ones they can either fix or stop waiting on. An
 * unexplained no is how somebody decides the platform is not serious.
 *
 * An approval takes no reason. Being told yes needs no justification, and a
 * mandatory note on the happy path is a note that gets filled with "ok".
 */
export async function decideTourRequest(
  listingId: string,
  status: TourDecision,
  staffUid: string,
  reason?: string,
): Promise<TourReview> {
  const trimmed = reason?.trim();

  if (status === 'declined' && !trimmed) {
    throw new MissingDeclineReason(
      'Say why, in a sentence. The owner sees this, and a decline with no reason reads as no answer at all.',
    );
  }

  const review: TourReview = {
    status,
    by: staffUid,
    at: new Date().toISOString(),
    // Only on a decline. Carrying an approval's stray note onto the listing
    // would show the owner a comment nobody wrote for them.
    ...(status === 'declined' && trimmed ? { reason: trimmed } : {}),
  };

  await updateDoc(doc(db, COLLECTIONS.listings, listingId), { tourReview: review });

  return review;
}

/**
 * Puts a decided request back into the queue as new.
 *
 * Explicit null rather than a field delete, for the same reason `detachTour`
 * uses one: null is a value every reader already treats as undecided, and a
 * deleted field and an absent one should not have to be told apart.
 */
export async function reopenTourRequest(listingId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.listings, listingId), { tourReview: null });
}

/**
 * Hosts we serve 360 tours from.
 *
 * An allowlist rather than a hardcoded host, because the provider is still
 * meant to be replaceable — moving to our own hosting adds an entry here and an
 * alternative to the pattern in firestore.rules, and changes nothing else.
 */
export const TOUR_HOSTS = ['kuula.co', 'www.kuula.co'];

/**
 * Checks a pasted link before it reaches a listing.
 *
 * The failure this prevents is silent: a wrong or truncated link saves without
 * complaint and produces a tour that only fails when a tenant taps it, by which
 * time the operator has moved on and nobody knows which property is broken.
 *
 * The host must be one we serve tours from. This URL is loaded in a WebView
 * inside the app, under our branding and behind our screenshot blocking, so an
 * arbitrary address here puts an arbitrary website in front of a tenant who
 * believes they are looking at a property. The same check is enforced in
 * firestore.rules, which is the boundary; this one exists so an operator gets a
 * sentence rather than a permission error.
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

  // Compared against the parsed host, never against the whole string. A prefix
  // check on the raw text would accept https://kuula.co.example.com/, which is
  // somebody else's domain entirely.
  if (!TOUR_HOSTS.includes(parsed.host)) {
    throw new InvalidTourUrl(
      `Tours must be hosted on ${TOUR_HOSTS[0]}. That link points at ${parsed.host}.`,
    );
  }

  return parsed.toString();
}

/**
 * Attaches a captured tour to a listing.
 *
 * Writes the tour and marks the request approved. `tourRequested` deliberately
 * stays true — it is the record that this property was asked for and visited,
 * and clearing it would make the request vanish the moment it was fulfilled.
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

  // Attaching implies approval. An operator who has driven out and shot the
  // place has plainly said yes, and leaving the request sitting as undecided
  // would show the owner "waiting for a decision" under a finished tour.
  const review: TourReview = {
    status: 'approved',
    by: staffUid,
    at: tour.capturedAt ?? new Date().toISOString(),
  };

  await updateDoc(doc(db, COLLECTIONS.listings, listingId), { tour, tourReview: review });

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
