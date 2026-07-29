import type { ImageSourcePropType } from 'react-native';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing } from '../types';

/**
 * Resolves a listing's primary image.
 *
 * Two sources exist during the pilot: landlord-uploaded photos stored in
 * Firebase Storage, and the bundled stock images on the seeded demo listings.
 * Uploaded photos win — a real listing should never fall back to stock.
 *
 * Returns undefined when neither exists, in which case callers render the
 * branded placeholder.
 */
export function primaryImageSource(listing: Listing): ImageSourcePropType | undefined {
  const uploaded = listing.media.photos?.[0];
  if (uploaded) return { uri: uploaded };

  const key = listing.media.photoKey;
  return key ? PROPERTY_IMAGES[key] : undefined;
}
