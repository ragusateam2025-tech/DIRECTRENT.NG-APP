import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';
import { app } from '../lib/firebase';
import { compressPhoto } from '../lib/photos';

const storage = getStorage(app);

/**
 * One avatar per account, at a fixed path.
 *
 * Fixed rather than versioned so a new picture overwrites the old one instead
 * of accumulating: an account that changes its photo ten times should cost one
 * file, not ten. The download URL carries a fresh token each upload, so the
 * new image is not masked by a cached copy of the old.
 */
function avatarPath(uid: string): string {
  return `avatars/${uid}.jpg`;
}

/**
 * Compresses and uploads a profile picture, returning its download URL.
 *
 * Reuses the listing photo compression: an avatar renders at 96px at most, so
 * a raw camera frame is thousands of times more data than the screen can show,
 * and on Lagos mobile data that difference is the upload finishing or not.
 */
export async function uploadAvatar(
  uid: string,
  localUri: string,
  width: number,
  height: number,
): Promise<string> {
  const compressed = await compressPhoto(localUri, width, height);
  const storageRef = ref(storage, avatarPath(uid));

  await putFile(storageRef, compressed.uri, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/** Removes the stored picture. Falling back to initials is the empty state. */
export async function deleteAvatar(uid: string): Promise<void> {
  try {
    await deleteObject(ref(storage, avatarPath(uid)));
  } catch {
    // Already gone is the desired end state, so a missing object is not an error.
  }
}
