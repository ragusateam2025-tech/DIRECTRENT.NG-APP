import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
  deleteObject,
  listAll,
} from '@react-native-firebase/storage';
import { db, app, COLLECTIONS } from '../lib/firebase';
import { compressPhoto } from '../lib/photos';
import type { Listing, LandlordListing, ListingStatus } from '../types';

const storage = getStorage(app);

/** Minimum photos before a listing may be published. */
export const MIN_PHOTOS = 5;

/**
 * Reserves a document ID before the wizard starts.
 *
 * Photos need somewhere to live from the first step, and a draft needs an
 * identity before it has any content. Generating the ID up front means an
 * upload can never be orphaned by the listing not existing yet.
 */
export function newListingId(): string {
  return doc(collection(db, COLLECTIONS.listings)).id;
}

/**
 * Every listing belonging to this landlord, drafts included.
 *
 * Returns LandlordListing rather than Listing: a draft genuinely lacks most
 * fields, and casting it to Listing would tell the type system a lie it cannot
 * check — which is exactly how `media` being undefined reached the screen.
 */
export async function fetchMyListings(ownerId: string): Promise<LandlordListing[]> {
  const q = query(collection(db, COLLECTIONS.listings), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as LandlordListing);
}

/**
 * Writes the draft as it stands. Called after each wizard step so progress
 * survives the app being killed mid-form.
 */
export async function saveDraft(
  listingId: string,
  ownerId: string,
  partial: Partial<Listing>,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.listings, listingId),
    { ...partial, ownerId, status: { listing: 'draft' as ListingStatus } },
    { merge: true },
  );
}

/**
 * Compresses a photo and uploads it, returning its download URL.
 *
 * The caller appends the URL to the draft immediately, so an app killed
 * mid-upload loses at most the photo in flight.
 */
export async function uploadPhoto(
  ownerId: string,
  listingId: string,
  index: number,
  localUri: string,
  width: number,
  height: number,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const compressed = await compressPhoto(localUri, width, height);
  const path = `listings/${ownerId}/${listingId}/${index}.jpg`;
  const storageRef = ref(storage, path);

  const task = putFile(storageRef, compressed.uri, { contentType: 'image/jpeg' });

  if (onProgress) {
    task.on('state_changed', snapshot => {
      if (snapshot.totalBytes > 0) {
        onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
      }
    });
  }

  await task;
  return getDownloadURL(storageRef);
}

/** Removes a single uploaded photo. Missing objects are not an error. */
export async function deletePhoto(
  ownerId: string,
  listingId: string,
  index: number,
): Promise<void> {
  try {
    await deleteObject(ref(storage, `listings/${ownerId}/${listingId}/${index}.jpg`));
  } catch {
    // Already gone, which is the state we wanted.
  }
}

/**
 * Discards a draft and everything uploaded for it.
 *
 * Deleting the document alone would leave the photographs paid for and
 * unreachable, so storage is cleared first.
 */
export async function discardDraft(ownerId: string, listingId: string): Promise<void> {
  try {
    const folder = await listAll(ref(storage, `listings/${ownerId}/${listingId}`));
    await Promise.all(folder.items.map(item => deleteObject(item).catch(() => {})));
  } catch {
    // No uploads yet, or storage unreachable — the document still goes.
  }

  await deleteDoc(doc(db, COLLECTIONS.listings, listingId));
}

export interface PublishResult {
  ok: boolean;
  /** Human-readable reason when ok is false. */
  reason?: string;
}

/**
 * Submits a draft for review.
 *
 * Publishing — not saving — is what enforces the photo minimum, so a draft may
 * legitimately hold fewer while the landlord is still working.
 */
export async function publishListing(
  listingId: string,
  listing: Partial<Listing>,
): Promise<PublishResult> {
  const photos = listing.media?.photos ?? [];

  if (photos.length < MIN_PHOTOS) {
    return {
      ok: false,
      reason: `Add at least ${MIN_PHOTOS} photos before publishing. You have ${photos.length}.`,
    };
  }

  if (!listing.basicInfo?.title || listing.basicInfo.title.trim().length < 10) {
    return { ok: false, reason: 'Give the property a title of at least 10 characters.' };
  }

  if (!listing.pricing?.annualRent || listing.pricing.annualRent <= 0) {
    return { ok: false, reason: 'Set an annual rent.' };
  }

  await updateDoc(doc(db, COLLECTIONS.listings, listingId), {
    'status.listing': 'pending' as ListingStatus,
  });

  return { ok: true };
}
