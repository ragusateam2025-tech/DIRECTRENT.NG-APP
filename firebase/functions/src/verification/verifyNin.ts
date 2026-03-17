import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { VerifyMeClient } from './verifyme.client';

function hashIdentifier(value: string, uid: string): string {
  return crypto
    .createHmac('sha256', uid)
    .update(value)
    .digest('hex');
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '')
    .trim();
}

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

  if (pf === vf && pl === vl) return true;
  if (pf === vl && pl === vf) return true;
  if (pf === vf || pf === vl || pl === vf || pl === vl) return true;

  return false;
}

/**
 * VER-004, VER-005, VER-006, VER-007
 * Verify a NIN via VerifyMe API.
 */
export const verifyNin = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { nin } = request.data as { nin?: string };

    if (!nin || !/^\d{11}$/.test(nin)) {
      throw new https.HttpsError(
        'invalid-argument',
        'NIN must be exactly 11 digits.'
      );
    }

    const db = admin.firestore();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    const ninHash = hashIdentifier(nin, uid);
    const globalNinHash = crypto.createHash('sha256').update(nin).digest('hex');

    // Duplicate detection
    const existingSnap = await db
      .collection('verificationLogs')
      .where('globalHash', '==', globalNinHash)
      .where('type', '==', 'nin')
      .where('status', '==', 'verified')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0].data();
      if (existingDoc.uid !== uid) {
        logger.warn(`Duplicate NIN attempt by uid=${uid}`);
        throw new https.HttpsError(
          'already-exists',
          'This NIN is linked to another account.'
        );
      }
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (userData?.verification?.nin?.status === 'verified') {
        return { success: true, message: 'NIN already verified.' };
      }
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new https.HttpsError('not-found', 'User profile not found.');
    }
    const userData = userDoc.data()!;

    let verifyResult: Awaited<ReturnType<typeof VerifyMeClient.verifyNin>>;

    try {
      verifyResult = await VerifyMeClient.verifyNin(nin);
    } catch (err: unknown) {
      logger.error('VerifyMe NIN API error', err);
      await db.collection('verificationLogs').add({
        uid,
        type: 'nin',
        status: 'failed',
        hash: ninHash,
        globalHash: globalNinHash,
        last4: nin.slice(-4),
        failureReason: 'external_api_error',
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.nin.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'unavailable',
        'Identity verification service is temporarily unavailable. Please try again.'
      );
    }

    if (!verifyResult.status || !verifyResult.data) {
      await db.collection('verificationLogs').add({
        uid,
        type: 'nin',
        status: 'failed',
        hash: ninHash,
        globalHash: globalNinHash,
        last4: nin.slice(-4),
        failureReason: 'nin_not_found',
        verifyMeMessage: verifyResult.message,
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.nin.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'not-found',
        'NIN not found. Please check the number and try again.'
      );
    }

    // Name matching
    const { firstname: ninFirst, surname: ninLast } = verifyResult.data;
    const profileFirst = userData.firstName ?? '';
    const profileLast = userData.lastName ?? '';

    const nameMatched = namesMatch(profileFirst, profileLast, ninFirst, ninLast);

    if (!nameMatched) {
      await db.collection('verificationLogs').add({
        uid,
        type: 'nin',
        status: 'failed',
        hash: ninHash,
        globalHash: globalNinHash,
        last4: nin.slice(-4),
        failureReason: 'name_mismatch',
        createdAt: serverTimestamp,
      });

      await db.collection('users').doc(uid).update({
        'verification.nin.status': 'failed',
        updatedAt: serverTimestamp,
      });

      throw new https.HttpsError(
        'failed-precondition',
        'The name on your NIN does not match your profile. Please update your name to match your NIN.'
      );
    }

    const verifyMeRef = verifyResult.data.reference ?? null;
    const last4 = nin.slice(-4);

    const batch = db.batch();

    batch.update(db.collection('users').doc(uid), {
      'verification.nin.status': 'verified',
      'verification.nin.last4': last4,
      'verification.nin.hash': ninHash,
      'verification.nin.verifiedAt': serverTimestamp,
      'verification.nin.verifyMeRef': verifyMeRef,
      profileCompleteness: admin.firestore.FieldValue.increment(20),
      updatedAt: serverTimestamp,
    });

    batch.set(db.collection('verificationLogs').doc(), {
      uid,
      type: 'nin',
      status: 'verified',
      hash: ninHash,
      globalHash: globalNinHash,
      last4,
      verifyMeRef,
      createdAt: serverTimestamp,
    });

    await batch.commit();

    logger.info(`NIN verified for uid=${uid}`);

    return {
      success: true,
      message: 'NIN verified successfully.',
      data: { last4 },
    };
  }
);
