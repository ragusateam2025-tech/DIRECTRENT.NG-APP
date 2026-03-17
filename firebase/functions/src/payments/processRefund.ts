/**
 * PAY-004: processRefund
 *
 * HTTPS Callable — authenticated landlord only.
 * Allows the landlord to initiate a partial or full refund of the caution
 * deposit back to the tenant.  A `refunds` document is created and the
 * payment escrow status is updated accordingly.
 *
 * PRD ref: §2.4 — processRefund
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessRefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const processRefund = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 30 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const callerUid = request.auth.uid;
    const { paymentId, amount, reason } = request.data as ProcessRefundRequest;

    if (!paymentId || typeof paymentId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'paymentId is required.');
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new https.HttpsError('invalid-argument', 'amount must be a number.');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new https.HttpsError('invalid-argument', 'reason is required.');
    }

    const db = admin.firestore();

    // ── 2. Fetch payment ───────────────────────────────────────────────────
    const paymentSnap = await db.collection('payments').doc(paymentId).get();
    if (!paymentSnap.exists) {
      throw new https.HttpsError('not-found', 'Payment not found.');
    }
    const payment = paymentSnap.data() as Record<string, unknown>;

    // ── 3. Verify caller is the landlord of this payment ───────────────────
    if (callerUid !== (payment['landlordId'] as string)) {
      throw new https.HttpsError(
        'permission-denied',
        'Only the landlord can initiate a refund.'
      );
    }

    // ── 4. Verify payment is completed ─────────────────────────────────────
    if (payment['status'] !== 'completed') {
      throw new https.HttpsError(
        'failed-precondition',
        'Refunds can only be initiated on completed payments.'
      );
    }

    // ── 5. Validate refund amount against caution deposit ──────────────────
    const breakdown = (payment['breakdown'] ?? {}) as Record<string, unknown>;
    const cautionDeposit = (breakdown['cautionDeposit'] as number | undefined) ?? 0;

    if (amount <= 0) {
      throw new https.HttpsError(
        'invalid-argument',
        'Refund amount must be greater than zero.'
      );
    }
    if (amount > cautionDeposit) {
      throw new https.HttpsError(
        'invalid-argument',
        `Refund amount (₦${amount.toLocaleString()}) cannot exceed the caution deposit ` +
          `(₦${cautionDeposit.toLocaleString()}).`
      );
    }

    // ── 6. Create refund record ────────────────────────────────────────────
    const paystackData = (payment['paystack'] ?? {}) as Record<string, unknown>;

    const refundRef = db.collection('refunds').doc();
    await refundRef.set({
      paymentId,
      tenantId: payment['tenantId'] as string,
      landlordId: payment['landlordId'] as string,
      amount,
      reason: reason.trim(),
      status: 'pending',
      paystackReference: (paystackData['reference'] as string | undefined) ?? '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── 7. Update payment escrow status ────────────────────────────────────
    const newEscrowStatus =
      amount === cautionDeposit ? 'released_to_tenant' : 'partially_refunded';

    await db.collection('payments').doc(paymentId).update({
      'escrow.status': newEscrowStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Refund initiated: refundId=${refundRef.id}, paymentId=${paymentId}, ` +
        `landlordId=${callerUid}, amount=₦${amount.toLocaleString()}, ` +
        `escrowStatus=${newEscrowStatus}`
    );

    return { refundId: refundRef.id, status: 'pending' };
  }
);
