const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Storage-triggered photo enhancement. Kept in its own file because it shares
// nothing with messaging beyond the admin app.
exports.enhanceListingPhoto = require('./enhancePhoto').enhanceListingPhoto;

/**
 * Server-side work for Directrent.
 *
 * Everything here exists because a phone cannot be trusted to do it. Sending a
 * notification means writing to somebody else's device; doing that from the app
 * would mean any client holding a token could push whatever it liked to whoever
 * it liked.
 *
 * Written in plain JavaScript rather than TypeScript on purpose: this deploys
 * on its own schedule, and a second build pipeline to keep in step with the app
 * buys nothing at this size.
 */

/** Kept short. A notification is a tap target, not a reading experience. */
const PREVIEW_LENGTH = 120;

function preview(text) {
  if (typeof text !== 'string') return 'New message';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'New message';
  return trimmed.length > PREVIEW_LENGTH
    ? `${trimmed.slice(0, PREVIEW_LENGTH - 1)}…`
    : trimmed;
}

/**
 * Tells the other participant when a message is written.
 *
 * Triggered on the message rather than on the conversation summary, because the
 * summary is also updated for things that are not new messages — an enquiry
 * being accepted, an unread count being cleared — and none of those should buzz
 * somebody's phone.
 *
 * Failures are logged and swallowed. A notification that cannot be delivered
 * must never fail the write that caused it: the message itself is already saved
 * and visible in the app, and throwing here would only produce retries that
 * deliver the same notification twice.
 */
exports.notifyOnMessage = onDocumentCreated(
  {
    document: 'conversations/{conversationId}/messages/{messageId}',
    region: 'europe-west1',
  },
  async event => {
    const message = event.data?.data();
    if (!message) return;

    const { conversationId } = event.params;

    try {
      const conversationSnap = await admin
        .firestore()
        .doc(`conversations/${conversationId}`)
        .get();

      const conversation = conversationSnap.data();
      if (!conversation) {
        logger.warn('Message in a conversation that does not exist', { conversationId });
        return;
      }

      // Everyone in the thread except whoever just spoke. Written as a filter
      // rather than "the other one" so it still holds if a conversation ever
      // has more than two people in it.
      const recipients = (conversation.participants || []).filter(
        uid => uid !== message.senderId,
      );

      if (recipients.length === 0) return;

      const senderName =
        message.senderId === conversation.landlordId
          ? conversation.landlordName
          : conversation.tenantName;

      const tokens = [];
      for (const uid of recipients) {
        const userSnap = await admin.firestore().doc(`users/${uid}`).get();
        const token = userSnap.data()?.fcmToken;
        // Absent or null both mean do not send: signed out, or notifications
        // refused. Neither is an error worth logging on every message.
        if (token) tokens.push({ uid, token });
      }

      if (tokens.length === 0) return;

      await Promise.all(
        tokens.map(async ({ uid, token }) => {
          try {
            await admin.messaging().send({
              token,
              notification: {
                title: senderName || 'New message',
                body:
                  message.type === 'call'
                    ? 'Missed call'
                    : preview(message.text),
              },
              data: {
                // What the app needs to open the right thread when tapped.
                conversationId,
                listingTitle: conversation.listingTitle || '',
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'messages',
                  color: '#D4A853',
                },
              },
            });
          } catch (error) {
            // An unregistered token means the app was uninstalled or the token
            // rotated. Clearing it stops us retrying a dead address on every
            // future message.
            const code = error?.errorInfo?.code || error?.code;
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              await admin
                .firestore()
                .doc(`users/${uid}`)
                .set({ fcmToken: null }, { merge: true });
              logger.info('Cleared a dead push token', { uid });
            } else {
              logger.error('Could not send a notification', { uid, code });
            }
          }
        }),
      );
    } catch (error) {
      logger.error('notifyOnMessage failed', { conversationId, error: String(error) });
    }
  },
);
