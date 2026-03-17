import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface RespondToApplicationData {
  applicationId: string;
  action: 'accept' | 'reject';
  message?: string;
}

interface ApplicationDoc {
  landlordId: string;
  tenantId: string;
  propertyId: string;
  status: string;
}

export const respondToApplication = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const uid = request.auth.uid;
    const data = request.data as RespondToApplicationData;

    // 2. Validate input
    if (!data.applicationId || typeof data.applicationId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'applicationId is required');
    }
    if (data.action !== 'accept' && data.action !== 'reject') {
      throw new https.HttpsError('invalid-argument', 'action must be accept or reject');
    }
    if (data.message !== undefined && typeof data.message !== 'string') {
      throw new https.HttpsError('invalid-argument', 'message must be a string if provided');
    }

    const db = admin.firestore();

    // 3. Load application doc
    const applicationRef = db.collection('applications').doc(data.applicationId);
    const applicationSnap = await applicationRef.get();
    if (!applicationSnap.exists) {
      throw new https.HttpsError('not-found', 'Application not found');
    }
    const applicationData = applicationSnap.data() as ApplicationDoc;

    // 4. Verify caller is the landlord
    if (applicationData.landlordId !== uid) {
      throw new https.HttpsError(
        'permission-denied',
        'Only the listing landlord can respond to this application',
      );
    }

    // 5. Verify current status is pending or viewed
    if (applicationData.status !== 'pending' && applicationData.status !== 'viewed') {
      throw new https.HttpsError(
        'failed-precondition',
        'Application already processed',
      );
    }

    // 6. Batch write
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    const newStatus = data.action === 'accept' ? 'accepted' : 'rejected';
    const timelineAction = data.action === 'accept' ? 'accepted' : 'rejected';

    batch.update(applicationRef, {
      status: newStatus,
      updatedAt: now,
      timeline: admin.firestore.FieldValue.arrayUnion({
        action: timelineAction,
        timestamp: now,
        actor: uid,
        note: data.message ?? null,
      }),
    });

    if (data.action === 'accept') {
      const propertyRef = db.collection('properties').doc(applicationData.propertyId);
      batch.update(propertyRef, {
        'status.availability': 'pending',
      });
    }

    await batch.commit();

    // 7. Return result
    return { success: true };
  },
);
