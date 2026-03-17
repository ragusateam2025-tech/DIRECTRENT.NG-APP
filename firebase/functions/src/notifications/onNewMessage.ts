/**
 * Sprint 7: onNewMessage
 *
 * Firestore trigger — fires when a new message is created in
 * conversations/{conversationId}/messages/{messageId}.
 * Sends a push notification to the recipient.
 */
import { firestore, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const onNewMessage = firestore.onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data();
    if (!message) {
      logger.warn('onNewMessage: event data is empty');
      return;
    }

    const senderId: string = message['senderId'];
    const senderType: string = message['senderType']; // 'landlord' | 'tenant'
    const conversationId: string = event.params.conversationId;

    // ── Determine recipient ──────────────────────────────────────────────────
    const db = admin.firestore();

    let recipientId: string | undefined;
    let senderName = 'Someone';

    try {
      const convSnap = await db.collection('conversations').doc(conversationId).get();
      if (!convSnap.exists) {
        logger.warn(`onNewMessage: conversation ${conversationId} not found`);
        return;
      }
      const conv = convSnap.data()!;

      // Recipient is the other participant
      recipientId =
        senderType === 'tenant'
          ? (conv['landlordId'] as string)
          : (conv['tenantId'] as string);
    } catch (err) {
      logger.warn('onNewMessage: failed to fetch conversation', err);
      return;
    }

    if (!recipientId) return;

    // ── Get sender display name ───────────────────────────────────────────────
    try {
      const senderSnap = await db.collection('users').doc(senderId).get();
      const data = senderSnap.data();
      if (data) {
        senderName =
          `${data['firstName'] ?? ''} ${data['lastName'] ?? ''}`.trim() || 'Someone';
      }
    } catch {
      // non-critical
    }

    // ── Get recipient FCM tokens ──────────────────────────────────────────────
    let fcmTokens: string[] = [];
    try {
      const recipientSnap = await db.collection('users').doc(recipientId).get();
      fcmTokens = (recipientSnap.data()?.['fcmTokens'] as string[] | undefined) ?? [];
    } catch (err) {
      logger.warn('onNewMessage: failed to fetch recipient FCM tokens', err);
      return;
    }

    if (fcmTokens.length === 0) {
      logger.info(`onNewMessage: no FCM tokens for recipient=${recipientId}`);
      return;
    }

    // ── Build notification body ───────────────────────────────────────────────
    const rawText: string = (message['content']?.['text'] as string | undefined) ?? '';
    const bodyPreview = rawText.length > 100 ? `${rawText.slice(0, 97)}...` : rawText;
    const notificationBody = bodyPreview || '📷 Sent an attachment';

    // ── Send notification ─────────────────────────────────────────────────────
    const fcmMessage: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: `New message from ${senderName}`,
        body: notificationBody,
      },
      data: {
        type: 'new_message',
        conversationId,
        messageId: event.params.messageId,
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(fcmMessage);
      logger.info(
        `onNewMessage: sent to ${response.successCount}/${fcmTokens.length} devices`,
        { conversationId, messageId: event.params.messageId }
      );
    } catch (err) {
      logger.error('onNewMessage: failed to send notification', err);
    }
  }
);
