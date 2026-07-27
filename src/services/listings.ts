import { collection, doc, getDoc, getDocs, query, where } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Listing } from '../types';

/** Fetches all active listings. */
export async function fetchListings(): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('status.listing', '==', 'active'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Listing);
}

/** Fetches a single listing by ID, or null if it does not exist. */
export async function fetchListing(id: string): Promise<Listing | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.listings, id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Listing;
}
