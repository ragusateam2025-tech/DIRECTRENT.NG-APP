import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { VerifyMeClient } from './verifyme.client';

/**
 * Hash a sensitive identifier (BVN/NIN) for secure storage.
 * Salted with uid so the same number hashes differently per user.
 */
function hashIdentifier(value: string, uid: string): string {
  return crypto
    .createHmac('sha256', uid)
    .update(value)
    .digest('hex');
}

/**
 * Normalize a name for comparison (lowercase, remove accents/extra spaces).
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '')
    .trim();
}

/**
 * Check if two names match, allowing for transposed first/last name.
 */
function namesMatch(
  profileFirst: string,
  profileLast: string,
  verifyFirst: string,
  verifyLast: string
): boolean {
  const pf = normalizeName(profileFirst);
  const pl = normalizeName(profileLast);
  const vf = normalizeName(verifyFirst);
  const vl = normalizeName(verifyLast);

  // Direct match
  if (pf === vf && pl === vl) return true;
  // Transposed (some BVN records store name differently)
  if (pf === vl && pl === vf) return true;
  // Partial match — first name matches either side
  if (pf === vf || pf === vl || pl === vf || pl === vl) return true;

  return false;
}

/**
 * VER-002, VER-005, VER-006, VER-007
 * Verify a BVN via VerifyMe API, cross-check name, detect duplicates,
 * and write an audit log.
 */
export const verifyBvn = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // Auth guard
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { bvn } = request.data as { bvn?: string };

    // Input validation
    if (!bvn || !/^\d{11}$/.test(bvn)) {
      throw new https.HttpsError(
        'invalid-argument',
        'BVN must be exactly 11 digits.'
      );
    }

    const db = admin.firestore();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    // ── VER-006: Duplicate detection ─────────────────────────────────────────
    const bvnHash = hashIdentifier(bvn, uid);
    // We store the hash globally (not per-user) to detect duplicates
    const globalBvnHash = crypto.createHash('sha256').update(bvn).digest('hex');

    const existingSnap = await db
      .collection('verificationLogs')
      .where('globalHash', '==', globalBvnHash)
      .where('type', '==', 'bvn')
      .where('status', '==', 'verified')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0].data();
      if (existingDoc.uid !== uid) {
        // Another user has this BVN
        logger.warn(`Duplicate BVN attempt by uid=${uid}`);
        throw new https.HttpsError(
          'already-exists',
          'This BVN is linked to another account.'
        );
      }
      // Same user re-verifying — allow but return early if already verified
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (userData?.verification?.bvn?.status === 'verified') {
        return { success: true, message: 'BVN already verified.' };
      }
    }

    // ── Fetch user profile for name matching ─────────────────────────────────
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new https.HttpsError('not-found', 'User profile not found.');
    }
    const userData = userDoc.data()!;

    let verifyResult: Awaited<ReturnType<typeof VerifyMeClient.verifyBvn>>;

    try {
      verifyResult = await VerifyMeClient.verifyBvn(bvn);
    } catch (err: unknown) {
      logger.error('VerifyMe BVN API error', err);
      // ── VER-007: Audit log (failed external call) ─────────────────────────
      await db.collection('verificationLogs').add({
        uid,
        type: 'bvn',
        status: 'failed',
        hash: bvnHash,
        globalHash: globalBvnHash,
        last4: bvn.slice(-4),
        failureReason: 'external_api_error',
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.bvn.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'unavailable',
        'Identity verification service is temporarily unavailable. Please try again.'
      );
    }

    if (!verifyResult.status || !verifyResult.data) {
      // ── VER-007: Audit log (BVN not found) ───────────────────────────────
      await db.collection('verificationLogs').add({
        uid,
        type: 'bvn',
        status: 'failed',
        hash: bvnHash,
        globalHash: globalBvnHash,
        last4: bvn.slice(-4),
        failureReason: 'bvn_not_found',
        verifyMeMessage: verifyResult.message,
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.bvn.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'not-found',
        'BVN not found. Please check the number and try again.'
      );
    }

    // ── VER-005: Name matching ────────────────────────────────────────────────
    const { firstName: bvnFirst, lastName: bvnLast } = verifyResult.data;
    const profileFirst = userData.firstName ?? '';
    const profileLast = userData.lastName ?? '';

    const nameMatched = namesMatch(profileFirst, profileLast, bvnFirst, bvnLast);

    if (!nameMatched) {
      // ── VER-007: Audit log (name mismatch) ───────────────────────────────
      await db.collection('verificationLogs').add({
        uid,
        type: 'bvn',
        status: 'failed',
        hash: bvnHash,
        globalHash: globalBvnHash,
        last4: bvn.slice(-4),
        failureReason: 'name_mismatch',
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.bvn.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'failed-precondition',
        'The name on your BVN does not match your profile. Please update your name to match your BVN.'
      );
    }

    // ── Success: update user + log ────────────────────────────────────────────
    const verifyMeRef = verifyResult.data.reference ?? null;
    const last4 = bvn.slice(-4);

    const batch = db.batch();

    batch.update(db.collection('users').doc(uid), {
      'verification.bvn.status': 'verified',
      'verification.bvn.last4': last4,
      'verification.bvn.hash': bvnHash,
      'verification.bvn.verifiedAt': serverTimestamp,
      'verification.bvn.verifyMeRef': verifyMeRef,
      profileCompleteness: admin.firestore.FieldValue.increment(20),
      updatedAt: serverTimestamp,
    });

    // ── VER-007: Audit log (success) ─────────────────────────────────────────
    batch.set(db.collection('verificationLogs').doc(), {
      uid,
      type: 'bvn',
      status: 'verified',
      hash: bvnHash,
      globalHash: globalBvnHash,
      last4,
      verifyMeRef,
      createdAt: serverTimestamp,
    });

    await batch.commit();

    logger.info(`BVN verified for uid=${uid}`);

    return {
      success: true,
      message: 'BVN verified successfully.',
      data: { last4 },
    };
  }
);
