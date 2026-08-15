import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../lib/firebase';
import type { PaymentBreakdown } from '../lib/payment';

/**
 * Starting a payment, and finding out how it ended.
 *
 * Two halves that deliberately do not talk to each other. The app asks the
 * server to open a checkout; Paystack later tells the server, over a signed
 * webhook, whether money actually moved. The app is never the authority on
 * that — anybody can navigate to a success URL, so a screen that marked a
 * tenancy paid because the browser came back would be trivially cheatable.
 *
 * So the app watches the payment document instead and waits for the webhook to
 * change it. That also means a tenant who closes the app mid-checkout still
 * gets the right answer when they reopen it.
 */

const functions = getFunctions(getApp(), 'europe-west1');

export class PaymentError extends Error {}

export interface StartedPayment {
  reference: string;
  authorizationUrl: string;
  breakdown: PaymentBreakdown;
}

/**
 * Asks the server to open a Paystack checkout for a listing.
 *
 * Sends only the listing id. The amount is recomputed server-side from the
 * listing precisely so that nothing the phone says about money is believed —
 * a total sent from a device is a number somebody can edit, and the whole
 * proposition here is a tenant paying 2% instead of 32%.
 */
export async function startPayment(listingId: string): Promise<StartedPayment> {
  try {
    const call = httpsCallable<{ listingId: string }, StartedPayment>(
      functions,
      'initialisePayment',
    );
    const { data } = await call({ listingId });

    if (!data?.authorizationUrl || !data?.reference) {
      throw new PaymentError('Could not start the payment. Please try again.');
    }

    return data;
  } catch (e: any) {
    if (e instanceof PaymentError) throw e;
    throw new PaymentError(e?.message ?? 'Could not start the payment.');
  }
}

/** What the webhook writes onto the payment document. */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'mismatch';

/**
 * Watches one payment for the webhook's verdict.
 *
 * A listener rather than a poll: the webhook may arrive while the tenant is
 * still on Paystack's page, or minutes later on a bad connection, and either
 * way the screen should change the moment it does.
 *
 * Every listener takes an error handler. Without one a rules rejection leaves
 * the success path unrun and the screen spinning forever, which reads as a hang
 * rather than a refusal.
 */
export function watchPayment(
  reference: string,
  onStatus: (status: PaymentStatus) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, 'payments', reference),
    snapshot => {
      const status = snapshot.data()?.status as PaymentStatus | undefined;
      if (status) onStatus(status);
    },
    error => onError(error?.message ?? 'Lost track of this payment.'),
  );
}
