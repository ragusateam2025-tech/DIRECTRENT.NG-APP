/**
 * LEASE-002: signLeaseDocument
 *
 * HTTPS Callable — authenticated tenant or landlord.
 * Records a digital signature for the calling party on the lease.
 * When both parties have signed the lease transitions to 'active'.
 *
 * PRD ref: §3.2 — signLeaseDocument
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignLeaseRequest {
  leaseId: string;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const signLeaseDocument = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 30 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const callerUid = request.auth.uid;
    const { leaseId } = request.data as SignLeaseRequest;

    if (!leaseId || typeof leaseId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'leaseId is required.');
    }

    const db = admin.firestore();
    const leaseRef = db.collection('leases').doc(leaseId);

    // ── 2. Fetch lease ─────────────────────────────────────────────────────
    const leaseSnap = await leaseRef.get();
    if (!leaseSnap.exists) {
      throw new https.HttpsError('not-found', 'Lease not found.');
    }
    const lease = leaseSnap.data() as Record<string, unknown>;

    // ── 3. Verify caller is a party to this lease ──────────────────────────
    const tenantId = lease['tenantId'] as string;
    const landlordId = lease['landlordId'] as string;

    if (callerUid !== tenantId && callerUid !== landlordId) {
      throw new https.HttpsError(
        'permission-denied',
        'You are not a party to this lease.'
      );
    }

    // Ensure the lease is still awaiting signatures
    if (lease['status'] !== 'pending_signature') {
      throw new https.HttpsError(
        'failed-precondition',
        `Lease cannot be signed in its current state: ${lease['status'] as string}.`
      );
    }

    // ── 4. Determine which signature field to update ───────────────────────
    const signatureParty: 'tenant' | 'landlord' =
      callerUid === tenantId ? 'tenant' : 'landlord';

    const signatures = (lease['signatures'] ?? {}) as Record<
      string,
      { signed: boolean; signedAt: admin.firestore.Timestamp | null }
    >;

    // Guard against double-signing
    if (signatures[signatureParty]?.signed === true) {
      throw new https.HttpsError(
        'already-exists',
        `You have already signed this lease.`
      );
    }

    // ── 5. Update the signature ────────────────────────────────────────────
    await leaseRef.update({
      [`signatures.${signatureParty}.signed`]: true,
      [`signatures.${signatureParty}.signedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── 6. Re-read the doc and check if both signatures are now present ────
    const updatedSnap = await leaseRef.get();
    const updatedLease = updatedSnap.data() as Record<string, unknown>;
    const updatedSignatures = (updatedLease['signatures'] ?? {}) as Record<
      string,
      { signed: boolean; signedAt: admin.firestore.Timestamp | null }
    >;

    const bothSigned =
      updatedSignatures['landlord']?.signed === true &&
      updatedSignatures['tenant']?.signed === true;

    // ── 7. Activate lease when both parties have signed ────────────────────
    if (bothSigned) {
      await leaseRef.update({
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `Lease fully executed and activated: leaseId=${leaseId}, ` +
          `tenantId=${tenantId}, landlordId=${landlordId}`
      );
    } else {
      logger.info(
        `Lease signed by ${signatureParty}: leaseId=${leaseId}, awaiting other party.`
      );
    }

    return { success: true, fullyExecuted: bothSigned };
  }
);
