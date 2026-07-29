import { primaryImageSource } from '../src/lib/listingImage';
import type { LandlordListing } from '../src/types';

// Minimal shape of a draft as Firestore actually returns it. Only identity and
// status are guaranteed; everything else appears as the wizard progresses.
function draft(partial: Partial<LandlordListing> = {}): LandlordListing {
  return {
    id: 'abc123',
    ownerId: 'landlord-1',
    status: { listing: 'draft' },
    ...partial,
  } as LandlordListing;
}

describe('primaryImageSource', () => {
  // The bug this exists for: a draft saved after step one has no `media` key at
  // all, and reading media.photos crashed the whole My Properties screen.
  it('survives a draft with no media key', () => {
    expect(() => primaryImageSource(draft())).not.toThrow();
    expect(primaryImageSource(draft())).toBeUndefined();
  });

  it('survives a draft whose media exists but is empty', () => {
    expect(primaryImageSource(draft({ media: {} }))).toBeUndefined();
  });

  it('survives an empty photos array', () => {
    expect(primaryImageSource(draft({ media: { photos: [] } }))).toBeUndefined();
  });

  it('returns the first uploaded photo as a remote source', () => {
    const result = primaryImageSource(
      draft({ media: { photos: ['https://storage/a.jpg', 'https://storage/b.jpg'] } }),
    );
    expect(result).toEqual({ uri: 'https://storage/a.jpg' });
  });

  it('prefers an uploaded photo over a bundled demo image', () => {
    const result = primaryImageSource(
      draft({ media: { photoKey: 'property-1', photos: ['https://storage/real.jpg'] } }),
    );
    expect(result).toEqual({ uri: 'https://storage/real.jpg' });
  });

  it('returns undefined for a photoKey that maps to nothing', () => {
    expect(primaryImageSource(draft({ media: { photoKey: 'does-not-exist' } }))).toBeUndefined();
  });
});
