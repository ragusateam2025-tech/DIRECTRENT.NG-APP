import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit as limitTo,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { DEFAULT_MARKET_ID } from '../data/markets';
import type { Listing } from '../types';

/** How many listings one Browse load pulls. */
export const PAGE_SIZE = 50;

export interface ListingQuery {
  /** Market key from src/data/markets.ts. Defaults to the app's current market. */
  marketId?: string;
  /** Narrows to one neighbourhood server-side when the user has picked exactly one. */
  area?: string;
  limit?: number;
}

/**
 * Active listings for a market.
 *
 * Scoped and capped in the query rather than on the device. The previous
 * version fetched every active listing in the database and filtered in JS,
 * which works while the whole catalogue fits on a phone and stops working —
 * and starts costing one document read per listing per browse — the moment it
 * does not.
 *
 * Text search, bedrooms and price still filter on the device. That split is
 * deliberate: they are refinements within an already-narrow set, and Firestore
 * cannot do substring matching at all. Market and area are what meaningfully
 * cut the set, so they are what gets pushed to the server.
 */
export async function fetchListings(options: ListingQuery = {}): Promise<Listing[]> {
  const marketId = options.marketId ?? DEFAULT_MARKET_ID;

  const constraints = [
    where('status.listing', '==', 'active'),
    where('location.marketId', '==', marketId),
  ];

  if (options.area) {
    constraints.push(where('location.area', '==', options.area));
  }

  const q = query(
    collection(db, COLLECTIONS.listings),
    ...constraints,
    limitTo(options.limit ?? PAGE_SIZE),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => withOwner({ id: d.id, ...d.data() } as Listing));
}

// The legacy fallback lived here until 10 August 2026.
//
// It existed because listings written before the market registry had no
// location.marketId and so matched no scoped query — they were invisible in
// Browse. Every listing now carries one, so the second read it cost on every
// browse bought nothing.
//
// Anything created from here on gets its market at the point of writing:
// LocationStep sets marketId and state from the market registry before the
// draft is ever saved.

/**
 * Listings by id, for resolving a user's saved properties.
 *
 * Saved listings are few and may span markets, so they are fetched by id
 * rather than by browsing the catalogue and filtering it down.
 */
export async function fetchListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];

  // Firestore caps an `in` query at 30 values, so ids go in chunks.
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

  const results = await Promise.all(
    chunks.map(async chunk => {
      const q = query(collection(db, COLLECTIONS.listings), where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => withOwner({ id: d.id, ...d.data() } as Listing));
    }),
  );

  return results.flat();
}

/** Fetches a single listing by ID, or null if it does not exist. */
export async function fetchListing(id: string): Promise<Listing | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.listings, id));
  if (!snapshot.exists()) return null;
  return withOwner({ id: snapshot.id, ...snapshot.data() } as Listing);
}

/**
 * TEMPORARY — delete once every listing document carries ownerId.
 *
 * The seeded listings were written before the field existed, so contact
 * buttons hid themselves and enquiries died writing an undefined ownerId.
 * Fixing the data needs console access; this fills the gap in the meantime by
 * treating an owner-less listing as belonging to the demo account, which is
 * what seedListings.ts already says it is.
 *
 * Messaging works fully under this: the conversation is created with `demo` as
 * a participant and every write passes the rules. Nobody is on the other end
 * to reply, so it demonstrates the tenant's side of the thread and no more.
 *
 * Only ever applies to documents with no owner at all. A real listing always
 * carries one and is untouched.
 */
function withOwner(listing: Listing): Listing {
  if (listing.ownerId) return listing;
  return { ...listing, ownerId: SEED_OWNER_ID };
}

const SEED_OWNER_ID = 'demo';
