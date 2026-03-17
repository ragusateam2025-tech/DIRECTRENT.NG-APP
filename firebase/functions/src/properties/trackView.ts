import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

/**
 * Callable function: Increment view count for a property
 * Called when a tenant opens a property detail screen
 */
export const trackView = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { propertyId } = request.data as { propertyId?: string };

    if (!propertyId || typeof propertyId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'propertyId is required');
    }

    const db = admin.firestore();
    const propertyRef = db.collection('properties').doc(propertyId);
    const propertyDoc = await propertyRef.get();

    if (!propertyDoc.exists) {
      throw new https.HttpsError('not-found', 'Property not found');
    }

    await propertyRef.update({
      'analytics.viewCount': admin.firestore.FieldValue.increment(1),
      'analytics.lastViewedAt': admin.firestore.Timestamp.now(),
    });

    return { success: true };
  }
);
