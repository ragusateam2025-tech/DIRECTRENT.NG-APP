import { partitionTourQueue } from '../src/lib/tourQueue';
import type { Listing } from '../src/types';

/** Only the fields the partitioner reads; the rest would be noise. */
function listing(id: string, fields: Partial<Listing> = {}): Listing {
  return { id, tourRequested: true, ...fields } as Listing;
}

const TOUR = { provider: 'kuula' as const, embedUrl: 'https://kuula.co/share/x' };
const approved = { status: 'approved' as const, by: 'staff', at: '1' };
const declined = { status: 'declined' as const, reason: 'Not yet', by: 'staff', at: '1' };

describe('sorting shoot requests into piles', () => {
  it('puts an undecided request in front of the operator', () => {
    const queue = partitionTourQueue([listing('a')]);

    expect(queue.pending.map(l => l.id)).toEqual(['a']);
    expect(queue.approved).toHaveLength(0);
  });

  it('treats a reopened request as undecided rather than losing it', () => {
    // reopenTourRequest writes null rather than deleting the field, so null has
    // to land in the same pile as absent. If it did not, undoing a decline
    // would make the property vanish from every tab.
    const queue = partitionTourQueue([listing('a', { tourReview: null })]);

    expect(queue.pending.map(l => l.id)).toEqual(['a']);
  });

  it('separates approved from declined', () => {
    const queue = partitionTourQueue([
      listing('a', { tourReview: approved }),
      listing('b', { tourReview: declined }),
    ]);

    expect(queue.approved.map(l => l.id)).toEqual(['a']);
    expect(queue.declined.map(l => l.id)).toEqual(['b']);
  });

  it('counts an attached tour as done whatever the review says', () => {
    // The case that will actually happen: an operator already standing in the
    // property shoots it before anybody formally approved the request. The
    // work is finished, and no tab should still be asking for a decision.
    const queue = partitionTourQueue([
      listing('a', { tour: TOUR }),
      listing('b', { tour: TOUR, tourReview: declined }),
    ]);

    expect(queue.done.map(l => l.id)).toEqual(['a', 'b']);
    expect(queue.pending).toHaveLength(0);
    expect(queue.declined).toHaveLength(0);
  });

  it('ignores a review that carries no tour link', () => {
    // A tour object with an empty url is not a tour. Counting it as done would
    // take the property off the list to shoot and leave a tenant with a button
    // that opens nothing.
    const queue = partitionTourQueue([
      listing('a', { tour: { provider: 'kuula', embedUrl: '' }, tourReview: approved }),
    ]);

    expect(queue.done).toHaveLength(0);
    expect(queue.approved.map(l => l.id)).toEqual(['a']);
  });

  it('places every request in exactly one pile', () => {
    const listings = [
      listing('a'),
      listing('b', { tourReview: approved }),
      listing('c', { tourReview: declined }),
      listing('d', { tour: TOUR }),
    ];

    const queue = partitionTourQueue(listings);
    const total =
      queue.pending.length + queue.approved.length + queue.done.length + queue.declined.length;

    expect(total).toBe(listings.length);
  });
});
