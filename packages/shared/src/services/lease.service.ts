import firestore from '@react-native-firebase/firestore';
import type { Lease } from '../types/lease';

const COLLECTION = 'leases';

export class LeaseService {
  static async getLeaseByApplication(applicationId: string): Promise<Lease | null> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('applicationId', '==', applicationId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Lease;
  }

  static async getLeaseById(leaseId: string): Promise<Lease | null> {
    const doc = await firestore().collection(COLLECTION).doc(leaseId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Lease;
  }

  static async getLeasesByTenant(tenantId: string): Promise<Lease[]> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
  }

  static async getLeasesByLandlord(landlordId: string): Promise<Lease[]> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('landlordId', '==', landlordId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
  }

  static subscribeToLease(
    leaseId: string,
    onUpdate: (lease: Lease | null) => void
  ): () => void {
    return firestore()
      .collection(COLLECTION)
      .doc(leaseId)
      .onSnapshot(doc => {
        if (!doc.exists) {
          onUpdate(null);
        } else {
          onUpdate({ id: doc.id, ...doc.data() } as Lease);
        }
      });
  }
}
