import type { Listing } from '../types';

export interface TourQueue {
  /** Asked, nobody has decided. The operator's actual inbox. */
  pending: Listing[];
  /** Approved and not yet shot. The round to drive. */
  approved: Listing[];
  /** Shot and attached. */
  done: Listing[];
  /** Turned down, kept visible so a wrong call can be reversed. */
  declined: Listing[];
}

/**
 * Sorts shoot requests into what to do next.
 *
 * Pure, and separated from the query for that reason: which pile a property
 * belongs in is the only part of the queue with a decision in it, and it is
 * decided by two fields that can contradict each other.
 *
 * The order of the checks is the whole content of this function. A tour on the
 * document outranks everything: if one is attached the job is finished,
 * whatever the review says — including an operator who shot a property before
 * anybody formally approved it, which is exactly what will happen the first
 * time somebody is already standing there.
 */
export function partitionTourQueue(listings: Listing[]): TourQueue {
  const queue: TourQueue = { pending: [], approved: [], done: [], declined: [] };

  for (const listing of listings) {
    if (listing.tour?.embedUrl) {
      queue.done.push(listing);
    } else if (listing.tourReview?.status === 'declined') {
      queue.declined.push(listing);
    } else if (listing.tourReview?.status === 'approved') {
      queue.approved.push(listing);
    } else {
      // Absent and null both land here. A decision that was undone puts the
      // property back in front of the operator rather than nowhere.
      queue.pending.push(listing);
    }
  }

  return queue;
}
