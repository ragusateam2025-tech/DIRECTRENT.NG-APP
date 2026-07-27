import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

/** The default Firebase app, configured from google-services.json. */
export const app = getApp();

/** Auth instance — use with modular functions from @react-native-firebase/auth. */
export const auth = getAuth(app);

/** Firestore instance — use with modular functions from @react-native-firebase/firestore. */
export const db = getFirestore(app);

/** Firestore collection names, in one place so they cannot drift. */
export const COLLECTIONS = {
  users: 'users',
  listings: 'listings',
  saved: 'saved',
} as const;
