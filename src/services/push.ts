import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

/**
 * Push notifications for messages.
 *
 * Messaging worked and nobody was told a message had arrived, which made the
 * whole loop weaker than a phone call: an owner had to open the app on the
 * chance somebody had written. This closes that.
 *
 * The device registers its own token and the send happens server-side, in a
 * Cloud Function. A phone cannot be trusted to notify arbitrary users — anyone
 * holding another person's token could push whatever they liked — so the app
 * only ever writes its own token to its own user document, which is all the
 * security rules permit it to do anyway.
 */

/**
 * How a notification behaves when it lands while the app is open.
 *
 * Shown rather than swallowed. A tenant reading one thread should still learn
 * that a different owner replied — that is the entire point — and the banner
 * is how they find out without leaving the screen they are on.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android requires a channel before anything will make a sound. */
const CHANNEL_ID = 'messages';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    // Gold, matching the app. Android tints the small icon with this.
    lightColor: '#D4A853',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export class PushUnavailable extends Error {}

export type PushStatus =
  /** Registered, and a token is on the account. */
  | 'on'
  /** Refused, or never asked. Asking again may still work. */
  | 'off'
  /** Refused permanently — only Android Settings can change it now. */
  | 'blocked'
  /** An emulator. Push cannot work here at all. */
  | 'unsupported';

/**
 * What the phone currently thinks about notifications.
 *
 * Exists because registration is deliberately non-fatal and therefore silent:
 * it is called without awaiting and its failure is swallowed, so nobody — user
 * or developer — could tell a refusal from a bug from an emulator. Somewhere
 * has to say.
 */
export async function pushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return 'unsupported';

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'granted') return 'on';
  return permission.canAskAgain ? 'off' : 'blocked';
}

/**
 * Registers this device for message notifications.
 *
 * Returns the token so a caller can tell whether registration actually
 * happened, and throws rather than returning null on the two cases worth
 * distinguishing: an emulator, which cannot receive push at all, and a refusal,
 * which is the user's decision and must not be asked again on every launch.
 *
 * The token is stored on the user's own document, merged, so it never disturbs
 * the rest of the profile. It changes when an app is reinstalled or restored to
 * a new phone, so it is written on every successful registration rather than
 * only the first.
 */
export async function registerForPush(uid: string): Promise<string> {
  if (!Device.isDevice) {
    throw new PushUnavailable('Push notifications need a real device.');
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  // Only ask when the system says asking is still possible. On Android 13+ a
  // refusal is permanent until the user changes it in Settings, and asking
  // again produces nothing but a dialog that cannot be granted.
  if (status !== 'granted' && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    throw new PushUnavailable('Notifications are turned off for Directrent.');
  }

  // The native FCM token, not an Expo push token: the sending side is our own
  // Cloud Function using firebase-admin, so the message never goes through
  // Expo's push service and does not depend on it staying free or up.
  const token = (await Notifications.getDevicePushTokenAsync()).data;

  await setDoc(
    doc(db, COLLECTIONS.users, uid),
    { fcmToken: token, fcmUpdatedAt: Date.now() },
    { merge: true },
  );

  return token;
}

/**
 * Forgets this device on logout.
 *
 * Without it the next person to sign in on this phone inherits the previous
 * account's notifications — a tenant reading an owner's messages, on a shared
 * phone, which in Lagos is not a rare situation.
 */
export async function unregisterPush(uid: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.users, uid),
    { fcmToken: null, fcmUpdatedAt: Date.now() },
    { merge: true },
  );
}
