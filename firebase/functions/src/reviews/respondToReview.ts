/**
 * REVIEW-002: respondToReview
 *
 * HTTPS Callable — authenticated user.
 * Allows the person who was reviewed to post a single public response.
 * Only the reviewee (the person reviewed) may respond.
 *
 * PRD ref: §4.2 — respondToReview
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RespondToReviewRequest {
  reviewId: string;
  response: string;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const respondToReview = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 15 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const callerUid = request.auth.uid;
    const { reviewId, response } = request.data as RespondToReviewRequest;

    // ── 2. Validate response length ────────────────────────────────────────
    if (!response || typeof response !== 'string') {
      throw new https.HttpsError('invalid-argument', 'response is required.');
    }
    const trimmedResponse = response.trim();
    if (trimmedResponse.length < 5 || trimmedResponse.length > 500) {
      throw new https.HttpsError(
        'invalid-argument',
        'Response must be between 5 and 500 characters.'
      );
    }

    if (!reviewId || typeof reviewId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'reviewId is required.');
    }

    const db = admin.firestore();
    const reviewRef = db.collection('reviews').doc(reviewId);

    // ── 3. Fetch review ────────────────────────────────────────────────────
    const reviewSnap = await reviewRef.get();
    if (!reviewSnap.exists) {
      throw new https.HttpsError('not-found', 'Review not found.');
    }
    const review = reviewSnap.data() as Record<string, unknown>;

    // ── 4. Verify caller is the reviewee ───────────────────────────────────
    if (callerUid !== (review['revieweeId'] as string)) {
      throw new https.HttpsError(
        'permission-denied',
        'Only the person being reviewed can respond.'
      );
    }

    // ── 5. Ensure no existing response ────────────────────────────────────
    if (review['response'] !== undefined && review['response'] !== null) {
      throw new https.HttpsError(
        'already-exists',
        'A response has already been submitted for this review.'
      );
    }

    // ── 6. Persist the response ────────────────────────────────────────────
    await reviewRef.update({
      response: trimmedResponse,
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Review response submitted: reviewId=${reviewId}, respondedBy=${callerUid}`
    );

    return { success: true };
  }
);
