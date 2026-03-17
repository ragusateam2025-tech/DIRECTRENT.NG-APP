import firestore from '@react-native-firebase/firestore';
import type { Review } from '../types/review';

const COLLECTION = 'reviews';

export class ReviewService {
  static async getReviewsByReviewee(revieweeId: string): Promise<Review[]> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('revieweeId', '==', revieweeId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
  }

  static async getReviewsByProperty(propertyId: string): Promise<Review[]> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('propertyId', '==', propertyId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
  }

  static async getReviewByLease(leaseId: string, reviewerId: string): Promise<Review | null> {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('leaseId', '==', leaseId)
      .where('reviewerId', '==', reviewerId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Review;
  }
}
