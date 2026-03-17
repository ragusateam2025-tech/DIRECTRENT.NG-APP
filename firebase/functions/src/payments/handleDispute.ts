/**
 * PAY-003: handleDispute
 *
 * HTTPS Callable — authenticated tenant or landlord.
 * Opens a dispute on a completed payment whose escrow is still 'held'.
 * Creates a dispute document and updates the payment's escrow status to
 * 'disputed' so that automated release is blocked.
 *
 * PRD ref: §2.3 — handleDispute
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HandleDisputeRequest {
  paymentId: string;
  reason: string;
  description: string;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const handleDispute = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 30 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const callerUid = request.auth.uid;
    const { paymentId, reason, description } =
      request.data as HandleDisputeRequest;

    if (!paymentId || typeof paymentId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'paymentId is required.');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new https.HttpsError('invalid-argument', 'reason is required.');
    }
    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      throw new https.HttpsError('invalid-argument', 'description is required.');
    }

    const db = admin.firestore();

    // ── 2. Fetch payment ───────────────────────────────────────────────────
    const paymentSnap = await db.collection('payments').doc(paymentId).get();
    if (!paymentSnap.exists) {
      throw new https.HttpsError('not-found', 'Payment not found.');
    }
    const payment = paymentSnap.data() as Record<string, unknown>;

    // ── 3. Verify caller is a party to this payment ────────────────────────
    const paymentTenantId = payment['tenantId'] as string;
    const paymentLandlordId = payment['landlordId'] as string;

    if (callerUid !== paymentTenantId && callerUid !== paymentLandlordId) {
      throw new https.HttpsError(
        'permission-denied',
        'You are not a party to this payment.'
      );
    }

    // ── 4. Verify payment is completed ─────────────────────────────────────
    if (payment['status'] !== 'completed') {
      throw new https.HttpsError(
        'failed-precondition',
        'Disputes can only be raised on completed payments.'
      );
    }

    // ── 5. Verify escrow is still held ─────────────────────────────────────
    const escrow = (payment['escrow'] ?? {}) as Record<string, unknown>;
    if (escrow['status'] !== 'held') {
      throw new https.HttpsError(
        'failed-precondition',
        `Escrow is not currently held (status: ${escrow['status'] as string ?? 'unknown'}).`
      );
    }

    // ── 6. Create dispute document ─────────────────────────────────────────
    const disputeRef = db.collection('disputes').doc();
    await disputeRef.set({
      paymentId,
      tenantId: paymentTenantId,
      landlordId: paymentLandlordId,
      propertyId: payment['propertyId'] as string,
      initiatedBy: callerUid,
      reason: reason.trim(),
      description: description.trim(),
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── 7. Update payment escrow status to 'disputed' ──────────────────────
    await db.collection('payments').doc(paymentId).update({
      'escrow.status': 'disputed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Dispute created: disputeId=${disputeRef.id}, paymentId=${paymentId}, ` +
        `initiatedBy=${callerUid}, reason=${reason.trim()}`
    );

    return { disputeId: disputeRef.id };
  }
);
