// Listing shape is a trimmed subset of CreateListingRequest in
// MASTER_PRD_PART2.md §2.1.3 — same field names and nesting, fewer fields,
// so the full landlord listing flow can extend this without renaming anything.

export type UserRole = 'tenant' | 'landlord' | 'both';

export type PropertyType =
  | 'self_contained'
  | 'mini_flat'
  | 'one_bedroom'
  | 'two_bedroom'
  | 'three_bedroom';

export type FurnishingType = 'unfurnished' | 'semi_furnished' | 'furnished';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  /** False until the user passes the role-selection screen. */
  roleChosen: boolean;
  createdAt: number;
}

/**
 * Listing lifecycle.
 *
 * `draft`   — the landlord is still filling in the wizard. Visible only to them.
 * `pending` — submitted, awaiting review. Still invisible to tenants.
 * `active`  — approved and browsable.
 * `rented`  — no longer available.
 */
export type ListingStatus = 'draft' | 'pending' | 'active' | 'rented';

/**
 * A listing as it exists in a landlord's own list, which includes drafts.
 *
 * `Listing` models a *published* listing, where every field is present. A draft
 * is built up step by step, so until the wizard finishes most of it is missing —
 * a draft saved after step one has `basicInfo` and nothing else.
 *
 * Only identity and status are guaranteed. Consumers must treat everything else
 * as absent, which the optional fields force them to do.
 */
export type LandlordListing = Partial<Omit<Listing, 'id' | 'ownerId' | 'status'>> & {
  id: string;
  ownerId: string;
  status: { listing: ListingStatus };
};

export interface Listing {
  id: string;
  /**
   * uid of the landlord who owns this listing. Every Firestore and Storage
   * rule keys off this — see firestore.rules. Immutable after creation.
   */
  ownerId: string;
  basicInfo: {
    title: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
    furnishing: FurnishingType;
  };
  location: {
    address: string;
    area: string;
    lga: string;
  };
  media: {
    /**
     * Key into the bundled image map in src/data/seedListings.ts.
     * Demo listings only — real listings use `photos`.
     */
    photoKey?: string;
    /**
     * Firebase Storage download URLs, first is primary. Populated by the
     * landlord upload flow; absent on the seeded demo listings.
     */
    photos?: string[];
  };
  pricing: {
    annualRent: number;
    cautionDepositMonths: number;
    serviceCharge: number;
  };
  details: {
    description: string;
    amenities: string[];
    maxOccupants: number;
  };
  status: {
    listing: ListingStatus;
  };
}
