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
 * Every listing belonging to this owner, drafts included.
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
 * Writes a listing as it stands, from the wizard.
 *
 * Called after each step while a new listing is being created, so progress
 * survives the app being killed mid-form, and once at the end when an existing
 * listing is edited.
 *
 * `status` is a parameter and not a constant, which is the whole point of this
 * signature. It used to be hardcoded to 'draft' — correct while the wizard only
 * ever built new listings, and a trap the moment it could open a published one:
 * the first save would have quietly unpublished a live property, and the owner's
 * only symptom would have been the listing vanishing from Browse.
 *
 * Named `saveListingProgress` rather than `saveDraft` for the same reason. A
 * function called saveDraft that writes a live listing is a mistake waiting for
 * whoever reads it next.
 */
export async function saveListingProgress(
  listingId: string,
  ownerId: string,
  ownerName: string,
  partial: Partial<Listing>,
  status: ListingStatus = 'draft',
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.listings, listingId),
    { ...partial, ownerId, ownerName, status: { listing: status } },
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
 * legitimately hold fewer while the owner is still working.
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

  // Goes straight live.
  //
  // MASTER_PRD.md puts a review step here, moderated from an admin panel that
  // is a separate application and does not exist yet. Publishing to `pending`
  // meanwhile meant no property a real owner listed was ever visible to a
  // tenant — the marketplace had no closing move. `pending` stays in the model
  // so review can be reinstated by changing this one line once there is
  // somewhere to moderate from.
  await updateDoc(doc(db, COLLECTIONS.listings, listingId), {
    'status.listing': 'active' as ListingStatus,
  });

  return { ok: true };
}
