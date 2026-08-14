import { MIN_PHOTOS, whatIsMissing } from '../src/lib/publishChecks';
import type { Listing } from '../src/types';

/**
 * A publishable draft, with whatever the test wants broken.
 *
 * Overrides are loosely typed on purpose. These fixtures carry only the fields
 * the checks read — a full `basicInfo` would mean five properties of noise on
 * every case that is really about the title.
 */
function ready(overrides: Record<string, unknown> = {}): Partial<Listing> {
  return {
    basicInfo: { title: 'Two bedroom flat in Yaba' },
    pricing: { annualRent: 2_500_000 },
    media: { photos: Array.from({ length: MIN_PHOTOS }, (_, i) => `p${i}`) },
    ...overrides,
  } as unknown as Partial<Listing>;
}

describe('what stands between a draft and a published listing', () => {
  it('passes a complete listing', () => {
    expect(whatIsMissing(ready())).toBeNull();
  });

  it('refuses too few photos, and says how many', () => {
    const missing = whatIsMissing(ready({ media: { photos: ['a', 'b'] } }));

    expect(missing).toContain(String(MIN_PHOTOS));
    expect(missing).toContain('You have 2');
  });

  /**
   * The bug this file exists for.
   *
   * The photo minimum was enforced in two places — the photos step and the
   * publish gate. When a 360 request was made to lift it, only the step was
   * changed, so the wizard let the owner past step three and then refused them
   * on the last screen of a five-step form.
   */
  it('lets a property with no photos publish when a shoot was requested', () => {
    expect(
      whatIsMissing(ready({ media: { photos: [] }, tourRequested: true })),
    ).toBeNull();
  });

  it('still refuses no photos when no shoot was requested', () => {
    expect(
      whatIsMissing(ready({ media: { photos: [] }, tourRequested: false })),
    ).not.toBeNull();
  });

  it('treats an absent tour request as no request', () => {
    // Every listing written before the field existed. Absent must not read as
    // permission to publish with nothing.
    const draft = ready({ media: { photos: [] } });
    delete (draft as { tourRequested?: boolean }).tourRequested;

    expect(whatIsMissing(draft)).not.toBeNull();
  });

  it('refuses a title that is too short, and an absent one', () => {
    expect(whatIsMissing(ready({ basicInfo: { title: 'Flat' } }))).toContain(
      'title',
    );
    expect(whatIsMissing(ready({ basicInfo: undefined }))).toContain('title');
  });

  it('refuses a missing or zero rent', () => {
    expect(whatIsMissing(ready({ pricing: { annualRent: 0 } }))).toContain(
      'rent',
    );
    expect(whatIsMissing(ready({ pricing: undefined }))).toContain('rent');
  });

  it('reports photos before anything else', () => {
    // The one an owner is most likely to be short of, and the slowest to fix.
    // Being told about the title first and the photos afterwards is two trips.
    const broken = ready({
      media: { photos: [] },
      basicInfo: { title: 'x' },
      pricing: { annualRent: 0 },
    });

    expect(whatIsMissing(broken)).toContain('photos');
  });
});
