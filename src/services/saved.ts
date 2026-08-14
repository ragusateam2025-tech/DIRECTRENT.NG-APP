import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { recordListingSave } from './analytics';

/** Saved listings live at users/{uid}/saved/{listingId}. */
function savedDoc(uid: string, listingId: string) {
  return doc(db, COLLECTIONS.users, uid, COLLECTIONS.saved, listingId);
}

export async function isSaved(uid: string, listingId: string): Promise<boolean> {
  const snapshot = await getDoc(savedDoc(uid, listingId));
  return snapshot.exists();
}

/** Toggles saved state. Returns the new state. */
/**
 * Mirrored onto the listing so the owner can count saves.
 *
 * The tenant's own list lives under their user document, which no owner may
 * read — quite rightly, since it is a record of everywhere they are looking.
 * The mirror says only "one person saved this property", which is the part the
 * owner has a reason to know.
 */
export async function toggleSaved(uid: string, listingId: string): Promise<boolean> {
  const ref = savedDoc(uid, listingId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    await deleteDoc(ref);
    // Never allowed to fail the save itself. The tenant's list is the record
    // that matters; the owner's count is a courtesy.
    await recordListingSave(listingId, uid, false).catch(() => {});
    return false;
  }

  await setDoc(ref, { savedAt: Date.now() });
  await recordListingSave(listingId, uid, true).catch(() => {});
  return true;
}

/** Returns the listing IDs this user has saved. */
export async function fetchSavedIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.users, uid, COLLECTIONS.saved));
  return snapshot.docs.map(d => d.id);
}
