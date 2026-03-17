import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * BE-016 / FL-027
 * FCM push notification service for the landlord app.
 */
export const NotificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return null;
      }

      const token = await messaging().getToken();
      await NotificationService.saveTokenToFirestore(token);
      return token;
    } catch {
      return null;
    }
  },

  async saveTokenToFirestore(token: string): Promise<void> {
    const user = auth().currentUser;
    if (!user) return;

    await firestore()
      .collection('users')
      .doc(user.uid)
      .update({
        fcmTokens: firestore.FieldValue.arrayUnion(token),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
      });
  },

  async unregisterToken(): Promise<void> {
    const user = auth().currentUser;
    if (!user) return;

    try {
      const token = await messaging().getToken();
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          fcmTokens: firestore.FieldValue.arrayRemove(token),
        });
      await messaging().deleteToken();
    } catch {
      // Silently ignore
    }
  },

  onTokenRefresh(): () => void {
    return messaging().onTokenRefresh(async (token) => {
      await NotificationService.saveTokenToFirestore(token);
    });
  },

  onForegroundMessage(
    handler: (title: string, body: string, data: Record<string, string>) => void
  ): () => void {
    return messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? '';
      const body = remoteMessage.notification?.body ?? '';
      const data = (remoteMessage.data ?? {}) as Record<string, string>;
      handler(title, body, data);
    });
  },

  setBackgroundMessageHandler(): void {
    messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
      // Handled by OS notification tray
    });
  },

  async getInitialNotification(): Promise<Record<string, string> | null> {
    const remoteMessage = await messaging().getInitialNotification();
    if (!remoteMessage) return null;
    return (remoteMessage.data ?? {}) as Record<string, string>;
  },

  onNotificationOpenedApp(
    handler: (data: Record<string, string>) => void
  ): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      handler((remoteMessage.data ?? {}) as Record<string, string>);
    });
  },
};
