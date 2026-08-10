import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import {
  ensureConversationFromApplication,
  sendMessage,
  setConversationApplicationStatus,
} from './messages';
import type {
  Application,
  ApplicationStatus,
  LeaseDuration,
  Listing,
  MoveInTiming,
  UserProfile,
} from '../types';

export const MOVE_IN_LABELS: Record<MoveInTiming, string> = {
  asap: 'As soon as possible',
  within_month: 'Within a month',
  one_to_three_months: 'In one to three months',
  flexible: 'Flexible',
};

export const LEASE_LABELS: Record<LeaseDuration, string> = {
  6: '6 months',
  12: '1 year',
  24: '2 years',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Awaiting reply',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

export interface ApplicationDraft {
  moveIn: MoveInTiming;
  leaseMonths: LeaseDuration;
  occupants: number;
  message: string;
}

/**
 * One application per tenant per listing.
 *
 * Using a composite ID rather than a generated one makes re-applying overwrite
 * instead of creating duplicates, which is what an owner would otherwise see
 * if a tenant tapped Apply twice on a slow connection.
 */
export function applicationId(listingId: string, tenantId: string): string {
  return `${listingId}_${tenantId}`;
}

/**
 * Records an enquiry and opens the conversation it belongs to.
 *
 * These used to be separate: an enquiry landed in one tab and a message in
 * another, so a tenant introduced themselves in a form and then introduced
 * themselves again in a chat, and an owner read the same person twice in two
 * places. They were never two things — an enquiry is the first message.
 *
 * So the answers are posted into the thread as that first message, written by
 * the tenant, and everything after it is an ordinary conversation.
 *
 * Returns the conversation id so the caller can go straight there. Landing a
 * tenant back on the listing they just enquired about leaves them with nothing
 * to do and no sign anything happened.
 */
export async function submitApplication(
  listing: Listing,
  tenant: UserProfile,
  draft: ApplicationDraft,
): Promise<string> {
  const id = applicationId(listing.id, tenant.uid);

  const application: Application = {
    id,
    listingId: listing.id,
    landlordId: listing.ownerId,
    tenantId: tenant.uid,
    tenantName: tenant.fullName,
    tenantEmail: tenant.email,
    listingTitle: listing.basicInfo.title,
    listingArea: listing.location.area,
    annualRent: listing.pricing.annualRent,
    moveIn: draft.moveIn,
    leaseMonths: draft.leaseMonths,
    occupants: draft.occupants,
    message: draft.message.trim(),
    status: 'pending',
    createdAt: Date.now(),
  };

  await setDoc(doc(db, COLLECTIONS.applications, id), application);

  const conversation = await ensureConversationFromApplication(
    application,
    listing.ownerName ?? 'Property owner',
  );

  await sendMessage(conversation, tenant.uid, enquirySummary(application));

  return conversation.id;
}

/**
 * Turns the form answers into the message the owner actually reads.
 *
 * The answers lead and the tenant's own words close it, because an owner
 * scanning a thread wants the facts — when, how long, how many — before the
 * pitch. Written as a sentence rather than a labelled block: it has to look
 * like something a person sent, not a form submission pasted into a chat.
 */
function enquirySummary(application: Application): string {
  const when = MOVE_IN_LABELS[application.moveIn].toLowerCase();
  const term = LEASE_LABELS[application.leaseMonths].toLowerCase();
  const people = application.occupants === 1 ? '1 occupant' : `${application.occupants} occupants`;

  const opening =
    `Hello — I am interested in ${application.listingTitle}. ` +
    `Looking to move in ${when}, for ${term}, with ${people}.`;

  return application.message ? `${opening}\n\n${application.message}` : opening;
}

/** Applications this tenant has sent, newest first. */
export async function fetchMyApplications(tenantId: string): Promise<Application[]> {
  const q = query(collection(db, COLLECTIONS.applications), where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(d => d.data() as Application)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Applications received on this owner's properties, newest first. */
export async function fetchReceivedApplications(landlordId: string): Promise<Application[]> {
  const q = query(
    collection(db, COLLECTIONS.applications),
    where('landlordId', '==', landlordId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(d => d.data() as Application)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Whether this tenant has already applied, so the button can say so. */
export async function hasApplied(listingId: string, tenantId: string): Promise<boolean> {
  const applications = await fetchMyApplications(tenantId);
  return applications.some(a => a.listingId === listingId && a.status !== 'withdrawn');
}

/**
 * Accepts or declines an enquiry, and tells its thread.
 *
 * The application id and the conversation id are built from the same two
 * values — listing and tenant — so the thread is derivable rather than stored,
 * and the two cannot point at each other wrongly.
 *
 * The conversation write is allowed to fail without failing the decision. An
 * owner who tapped Accept has accepted; a stale badge on a thread is a smaller
 * problem than an error message telling them it did not work when it did.
 */
export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.applications, id), { status });
  await setConversationApplicationStatus(id, status).catch(() => {});
}
