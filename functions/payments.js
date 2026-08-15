const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

/**
 * Paystack, server-side.
 *
 * Everything here exists because a phone cannot be trusted with any of it. The
 * amount is recomputed from the listing rather than accepted from the client —
 * a total that arrives from a device is a number somebody can edit — and the
 * confirmation comes from Paystack's webhook rather than the app saying it
 * paid.
 *
 * The secret key never enters this repository or the app bundle. It lives in
 * Firebase secrets and is read at runtime:
 *
 *   npx firebase functions:secrets:set PAYSTACK_SECRET_KEY
 */
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');

/** Matches src/lib/savings.ts. Both are 2% and both must stay 2%. */
const PLATFORM_FEE_RATE = 0.02;

const PAYSTACK_API = 'https://api.paystack.co';

/**
 * The authoritative amount, from the listing rather than the request.
 *
 * Deliberately duplicates src/lib/payment.ts rather than importing it: this
 * runs on a server the client cannot reach into, and a shared module would
 * either drag React Native into the functions bundle or invite somebody to
 * "simplify" by trusting the number the app already calculated. The app's copy
 * is for display; this one decides what is charged.
 */
function calculateTotal(listing) {
  const annualRent = Math.round(listing.pricing.annualRent);
  const months = listing.pricing.cautionDepositMonths ?? 0;
  const cautionDeposit = Math.round((annualRent * months) / 12);
  const serviceCharge = Math.round(listing.pricing.serviceCharge ?? 0);
  const platformFee = Math.round(annualRent * PLATFORM_FEE_RATE);

  return {
    annualRent,
    cautionDeposit,
    serviceCharge,
    platformFee,
    total: annualRent + cautionDeposit + serviceCharge + platformFee,
  };
}

/**
 * Starts a payment and returns the page the tenant should be sent to.
 *
 * Callable rather than HTTP, so Firebase checks the caller is signed in and
 * hands us their uid — an HTTP endpoint would have to be told who is paying,
 * which is exactly the thing not to accept from a client.
 */
exports.initialisePayment = onCall(
  { region: 'europe-west1', secrets: [PAYSTACK_SECRET_KEY] },
  async request => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in before paying.');
    }

    const listingId = request.data?.listingId;
    if (typeof listingId !== 'string' || listingId.length === 0) {
      throw new HttpsError('invalid-argument', 'Which property is this for?');
    }

    const db = admin.firestore();

    const listingSnap = await db.doc(`listings/${listingId}`).get();
    const listing = listingSnap.data();
    if (!listing) {
      throw new HttpsError('not-found', 'That property no longer exists.');
    }

    if (listing.ownerId === uid) {
      // Not a security hole so much as a nonsense: paying yourself rent.
      throw new HttpsError('failed-precondition', 'This is your own property.');
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    const email = userSnap.data()?.email;
    if (!email) {
      throw new HttpsError('failed-precondition', 'Your account has no email address.');
    }

    const breakdown = calculateTotal(listing);

    // Recorded before Paystack is called, not after. If the network dies
    // mid-request the record still exists and can be reconciled; the opposite
    // order loses money silently.
    const paymentRef = db.collection('payments').doc();
    const reference = paymentRef.id;

    await paymentRef.set({
      id: reference,
      listingId,
      listingTitle: listing.basicInfo?.title ?? '',
      tenantId: uid,
      ownerId: listing.ownerId ?? null,
      breakdown,
      amount: breakdown.total,
      currency: 'NGN',
      status: 'pending',
      createdAt: Date.now(),
    });

    try {
      const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          // Paystack charges in kobo. A factor of a hundred in the wrong
          // direction is the easiest catastrophic mistake available here.
          amount: Math.round(breakdown.total * 100),
          currency: 'NGN',
          reference,
          metadata: { listingId, tenantId: uid },
        }),
      });

      const body = await response.json();

      if (!response.ok || !body.status) {
        logger.error('Paystack refused to initialise', { reference, body });
        await paymentRef.update({ status: 'failed', failedAt: Date.now() });
        throw new HttpsError('internal', 'Could not start the payment. Please try again.');
      }

      return {
        reference,
        authorizationUrl: body.data.authorization_url,
        breakdown,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('initialisePayment failed', { reference, error: String(error) });
      await paymentRef.update({ status: 'failed', failedAt: Date.now() }).catch(() => {});
      throw new HttpsError('internal', 'Could not start the payment. Please try again.');
    }
  },
);

/**
 * Paystack's own confirmation, and the only thing that marks a payment paid.
 *
 * The app returning from a checkout page proves nothing — anybody can navigate
 * to a success URL — so the client is never believed. This endpoint is public
 * because Paystack has to reach it, which is why the signature check below is
 * not optional: it is the only thing separating a real event from anyone on the
 * internet posting a payment confirmation.
 */
exports.paystackWebhook = onRequest(
  { region: 'europe-west1', secrets: [PAYSTACK_SECRET_KEY] },
  async (req, res) => {
    // Paystack signs the raw body with the secret key. rawBody is used rather
    // than a re-serialised req.body: JSON.stringify may not reproduce the exact
    // bytes that were signed, and a signature over almost-the-same bytes fails.
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY.value())
      .update(req.rawBody)
      .digest('hex');

    // Compared in constant time. `!==` returns as soon as two bytes differ, so
    // how long it takes leaks how much of a guess was correct — and this is the
    // one comparison in the app that stands directly between a stranger and a
    // tenancy marked paid. Length is checked first because timingSafeEqual
    // throws on a mismatch, and the buffers are built from the same encoding so
    // a short or absent header cannot reach it.
    const given = Buffer.from(String(signature ?? ''), 'utf8');
    const want = Buffer.from(expected, 'utf8');

    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      logger.warn('Rejected a webhook with a bad signature');
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body;

    // Answer immediately. Paystack retries anything slow or unanswered, and a
    // retry storm is worse than a late write.
    res.status(200).send('ok');

    if (event?.event !== 'charge.success') return;

    const reference = event.data?.reference;
    if (!reference) return;

    try {
      const paymentRef = admin.firestore().doc(`payments/${reference}`);
      const snap = await paymentRef.get();
      const payment = snap.data();

      if (!payment) {
        logger.warn('Webhook for a payment we have no record of', { reference });
        return;
      }

      // Already handled. Paystack delivers the same event more than once, by
      // design, and a tenancy must not be marked paid twice.
      if (payment.status === 'paid') return;

      // What Paystack says was collected, in naira, against what we asked for.
      // A mismatch means the amount was tampered with between here and there.
      const paidNaira = Math.round((event.data.amount ?? 0) / 100);
      if (paidNaira !== payment.amount) {
        logger.error('Paid amount does not match the record', {
          reference,
          expected: payment.amount,
          paid: paidNaira,
        });
        await paymentRef.update({ status: 'mismatch', paidAmount: paidNaira });
        return;
      }

      await paymentRef.update({
        status: 'paid',
        paidAt: Date.now(),
        paystackId: event.data.id ?? null,
        channel: event.data.channel ?? null,
      });

      logger.info('Payment confirmed', { reference, amount: paidNaira });
    } catch (error) {
      logger.error('Webhook handling failed', { reference, error: String(error) });
    }
  },
);
