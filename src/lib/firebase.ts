import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Re-export instances for use throughout the app
export { auth, firestore };

/**
 * Tests Firestore connectivity by writing and reading a health-check document.
 * Returns true on success, throws a descriptive error on failure.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  const docRef = firestore().collection('_health').doc('connectivity');

  await docRef.set({
    ping: 'ok',
    timestamp: firestore.FieldValue.serverTimestamp(),
  });

  const snapshot = await docRef.get();

  if (!snapshot.exists || snapshot.data()?.ping !== 'ok') {
    throw new Error(
      'Health check document was written but could not be read back correctly.'
    );
  }

  return true;
}

/**
 * Returns the Firebase project ID from the default app config.
 */
export function getProjectId(): string {
  return firebase.app().options.projectId ?? 'unknown';
}
