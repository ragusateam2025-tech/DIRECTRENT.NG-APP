import { useState, useCallback } from 'react';
import functions, { FirebaseFunctionsTypes } from '@react-native-firebase/functions';

/** Map Cloud Function error codes to user-facing messages */
function mapErrorMessage(err: unknown): string {
  const code = (err as FirebaseFunctionsTypes.HttpsError)?.code;
  switch (code) {
    case 'already-exists':
      return 'This number is linked to another account';
    case 'not-found':
      return 'Number not found, check and try again';
    case 'failed-precondition':
      return "Name on record doesn't match your profile";
    case 'unavailable':
      return 'Service temporarily unavailable';
    default:
      return err instanceof Error ? err.message : 'Verification failed';
  }
}

interface UseVerificationResult {
  verifyBvn: (bvn: string) => Promise<void>;
  verifyNin: (nin: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Hook to verify a user's BVN or NIN via Firebase Cloud Functions.
 * Maps CF error codes to localised user-facing messages.
 */
export function useVerification(): UseVerificationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const runVerification = useCallback(
    async (fnName: 'verifyBvn' | 'verifyNin', payload: Record<string, string>): Promise<void> => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const callable = functions().httpsCallable(fnName);
        await callable(payload);
        setSuccess(true);
      } catch (err) {
        setError(mapErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyBvn = useCallback(
    (bvn: string) => runVerification('verifyBvn', { bvn }),
    [runVerification]
  );

  const verifyNin = useCallback(
    (nin: string) => runVerification('verifyNin', { nin }),
    [runVerification]
  );

  return { verifyBvn, verifyNin, loading, error, success };
}
