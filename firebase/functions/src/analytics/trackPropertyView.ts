/**
 * trackPropertyView
 *
 * HTTPS Callable — anonymous or authenticated.
 * Increments the view counter on a property document and writes a lightweight
 * event document to the propertyViews collection for analytics aggregation.
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const trackPropertyView = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { propertyId } = request.data as { propertyId?: string };

    // ── Input validation ─────────────────────────────────────────────────────
    if (!propertyId || typeof propertyId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'propertyId is required.');
    }

    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    const viewerUid: string | null = request.auth?.uid ?? null;

    // ── Increment view count on the property ─────────────────────────────────
    await db.collection('properties').doc(propertyId).update({
      'analytics.viewCount': admin.firestore.FieldValue.increment(1),
      'analytics.lastViewedAt': ts,
    });

    // ── Write a lightweight view event ───────────────────────────────────────
    await db.collection('propertyViews').add({
      propertyId,
      viewerUid,
      viewedAt: ts,
    });

    logger.info(
      `trackPropertyView: propertyId=${propertyId}, viewer=${viewerUid ?? 'anonymous'}`
    );

    return { success: true };
  }
);
