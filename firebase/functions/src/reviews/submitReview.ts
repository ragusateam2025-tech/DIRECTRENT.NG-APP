/**
 * REVIEW-001: submitReview
 *
 * HTTPS Callable — authenticated tenant or landlord.
 * Submits a review after a lease has been completed.
 * Prevents duplicate reviews per lease per reviewer.
 * Recalculates and persists the reviewee's aggregate rating.
 *
 * PRD ref: §4.1 — submitReview
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatingInput {
  overall: number;
  communication?: number;
  propertyCondition?: number;
  maintenance?: number;
  valueForMoney?: number;
  paymentTimeliness?: number;
  propertyUpkeep?: number;
  compliance?: number;
}

interface SubmitReviewRequest {
  revieweeId: string;
  propertyId: string;
  leaseId: string;
  rating: RatingInput;
  comment: string;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const submitReview = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 30 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const reviewerId = request.auth.uid;
    const { revieweeId, propertyId, leaseId, rating, comment } =
      request.data as SubmitReviewRequest;

    // ── 2. Validate comment length ─────────────────────────────────────────
    if (!comment || typeof comment !== 'string') {
      throw new https.HttpsError('invalid-argument', 'comment is required.');
    }
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10 || trimmedComment.length > 500) {
      throw new https.HttpsError(
        'invalid-argument',
        'Comment must be between 10 and 500 characters.'
      );
    }

    // ── 3. Validate rating overall ─────────────────────────────────────────
    if (
      !rating ||
      typeof rating.overall !== 'number' ||
      rating.overall < 1 ||
      rating.overall > 5
    ) {
      throw new https.HttpsError(
        'invalid-argument',
        'rating.overall must be a number between 1 and 5.'
      );
    }

    if (!revieweeId || typeof revieweeId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'revieweeId is required.');
    }
    if (!propertyId || typeof propertyId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'propertyId is required.');
    }
    if (!leaseId || typeof leaseId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'leaseId is required.');
    }

    const db = admin.firestore();

    // ── 4. Determine reviewer's userType ───────────────────────────────────
    const reviewerSnap = await db.collection('users').doc(reviewerId).get();
    if (!reviewerSnap.exists) {
      throw new https.HttpsError('not-found', 'Reviewer user record not found.');
    }
    const reviewerData = reviewerSnap.data() as Record<string, unknown>;
    const userType = (reviewerData['userType'] as string) ?? '';

    if (userType !== 'tenant' && userType !== 'landlord') {
      throw new https.HttpsError(
        'failed-precondition',
        'User type is not recognised.'
      );
    }
    const reviewerType: 'tenant' | 'landlord' = userType as 'tenant' | 'landlord';

    // ── 5. Check for duplicate review ──────────────────────────────────────
    const duplicateSnap = await db
      .collection('reviews')
      .where('leaseId', '==', leaseId)
      .where('reviewerId', '==', reviewerId)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      throw new https.HttpsError(
        'already-exists',
        'You have already submitted a review for this lease.'
      );
    }

    // ── 6. Verify lease exists and caller is a participant ─────────────────
    const leaseSnap = await db.collection('leases').doc(leaseId).get();
    if (!leaseSnap.exists) {
      throw new https.HttpsError('not-found', 'Lease not found.');
    }
    const lease = leaseSnap.data() as Record<string, unknown>;

    if (
      reviewerId !== (lease['tenantId'] as string) &&
      reviewerId !== (lease['landlordId'] as string)
    ) {
      throw new https.HttpsError(
        'permission-denied',
        'You are not a party to this lease.'
      );
    }

    // ── 7. Write review document ───────────────────────────────────────────
    const reviewRef = db.collection('reviews').doc();

    const reviewDoc: Record<string, unknown> = {
      reviewerId,
      revieweeId,
      reviewerType,
      propertyId,
      leaseId,
      comment: trimmedComment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store rating under the appropriate field name
    if (reviewerType === 'tenant') {
      reviewDoc['landlordRating'] = rating;
    } else {
      reviewDoc['tenantRating'] = rating;
    }

    await reviewRef.set(reviewDoc);

    // ── 8. Recalculate reviewee's aggregate rating ─────────────────────────
    const allReviewsSnap = await db
      .collection('reviews')
      .where('revieweeId', '==', revieweeId)
      .get();

    let totalOverall = 0;
    let count = 0;

    for (const doc of allReviewsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      // Pick whichever rating field is present
      const ratingField =
        (data['landlordRating'] as RatingInput | undefined) ??
        (data['tenantRating'] as RatingInput | undefined);
      if (ratingField && typeof ratingField.overall === 'number') {
        totalOverall += ratingField.overall;
        count += 1;
      }
    }

    const newAvg = count > 0 ? Math.round((totalOverall / count) * 100) / 100 : 0;

    // Update users/{revieweeId}
    await db.collection('users').doc(revieweeId).update({
      'rating.average': newAvg,
      'rating.count': count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the role-specific sub-collection document
    // reviewerType === 'tenant' means the tenant is reviewing the landlord
    if (reviewerType === 'tenant') {
      await db.collection('landlords').doc(revieweeId).update({
        'rating.average': newAvg,
        'rating.count': count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await db.collection('tenants').doc(revieweeId).update({
        'rating.average': newAvg,
        'rating.count': count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    logger.info(
      `Review submitted: reviewId=${reviewRef.id}, reviewerId=${reviewerId}, ` +
        `revieweeId=${revieweeId}, leaseId=${leaseId}, newAvg=${newAvg}`
    );

    return { reviewId: reviewRef.id };
  }
);
