import firestore from '@react-native-firebase/firestore';
import type { Application } from '../types/application';

export const ApplicationService = {
  getApplicationsByTenant: async (tenantId: string): Promise<Application[]> => {
    const snap = await firestore()
      .collection('applications')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  },

  getApplicationsByLandlord: async (landlordId: string): Promise<Application[]> => {
    const snap = await firestore()
      .collection('applications')
      .where('landlordId', '==', landlordId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  },

  getApplicationsByProperty: async (propertyId: string): Promise<Application[]> => {
    const snap = await firestore()
      .collection('applications')
      .where('propertyId', '==', propertyId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  },

  getApplication: async (applicationId: string): Promise<Application | null> => {
    const doc = await firestore().collection('applications').doc(applicationId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Application;
  },

  markAsViewed: async (applicationId: string): Promise<void> => {
    await firestore().collection('applications').doc(applicationId).update({
      status: 'viewed',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  },

  withdrawApplication: async (applicationId: string): Promise<void> => {
    await firestore().collection('applications').doc(applicationId).update({
      status: 'withdrawn',
      updatedAt: firestore.FieldValue.serverTimestamp(),
      timeline: firestore.FieldValue.arrayUnion({
        action: 'withdrawn',
        timestamp: firestore.Timestamp.now(),
      }),
    });
  },
};
