/**
 * PAY-002: paystackWebhook
 *
 * HTTPS Request (not callable) — receives events from Paystack.
 * Signature is verified with HMAC-SHA512 before any processing.
 *
 * Handled events:
 *   charge.success  → Completes payment, creates lease, notifies both parties
 *   transfer.success / transfer.failed → Updates landlord payout status
 *   refund.processed → Marks payment refunded
 *
 * PRD ref: §2.1.4 — paystackWebhook
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { createHmac } from 'crypto';
import { sendPushNotification } from '../utils/notifications';
import { formatCurrency, addDays, addYears } from '../utils/currency';

const FieldValue = admin.firestore.FieldValue;

// ─── Function ─────────────────────────────────────────────────────────────────

export const paystackWebhook = https.onRequest(
  {
    secrets: ['PAYSTACK_SECRET_KEY'],
    timeoutSeconds: 60,
  },
  async (req, res) => {
    // ── 1. Only accept POST ─────────────────────────────────────────────────
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── 2. Verify Paystack HMAC-SHA512 signature ────────────────────────────
    const secretKey = process.env['PAYSTACK_SECRET_KEY'];
    if (!secretKey) {
      logger.error('PAYSTACK_SECRET_KEY not configured');
      res.status(500).send('Server configuration error');
      return;
    }

    const expectedSig = createHmac('sha512', secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const receivedSig = req.headers['x-paystack-signature'] as string | undefined;
    if (!receivedSig || expectedSig !== receivedSig) {
      logger.warn('Invalid Paystack webhook signature');
      res.status(401).send('Unauthorized');
      return;
    }

    const event = req.body as { event: string; data: Record<string, unknown> };
    logger.info('Paystack webhook received', { event: event.event });

    try {
      switch (event.event) {
        case 'charge.success':
          await handleChargeSuccess(event.data);
          break;
        case 'transfer.success':
          await handleTransferSuccess(event.data);
          break;
        case 'transfer.failed':
          await handleTransferFailed(event.data);
          break;
        case 'refund.processed':
          await handleRefund(event.data);
          break;
        default:
          logger.info('Unhandled Paystack event', { event: event.event });
      }

      res.status(200).send('OK');
    } catch (err: unknown) {
      logger.error('Webhook processing error', err);
      // Return 200 so Paystack does not keep retrying a non-retriable error.
      // For retriable errors (DB unavailable) we return 500.
      res.status(500).send('Processing error');
    }
  }
);

// ─── charge.success ───────────────────────────────────────────────────────────

async function handleChargeSuccess(data: Record<string, unknown>): Promise<void> {
  const reference = data['reference'] as string;
  const amount    = data['amount'] as number;      // Kobo
  const channel   = data['channel'] as string;
  const paid_at   = data['paid_at'] as string;
  const metadata  = (data['metadata'] ?? {}) as Record<string, unknown>;
  const psId      = data['id'] as number | undefined;

  const db          = admin.firestore();
  const paymentRef  = db.collection('payments').doc(reference);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    logger.error(`Payment record not found: reference=${reference}`);
    return;
  }

  const payment = paymentSnap.data()!;

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (payment['status'] === 'completed') {
    logger.info(`Payment already processed: reference=${reference}`);
    return;
  }

  // ── Amount verification ───────────────────────────────────────────────────
  const expectedKobo = (payment['breakdown'] as { total: number }).total * 100;
  if (amount !== expectedKobo) {
    logger.error(
      `Amount mismatch on reference=${reference}: expected=${expectedKobo}, received=${amount}`
    );
    await paymentRef.update({
      status: 'amount_mismatch',
      'paystack.receivedAmountKobo': amount,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return;
  }

  const now              = admin.firestore.Timestamp.now();
  const escrowRelease    = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const leaseStart       = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const leaseEnd         = admin.firestore.Timestamp.fromDate(addYears(new Date(), 1));

  const tenantId         = payment['tenantId'] as string;
  const landlordId       = payment['landlordId'] as string;
  const propertyId       = payment['propertyId'] as string;
  const applicationId    = payment['applicationId'] as string;
  const breakdown        = payment['breakdown'] as {
    annualRent: number;
    cautionDeposit: number;
    serviceCharge: number;
  };

  const batch = db.batch();

  // ── 1. Mark payment completed ─────────────────────────────────────────────
  batch.update(paymentRef, {
    status: 'completed',
    paidAt: admin.firestore.Timestamp.fromDate(new Date(paid_at)),
    'paystack.channel': channel,
    'paystack.transactionId': psId ?? null,
    escrow: {
      status: 'held',
      amount: breakdown.cautionDeposit,
      heldAt: now,
      releaseDate: escrowRelease,
    },
    updatedAt: now,
  });

  // ── 2. Create lease record ────────────────────────────────────────────────
  const leaseRef = db.collection('leases').doc();
  batch.set(leaseRef, {
    id: leaseRef.id,
    propertyId,
    landlordId,
    tenantId,
    applicationId,
    paymentId: reference,

    terms: {
      startDate: leaseStart,
      endDate: leaseEnd,
      durationMonths: 12,
      annualRent: breakdown.annualRent,
      paymentFrequency: 'annually',
      cautionDeposit: breakdown.cautionDeposit,
      serviceCharge: breakdown.serviceCharge,
    },

    documents: {
      leaseAgreement: null,
      signedByLandlord: false,
      signedByTenant: false,
    },

    status: 'pending_signature',

    createdAt: now,
    updatedAt: now,
  });

  // ── 3. Mark property as rented ────────────────────────────────────────────
  batch.update(db.collection('properties').doc(propertyId), {
    'status.listing': 'rented',
    'availability.status': 'rented',
    currentTenant: {
      tenantId,
      leaseId: leaseRef.id,
      leaseStartDate: leaseStart,
      leaseEndDate: leaseEnd,
    },
    updatedAt: now,
  });

  // ── 4. Complete the application ───────────────────────────────────────────
  batch.update(db.collection('applications').doc(applicationId), {
    status: 'completed',
    timeline: FieldValue.arrayUnion({
      action: 'payment_completed',
      timestamp: now,
      note: `Payment of ${formatCurrency(amount / 100)} received`,
    }),
    updatedAt: now,
  });

  // ── 5. Link lease to tenant ───────────────────────────────────────────────
  batch.update(db.collection('tenants').doc(tenantId), {
    activeLeases: FieldValue.arrayUnion(leaseRef.id),
    updatedAt: now,
  });

  // ── 6. Update landlord portfolio ──────────────────────────────────────────
  batch.update(db.collection('landlords').doc(landlordId), {
    'portfolio.occupiedProperties': FieldValue.increment(1),
    'portfolio.vacantProperties': FieldValue.increment(-1),
    'portfolio.totalEarnings': FieldValue.increment(breakdown.annualRent),
    updatedAt: now,
  });

  await batch.commit();
  logger.info(`Payment ${reference} committed — lease=${leaseRef.id}`);

  // ── 7. Push notifications (non-blocking) ─────────────────────────────────
  await Promise.allSettled([
    sendPushNotification(tenantId, {
      title: 'Payment Successful! 🎉',
      body: `Your payment of ${formatCurrency(amount / 100)} has been confirmed.`,
      data: { type: 'PAYMENT_SUCCESSFUL', reference, action: 'view_lease', leaseId: leaseRef.id },
    }),
    sendPushNotification(landlordId, {
      title: 'Payment Received! 💰',
      body: `${formatCurrency(amount / 100)} received for your property.`,
      data: { type: 'PAYMENT_RECEIVED', reference, propertyId, leaseId: leaseRef.id },
    }),
  ]);

  // ── 8. Trigger lease document generation (best-effort) ───────────────────
  try {
    await generateLeaseDocument(leaseRef.id);
  } catch (err: unknown) {
    logger.warn('Lease document generation failed (non-fatal)', err);
  }
}

// ─── transfer.success ─────────────────────────────────────────────────────────

async function handleTransferSuccess(data: Record<string, unknown>): Promise<void> {
  const reference   = data['reference'] as string | undefined;
  const transferId  = data['id'] as number | undefined;
  const amount      = data['amount'] as number | undefined; // Kobo

  if (!reference) {
    logger.warn('transfer.success event missing reference', { data });
    return;
  }

  const db = admin.firestore();
  const paymentSnap = await db
    .collection('payments')
    .where('paystack.transferReference', '==', reference)
    .limit(1)
    .get();

  if (paymentSnap.empty) {
    logger.warn(`No payment found for transfer reference=${reference}`);
    return;
  }

  await paymentSnap.docs[0]!.ref.update({
    'payout.status': 'completed',
    'payout.paystackTransferId': transferId ?? null,
    'payout.completedAt': admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  const landlordId = paymentSnap.docs[0]!.data()['landlordId'] as string | undefined;
  if (landlordId && amount != null) {
    await sendPushNotification(landlordId, {
      title: 'Payout Sent! 💸',
      body: `${formatCurrency(amount / 100)} has been transferred to your bank account.`,
      data: { type: 'PAYOUT_SENT', reference },
    });
  }

  logger.info(`Transfer success processed: reference=${reference}`);
}

// ─── transfer.failed ──────────────────────────────────────────────────────────

async function handleTransferFailed(data: Record<string, unknown>): Promise<void> {
  const reference = data['reference'] as string | undefined;

  if (!reference) return;

  const db = admin.firestore();
  const paymentSnap = await db
    .collection('payments')
    .where('paystack.transferReference', '==', reference)
    .limit(1)
    .get();

  if (paymentSnap.empty) return;

  await paymentSnap.docs[0]!.ref.update({
    'payout.status': 'failed',
    updatedAt: admin.firestore.Timestamp.now(),
  });

  logger.error(`Transfer failed: reference=${reference}`);
}

// ─── refund.processed ─────────────────────────────────────────────────────────

async function handleRefund(data: Record<string, unknown>): Promise<void> {
  const reference = data['transaction_reference'] as string | undefined;
  const amount    = data['amount'] as number | undefined;

  if (!reference) return;

  const db = admin.firestore();
  const paymentRef = db.collection('payments').doc(reference);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) return;

  await paymentRef.update({
    status: 'refunded',
    'refund.processedAt': admin.firestore.Timestamp.now(),
    'refund.amountKobo': amount ?? null,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  const tenantId = paymentSnap.data()!['tenantId'] as string | undefined;
  if (tenantId && amount != null) {
    await sendPushNotification(tenantId, {
      title: 'Refund Processed',
      body: `${formatCurrency(amount / 100)} has been refunded to your payment method.`,
      data: { type: 'REFUND_PROCESSED', reference },
    });
  }

  logger.info(`Refund processed: reference=${reference}, amountKobo=${amount}`);
}

// ─── Lease document generation (stub — full impl in Sprint 4) ─────────────────

async function generateLeaseDocument(leaseId: string): Promise<void> {
  // TODO(sprint-4): Generate PDF via puppeteer/PDFKit, upload to Storage,
  // update lease.documents.leaseAgreement with the download URL.
  logger.info(`generateLeaseDocument queued for leaseId=${leaseId}`);
}
