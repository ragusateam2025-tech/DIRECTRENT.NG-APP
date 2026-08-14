// Listing shape is a trimmed subset of CreateListingRequest in
// MASTER_PRD_PART2.md §2.1.3 — same field names and nesting, fewer fields,
// so the full owner listing flow can extend this without renaming anything.

export type UserRole = 'tenant' | 'landlord' | 'both';

/** How soon a tenant wants to move. Preset bands rather than a date picker. */
export type MoveInTiming = 'asap' | 'within_month' | 'one_to_three_months' | 'flexible';

export type LeaseDuration = 6 | 12 | 24;

export type ApplicationStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

/**
 * What a property allows, and when it is free.
 *
 * These are the questions a renter asks before spending a morning and a
 * transport fare crossing Lagos — can I keep a dog, when can I actually move
 * in, will they take six months. Today every one of them costs a message and a
 * wait, which is friction the listing could have removed.
 *
 * MASTER_PRD §5 defines more fields than these: a separate noise policy, guest
 * policy and an array of custom rules, plus a maximum lease. Three free-text
 * boxes asking nearly the same thing produces three empty boxes, so they are
 * one; and a maximum lease is not a real constraint in a market that advertises
 * by the year.
 */
export type PetPolicy = 'no_pets' | 'cats_only' | 'small_pets' | 'all_pets';
export type SmokingPolicy = 'no_smoking' | 'outdoor_only' | 'allowed';

/**
 * What a tenant may change about the building itself.
 *
 * Its own field rather than a line of free text, because it is the rule most
 * often broken and the most expensive to undo. Chasing a wall for an air
 * conditioner, climbing the roof to mount solar, lifting floor tiles — a tenant
 * doing any of it uninvited is a repair bill and an argument at move-out, and
 * "ask first" is what both sides would have agreed to had anyone asked.
 */
export type AlterationPolicy = 'ask_first' | 'no_alterations' | 'allowed';

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
  /**
   * Status of the enquiry this thread opened with.
   *
   * Denormalised onto the conversation so the list can show where each one
   * stands without reading an application document per row — the list is the
   * one screen that renders every thread at once, and that is exactly where
   * a per-row read hurts.
   *
   * Absent on threads that began as a plain message rather than an enquiry.
   */
  applicationStatus?: ApplicationStatus;
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
  /**
   * A Directrent employee, not a customer.
   *
   * Set by hand on the user document — there is no screen that grants it and
   * there should not be, because the whole point is that it cannot be
   * self-assigned. It unlocks the tour queue and nothing else.
   *
   * Absent on every normal account, which is the safe default: a missing field
   * is falsy, so forgetting to set it locks someone out rather than letting
   * them in.
   */
  staff?: boolean;
  /**
   * This account's current device token, for message notifications.
   *
   * Null when the user signed out or refused notifications — both mean "do not
   * send", which is why it is nulled rather than deleted: a missing field and a
   * deliberately cleared one should not have to be told apart by the sender.
   *
   * One device per account. Someone signing in on a second phone moves their
   * notifications to it, which is the behaviour people expect and avoids
   * pushing a private conversation to a handset they have lent out.
   */
  fcmToken?: string | null;
  fcmUpdatedAt?: number;
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

/**
 * Who hosts the panoramas behind a 360 tour.
 *
 * The point of naming the host is that the app never has to care which one it
 * is. Everything the tour screen needs is `embedUrl` — it loads that URL in a
 * WebView and stops thinking. Moving off Kuula to panoramas we host ourselves
 * means writing a different provider and a different URL onto the documents;
 * no screen, no navigation and no type changes downstream.
 *
 * That is deliberate. Kuula is a test, chosen because it costs nothing to try,
 * and a test we cannot walk away from is not a test.
 */
export type TourProvider = 'kuula' | 'directrent';

export interface ListingTour {
  provider: TourProvider;
  /**
   * The URL the viewer loads, embedded in the app rather than opened in a
   * browser — a tenant handed to a browser tab at the moment they are most
   * interested is a tenant who may not come back.
   */
  embedUrl: string;
  /** ISO date of the shoot, for judging whether a tour still reflects the property. */
  capturedAt?: string;
  /** uid of the staff member who attached it, so a bad link has an author. */
  attachedBy?: string;
}

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
  /**
   * The 360 tour, when one has been captured.
   *
   * Null and absent both mean no tour, and the no-tour path stays the default —
   * most listings will never have one.
   */
  tour?: ListingTour | null;
  /**
   * The owner asked for a Directrent capture and is waiting for a visit.
   *
   * Separate from `tour` because they are different states with different
   * audiences: this one is a job for operations, and it is what the staff
   * screen lists. It stays true after capture, so the request is still visible
   * as history rather than vanishing the moment the tour lands.
   */
  tourRequested?: boolean;
  /**
   * House rules. Absent on listings written before the wizard asked.
   *
   * Silence is not permission: a listing that never answered shows nothing
   * rather than implying pets are welcome.
   */
  rules?: {
    pets: PetPolicy;
    smoking: SmokingPolicy;
    alterations: AlterationPolicy;
    /**
     * Anything else the owner wants understood before somebody moves in.
     *
     * Null when the owner cleared it, because a merged write ignores undefined
     * and would leave withdrawn text published.
     */
    houseRules?: string | null;
  };
  /**
   * When the property is free, in the same words the enquiry form uses.
   *
   * Deliberately the tenant's vocabulary rather than a calendar date. An owner
   * rarely knows the exact day, a date drifts into the past and quietly makes
   * every listing look stale, and matching MoveInTiming means the owner's
   * answer and the tenant's question can be compared at a glance.
   */
  availability?: {
    from: MoveInTiming;
    minimumLeaseMonths: LeaseDuration;
  };
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
