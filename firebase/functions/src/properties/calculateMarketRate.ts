/**
 * calculateMarketRate
 *
 * HTTPS Callable — authenticated users only.
 * Queries active listings in Firestore that match the given area, property type,
 * and optional bedroom count, then returns average, median, min, and max rent.
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const calculateMarketRate = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // ── Auth guard ───────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { area, propertyType, bedrooms } = request.data as {
      area?: string;
      propertyType?: string;
      bedrooms?: number;
    };

    // ── Input validation ─────────────────────────────────────────────────────
    if (!area || typeof area !== 'string') {
      throw new https.HttpsError('invalid-argument', 'area and propertyType are required.');
    }
    if (!propertyType || typeof propertyType !== 'string') {
      throw new https.HttpsError('invalid-argument', 'area and propertyType are required.');
    }

    const db = admin.firestore();

    // ── Build query ──────────────────────────────────────────────────────────
    let query: FirebaseFirestore.Query = db
      .collection('properties')
      .where('location.area', '==', area)
      .where('status.listing', '==', 'active')
      .where('propertyType', '==', propertyType);

    if (bedrooms !== undefined) {
      query = query.where('details.bedrooms', '==', bedrooms);
    }

    const snap = await query.limit(50).get();

    const rents = snap.docs
      .map((d) => (d.data()['pricing'] as { annualRent: number }).annualRent)
      .filter((r): r is number => typeof r === 'number' && r > 0);

    if (rents.length === 0) {
      return {
        success: true,
        data: { count: 0, average: null, median: null, min: null, max: null },
      };
    }

    const sorted = [...rents].sort((a, b) => a - b);
    const avg = Math.round(rents.reduce((s, r) => s + r, 0) / rents.length);
    const median = sorted[Math.floor(sorted.length / 2)] as number;
    const min = sorted[0] as number;
    const max = sorted[sorted.length - 1] as number;

    logger.info(
      `Market rate for ${area}/${propertyType}: avg=₦${avg}, n=${rents.length}`
    );

    return { success: true, data: { count: rents.length, average: avg, median, min, max } };
  }
);
