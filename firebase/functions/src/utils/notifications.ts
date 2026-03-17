/**
 * Push notification helper
 * Looks up a user's FCM tokens and sends via Firebase Cloud Messaging.
 * Silently removes stale/invalid tokens.
 */
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to all registered devices of a user.
 * Invalid tokens are cleaned up automatically.
 */
export async function sendPushNotification(
  uid: string,
  payload: PushPayload
): Promise<void> {
  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return;

  const tokens: string[] = userSnap.data()?.['fcmTokens'] ?? [];
  if (tokens.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: { sound: 'default' },
    },
    apns: {
      payload: { aps: { sound: 'default' } },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Remove tokens that are no longer valid
  const stalePaths: string[] = [];
  response.responses.forEach((r, i) => {
    if (
      !r.success &&
      (r.error?.code === 'messaging/invalid-registration-token' ||
        r.error?.code === 'messaging/registration-token-not-registered')
    ) {
      stalePaths.push(tokens[i] as string);
    }
  });

  if (stalePaths.length > 0) {
    await db.collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...stalePaths),
    });
    logger.info(`Removed ${stalePaths.length} stale FCM token(s) for uid=${uid}`);
  }
}
