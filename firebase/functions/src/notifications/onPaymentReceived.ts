/**
 * Sprint 7: onPaymentCompleted
 *
 * Firestore trigger — fires when a payment document's status is updated to 'completed'.
 * Sends a push notification to the landlord.
 */
import { firestore, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const onPaymentCompleted = firestore.onDocumentUpdated(
  'payments/{paymentId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    // Only trigger on status change to 'completed'
    if (before['status'] === 'completed' || after['status'] !== 'completed') {
      return;
    }

    const landlordId: string = after['landlordId'];
    const propertyId: string = after['propertyId'];
    const breakdown = after['breakdown'] as { total?: number } | undefined;
    const totalAmount: number = breakdown?.total ?? 0;

    if (!landlordId) {
      logger.warn('onPaymentCompleted: missing landlordId', {
        paymentId: event.params.paymentId,
      });
      return;
    }

    const db = admin.firestore();

    // ── Get property title ───────────────────────────────────────────────────
    let propertyTitle = 'your property';
    if (propertyId) {
      try {
        const propSnap = await db.collection('properties').doc(propertyId).get();
        if (propSnap.exists) {
          propertyTitle =
            (propSnap.data()?.['title'] as string | undefined) ?? propertyTitle;
        }
      } catch {
        // non-critical
      }
    }

    // ── Format amount ────────────────────────────────────────────────────────
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(totalAmount);

    // ── Get landlord FCM tokens ───────────────────────────────────────────────
    let fcmTokens: string[] = [];
    try {
      const landlordSnap = await db.collection('users').doc(landlordId).get();
      fcmTokens = (landlordSnap.data()?.['fcmTokens'] as string[] | undefined) ?? [];
    } catch (err) {
      logger.warn('onPaymentCompleted: failed to fetch landlord FCM tokens', err);
      return;
    }

    if (fcmTokens.length === 0) {
      logger.info(`onPaymentCompleted: no FCM tokens for landlord=${landlordId}`);
      return;
    }

    // ── Send notification ─────────────────────────────────────────────────────
    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: 'Payment Received! 💰',
        body: `${formattedAmount} received for ${propertyTitle}`,
      },
      data: {
        type: 'payment_received',
        paymentId: event.params.paymentId,
        amount: String(totalAmount),
        propertyId: propertyId ?? '',
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(
        `onPaymentCompleted: sent to ${response.successCount}/${fcmTokens.length} devices`,
        { paymentId: event.params.paymentId, amount: totalAmount }
      );
    } catch (err) {
      logger.error('onPaymentCompleted: failed to send notification', err);
    }
  }
);
