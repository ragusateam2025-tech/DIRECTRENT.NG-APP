import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

/**
 * BE-016 / FT-026
 * FCM push notification service for the tenant app.
 */
export const NotificationService = {
  /**
   * Request permission and register FCM token with Firestore.
   * Call this after user signs in / profile is created.
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // iOS: request permission
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

  /**
   * Remove the current device token (on sign-out).
   */
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

  /**
   * Listen for token refreshes and update Firestore.
   * Returns an unsubscribe function — call in useEffect cleanup.
   */
  onTokenRefresh(): () => void {
    return messaging().onTokenRefresh(async (token) => {
      await NotificationService.saveTokenToFirestore(token);
    });
  },

  /**
   * Handle foreground messages (while app is open).
   * Returns an unsubscribe function.
   */
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

  /**
   * Set up background message handler.
   * Must be called at the top level (outside of any component).
   */
  setBackgroundMessageHandler(): void {
    messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
      // Background messages are handled by the OS notification tray.
      // Deep link navigation is handled via getInitialNotification / onNotificationOpenedApp.
    });
  },

  /**
   * Get the notification that opened the app from a quit state.
   */
  async getInitialNotification(): Promise<Record<string, string> | null> {
    const remoteMessage = await messaging().getInitialNotification();
    if (!remoteMessage) return null;
    return (remoteMessage.data ?? {}) as Record<string, string>;
  },

  /**
   * Listen for notifications that open the app from the background.
   * Returns an unsubscribe function.
   */
  onNotificationOpenedApp(
    handler: (data: Record<string, string>) => void
  ): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      handler((remoteMessage.data ?? {}) as Record<string, string>);
    });
  },
};
