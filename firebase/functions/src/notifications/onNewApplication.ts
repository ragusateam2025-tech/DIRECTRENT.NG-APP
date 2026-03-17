/**
 * Sprint 7: onNewApplication
 *
 * Firestore trigger — fires when a new document is created in applications/{applicationId}.
 * Sends a push notification to the landlord.
 */
import { firestore, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const onNewApplication = firestore.onDocumentCreated(
  'applications/{applicationId}',
  async (event) => {
    const application = event.data?.data();
    if (!application) {
      logger.warn('onNewApplication: event data is empty');
      return;
    }

    const landlordId: string = application['landlordId'];
    const tenantSnapshot = application['tenantSnapshot'] as {
      name?: string;
    } | undefined;
    const propertyId: string = application['propertyId'];

    if (!landlordId || !propertyId) {
      logger.warn('onNewApplication: missing landlordId or propertyId', {
        applicationId: event.params.applicationId,
      });
      return;
    }

    const db = admin.firestore();

    // ── Get tenant display name ──────────────────────────────────────────────
    const tenantName = tenantSnapshot?.name ?? 'A tenant';

    // ── Get property title ───────────────────────────────────────────────────
    let propertyTitle = 'your property';
    try {
      const propSnap = await db.collection('properties').doc(propertyId).get();
      if (propSnap.exists) {
        propertyTitle = (propSnap.data()?.['title'] as string | undefined) ?? propertyTitle;
      }
    } catch (err) {
      logger.warn('onNewApplication: failed to fetch property title', err);
    }

    // ── Get landlord FCM tokens ───────────────────────────────────────────────
    let fcmTokens: string[] = [];
    try {
      const landlordSnap = await db.collection('users').doc(landlordId).get();
      fcmTokens = (landlordSnap.data()?.['fcmTokens'] as string[] | undefined) ?? [];
    } catch (err) {
      logger.warn('onNewApplication: failed to fetch landlord FCM tokens', err);
      return;
    }

    if (fcmTokens.length === 0) {
      logger.info(`onNewApplication: no FCM tokens for landlord=${landlordId}`);
      return;
    }

    // ── Send notification ─────────────────────────────────────────────────────
    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: 'New Application! 📝',
        body: `${tenantName} applied for ${propertyTitle}`,
      },
      data: {
        type: 'new_application',
        applicationId: event.params.applicationId,
        propertyId,
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(
        `onNewApplication: sent to ${response.successCount}/${fcmTokens.length} devices`,
        { applicationId: event.params.applicationId }
      );
    } catch (err) {
      logger.error('onNewApplication: failed to send notification', err);
    }
  }
);
