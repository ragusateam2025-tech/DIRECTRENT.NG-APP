import { useState, useEffect } from 'react';
import storage from '@react-native-firebase/storage';

interface UploadHookResult {
  upload: (uri: string, path: string) => Promise<string>;
  uploading: boolean;
  progress: number;
  error: string | null;
}

interface DownloadUrlHookResult {
  url: string | null;
  loading: boolean;
}

/**
 * Provides an `upload` function that uploads a local file URI to Firebase Storage
 * and returns the public download URL.  Tracks upload progress (0–100).
 */
export function useUpload(): UploadHookResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (uri: string, path: string): Promise<string> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const ref = storage().ref(path);
      const task = ref.putFile(uri);

      task.on('state_changed', snapshot => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(pct));
      });

      await task;
      const downloadUrl = await ref.getDownloadURL();
      setUploading(false);
      setProgress(100);
      return downloadUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      setUploading(false);
      throw err;
    }
  };

  return { upload, uploading, progress, error };
}

/**
 * Resolves the public download URL for a Firebase Storage path.
 * Pass `null` to skip the lookup.
 */
export function useDownloadUrl(path: string | null): DownloadUrlHookResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    storage()
      .ref(path)
      .getDownloadURL()
      .then(downloadUrl => {
        if (!cancelled) {
          setUrl(downloadUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { url, loading };
}
