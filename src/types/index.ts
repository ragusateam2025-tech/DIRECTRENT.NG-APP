// Listing shape is a trimmed subset of CreateListingRequest in
// MASTER_PRD_PART2.md §2.1.3 — same field names and nesting, fewer fields,
// so the full owner listing flow can extend this without renaming anything.

export type UserRole = 'tenant' | 'landlord' | 'both';

/** How soon a tenant wants to move. Preset bands rather than a date picker. */
export type MoveInTiming = 'asap' | 'within_month' | 'one_to_three_months' | 'flexible';

export type LeaseDuration = 6 | 12 | 24;

export type ApplicationStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

/**
 * A tenant's expression of interest in a property.
 *
 * Denormalises the listing title and the tenant's name deliberately: both
 * screens that show an application need them, and a second read per row would
 * make a list of applications N+1 queries on a mobile connection.
 */
export interface Application {
  id: string;
  listingId: string;
  /** The uid of the property owner, so they can query applications addressed to them. */
  landlordId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  /** Copied at submission so the row reads correctly even if the listing changes. */
  listingTitle: string;
  listingArea: string;
  annualRent: number;
  moveIn: MoveInTiming;
  leaseMonths: LeaseDuration;
  occupants: number;
  message: string;
  status: ApplicationStatus;
  createdAt: number;
}

/**
 * A conversation between one tenant and one owner about one property.
 *
 * Shape follows Conversation in FEATURE_SPEC_PART3.md §8.1.1, trimmed to what
 * a text thread needs. Denormalises the property title and the other party's
 * name for the same reason Application does: the conversation list would
 * otherwise need two extra reads per row.
 */
export interface Conversation {
  /** `{listingId}_{tenantId}` — one thread per tenant per property. */
  id: string;
  listingId: string;
  landlordId: string;
  tenantId: string;
  /**
   * Both uids in one array. Firestore cannot OR across two fields, so this is
   * what lets a single array-contains query find every thread a user is in.
   */
  participants: string[];
  landlordName: string;
  tenantName: string;
  /** Copied at creation so the row reads correctly if the listing changes. */
  listingTitle: string;
  listingArea: string;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId: string;
  /** Unread count per participant uid. Cleared when that user opens the thread. */
  unread: Record<string, number>;
  createdAt: number;
}

/**
 * Text only for now. The spec defines image, document, property_card,
 * schedule_viewing, payment_request and location types; the field is kept so
 * those can be added without a migration.
 */
export type MessageType = 'text' | 'call';

/**
 * How a call ended, as recorded in the thread.
 *
 * `missed` and `declined` are kept apart deliberately. A tenant who sees
 * "missed" tries again; one who sees they were declined does not, and
 * collapsing the two would quietly mislead whichever side was wrong.
 */
export type CallOutcome = 'missed' | 'declined' | 'completed' | 'unanswered';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  /** Human-readable line, used for the conversation list preview either way. */
  text: string;
  /** Present on `call` messages only. */
  call?: {
    outcome: CallOutcome;
    /** Whole seconds, on a completed call. */
    seconds?: number;
  };
  createdAt: number;
}

/**
 * Call lifecycle.
 *
 * `ringing`   — offer written, waiting for the other side.
 * `connected` — answered, audio flowing.
 * `ended`     — finished normally, by either party.
 * `declined`  — the callee actively refused.
 * `missed`    — nobody answered before the timeout.
 */
export type CallStatus = 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';

/**
 * One call attempt, and the signalling that sets it up.
 *
 * WebRTC carries the audio but cannot start the conversation: the two phones
 * must first exchange session descriptions and network candidates. Firestore
 * already sits between these two users, so it does that job — no extra
 * service, and the rules that protect the thread protect the call with it.
 */
export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  /** Both uids, so one array-contains query finds a user's incoming calls. */
  participants: string[];
  callerName: string;
  status: CallStatus;
  /** SDP offer from the caller, written when the call is placed. */
  offer?: { type: string; sdp: string };
  /** SDP answer from the callee, written when they accept. */
  answer?: { type: string; sdp: string };
  createdAt: number;
  connectedAt?: number;
  endedAt?: number;
}

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
  /** Normalised to +234XXXXXXXXXX. Absent until the user adds it. */
  phone?: string;
  /** Storage download URL for the profile picture. Absent falls back to initials. */
  photoUrl?: string;
  role: UserRole;
  /** False until the user passes the role-selection screen. */
  roleChosen: boolean;
  createdAt: number;
}

/**
 * Listing lifecycle.
 *
 * `draft`   — the owner is still filling in the wizard. Visible only to them.
 * `pending` — submitted, awaiting review. Still invisible to tenants.
 * `active`  — approved and browsable.
 * `rented`  — no longer available.
 */
export type ListingStatus = 'draft' | 'pending' | 'active' | 'rented';

/**
 * A listing as it exists in an owner's own list, which includes drafts.
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
   * uid of the property owner. Every Firestore and Storage
   * rule keys off this — see firestore.rules. Immutable after creation.
   */
  ownerId: string;
  /**
   * The owner's display name, copied at creation.
   *
   * Denormalised because a tenant cannot read the owner's user document —
   * firestore.rules restricts /users/{uid} to that user alone — so this is the
   * only way a conversation can be labelled with a human name. Absent on the
   * seeded demo listings, which predate it.
   */
  ownerName?: string;
  /**
   * Phone number tenants may call, normalised to +234XXXXXXXXXX.
   *
   * Deliberately NOT copied automatically from the owner's profile. Publishing
   * someone's personal number to every stranger browsing listings is their
   * decision to make, not a side effect of filling in a form — so this stays
   * empty until the listing flow asks them, and the call button says no number
   * is listed rather than guessing.
   */
  ownerPhone?: string | null;
  /**
   * Whether the owner lives on the property.
   *
   * A first-order question for Nigerian renters and one no international
   * template asks: an owner in the compound means house rules, less privacy,
   * often a stricter tenancy — and equally, faster repairs and someone
   * accountable on site. Tenants ask it on every viewing, so the listing
   * answers it before anyone travels.
   *
   * Absent on listings created before the field existed; shown only when set.
   */
  ownerOccupied?: boolean;
  basicInfo: {
    title: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
    furnishing: FurnishingType;
  };
  location: {
    address: string;
    /** Neighbourhood, e.g. Yaba. Only unique within a state. */
    area: string;
    /** Local Government Area. */
    lga: string;
    /**
     * Market key from src/data/markets.ts, e.g. 'lagos'.
     *
     * This is what Browse filters on server-side. Without it every query would
     * have to fetch the whole country and narrow on the device, which is fine
     * at demo scale and ruinous at national scale.
     *
     * Optional only because listings created before this field existed do not
     * have it; readers should treat a missing value as the default market.
     */
    marketId?: string;
    /** Nigerian state, denormalised for display and coarse filtering. */
    state?: string;
  };
  media: {
    /**
     * Key into the bundled image map in src/data/seedListings.ts.
     * Demo listings only — real listings use `photos`.
     */
    photoKey?: string;
    /**
     * Firebase Storage download URLs, first is primary. Populated by the
     * owner upload flow; absent on the seeded demo listings.
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
