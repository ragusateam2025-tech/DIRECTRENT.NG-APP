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

export async function submitApplication(
  listing: Listing,
  tenant: UserProfile,
  draft: ApplicationDraft,
): Promise<void> {
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

export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.applications, id), { status });
}
