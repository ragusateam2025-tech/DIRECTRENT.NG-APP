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

/**
 * Every image for a listing, in order, for the detail gallery.
 *
 * The owner upload flow accepts up to ten photos and the detail screen showed
 * only the first, so nine of them were never seen by anyone. Seeded listings
 * carry a single stock image and so return an array of one — callers can treat
 * both sources identically rather than branching on which kind of listing it is.
 */
export function allImageSources(
  listing: Listing | LandlordListing,
): ImageSourcePropType[] {
  const uploaded = listing.media?.photos;
  if (uploaded?.length) return uploaded.map(uri => ({ uri }));

  const key = listing.media?.photoKey;
  const stock = key ? PROPERTY_IMAGES[key] : undefined;
  return stock ? [stock] : [];
}
