import type { Listing } from '../types';

/** Minimum photos before a listing may be published. */
export const MIN_PHOTOS = 5;

/**
 * What still stands between a draft and a published listing.
 *
 * Returns the sentence to show the owner, or null when nothing is missing.
 *
 * Pure and in one place, which it was not before and which cost us. The photo
 * minimum was enforced twice — once by the photos step and once here — and when
 * a 360 request was made to lift it, only the first was changed. The wizard let
 * the owner past step three and then refused them on the last screen of a
 * five-step form, which is the worst possible arrangement of the same rule.
 *
 * Order matters: photos first, because that is the one an owner is most likely
 * to be short of and the one that takes longest to fix.
 */
export function whatIsMissing(listing: Partial<Listing>): string | null {
  const photos = listing.media?.photos ?? [];

  // Asking us to shoot the property lifts the requirement. Insisting they
  // photograph a place we are about to photograph ourselves is what pushes
  // people into uploading something poor to get past the screen.
  if (!listing.tourRequested && photos.length < MIN_PHOTOS) {
    return `Add at least ${MIN_PHOTOS} photos before publishing. You have ${photos.length}.`;
  }

  if (!listing.basicInfo?.title || listing.basicInfo.title.trim().length < 10) {
    return 'Give the property a title of at least 10 characters.';
  }

  if (!listing.pricing?.annualRent || listing.pricing.annualRent <= 0) {
    return 'Set an annual rent.';
  }

  return null;
}
