import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

/**
 * The writing assistant, called through a Cloud Function.
 *
 * Never straight to Google. The API key lives in a Firebase secret on the
 * server, because a key in the app bundle is a key anybody can read out of an
 * APK and spend.
 *
 * Region matters and is easy to get wrong: the function is deployed to
 * europe-west1, and a client pointed at the default region gets a not-found
 * that reads like the function was never deployed.
 */
const functions = getFunctions(getApp(), 'europe-west1');

export type RefineRole = 'owner' | 'tenant';

/** Thrown with a sentence worth putting on screen. */
export class RefineError extends Error {}

/**
 * Rewrites a piece of text for the role that wrote it.
 *
 * Returns the suggestion rather than applying it. What the caller does with it
 * differs by role and that is a decision for the screen: an owner's listing
 * copy is replaced outright, while a tenant is shown the suggestion beside what
 * they wrote and chooses.
 */
export async function refineText(rawText: string, role: RefineRole): Promise<string> {
  try {
    const call = httpsCallable<{ rawText: string; role: RefineRole }, { text: string }>(
      functions,
      'refineText',
    );
    const result = await call({ rawText, role });
    const text = result.data?.text?.trim();

    if (!text) {
      throw new RefineError('Nothing came back. Your text has not been changed.');
    }

    return text;
  } catch (e: any) {
    if (e instanceof RefineError) throw e;
    // Callable errors carry the server's message, which was written to be read
    // by the person who triggered it. Anything without one gets a sentence
    // rather than a code.
    throw new RefineError(
      e?.message ?? 'The writing assistant is unavailable. Try again shortly.',
    );
  }
}
