import { useState, useCallback } from 'react';
import messaging from '@react-native-firebase/messaging';

interface UseNotificationsResult {
  requestPermission: () => Promise<void>;
  token: string | null;
  permissionStatus: string;
}

/**
 * Hook to request FCM notification permission and retrieve the device token.
 */
export function useNotifications(): UseNotificationsResult {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

  const requestPermission = useCallback(async (): Promise<void> => {
    const authStatus = await messaging().requestPermission();
    const statusLabel = authStatus === messaging.AuthorizationStatus.AUTHORIZED
      ? 'authorized'
      : authStatus === messaging.AuthorizationStatus.PROVISIONAL
        ? 'provisional'
        : 'denied';

    setPermissionStatus(statusLabel);

    if (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      const fcmToken = await messaging().getToken();
      setToken(fcmToken);
    }
  }, []);

  return { requestPermission, token, permissionStatus };
}
