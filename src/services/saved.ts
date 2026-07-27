import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

/** Saved listings live at users/{uid}/saved/{listingId}. */
function savedDoc(uid: string, listingId: string) {
  return doc(db, COLLECTIONS.users, uid, COLLECTIONS.saved, listingId);
}

export async function isSaved(uid: string, listingId: string): Promise<boolean> {
  const snapshot = await getDoc(savedDoc(uid, listingId));
  return snapshot.exists();
}

/** Toggles saved state. Returns the new state. */
export async function toggleSaved(uid: string, listingId: string): Promise<boolean> {
  const ref = savedDoc(uid, listingId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    await deleteDoc(ref);
    return false;
  }

  await setDoc(ref, { savedAt: Date.now() });
  return true;
}

/** Returns the listing IDs this user has saved. */
export async function fetchSavedIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.users, uid, COLLECTIONS.saved));
  return snapshot.docs.map(d => d.id);
}
