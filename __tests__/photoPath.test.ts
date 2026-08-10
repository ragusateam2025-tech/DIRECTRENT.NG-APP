import { photoStoragePath } from '../src/lib/photoPath';

describe('photoStoragePath', () => {
  it('files a photo under its owner and listing', () => {
    const path = photoStoragePath('owner-1', 'listing-1');
    expect(path.startsWith('listings/owner-1/listing-1/')).toBe(true);
    expect(path.endsWith('.jpg')).toBe(true);
  });

  it('never returns the same path twice', () => {
    // The whole point. Paths used to be the array index, so removing a photo
    // and adding another reused a name and overwrote a photo still on the
    // listing.
    const paths = new Set(
      Array.from({ length: 500 }, () => photoStoragePath('owner-1', 'listing-1')),
    );
    expect(paths.size).toBe(500);
  });

  it('keeps two listings apart', () => {
    const a = photoStoragePath('owner-1', 'listing-1');
    const b = photoStoragePath('owner-1', 'listing-2');
    expect(a).not.toBe(b);
  });

  it('produces a name safe for a storage path', () => {
    const name = photoStoragePath('owner-1', 'listing-1').split('/').pop();
    // No slashes, spaces or characters that would need escaping in a URL.
    expect(name).toMatch(/^[a-z0-9-]+\.jpg$/);
  });
});
