import type { ImageSourcePropType } from 'react-native';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing, LandlordListing } from '../types';

/**
 * Resolves a listing's primary image.
 *
 * Two sources exist during the pilot: owner-uploaded photos stored in
 * Firebase Storage, and the bundled stock images on the seeded demo listings.
 * Uploaded photos win — a real listing should never fall back to stock.
 *
 * Accepts drafts as well as published listings. A draft saved before the photos
 * step has no `media` key at all, so every level is optional-chained rather
 * than just the leaf. Returns undefined when there is nothing to show, in which
 * case callers render the branded placeholder.
 */
export function primaryImageSource(
  listing: Listing | LandlordListing,
): ImageSourcePropType | undefined {
  const uploaded = listing.media?.photos?.[0];
  if (uploaded) return { uri: uploaded };

  const key = listing.media?.photoKey;
  return key ? PROPERTY_IMAGES[key] : undefined;
}
