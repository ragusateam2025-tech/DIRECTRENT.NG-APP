/**
 * Sprint 7: enforceListingLimit
 *
 * Firestore trigger — fires when a new property document is created.
 * Enforces per-plan listing limits:
 *   free:    1 active listing
 *   basic:   5 active listings
 *   premium: unlimited (20+)
 *
 * If the landlord has exceeded their plan limit, the new listing is paused
 * immediately and a statusReason is set.
 */
import { firestore, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 5,
  premium: 999,
};

export const enforceListingLimit = firestore.onDocumentCreated(
  'properties/{propertyId}',
  async (event) => {
    const property = event.data?.data();
    if (!property) return;

    const landlordId: string = property['landlordId'];
    if (!landlordId) {
      logger.warn('enforceListingLimit: missing landlordId', {
        propertyId: event.params.propertyId,
      });
      return;
    }

    // Only enforce on active listings — drafts are fine
    if (property['status']?.['listing'] !== 'active') return;

    const db = admin.firestore();

    // ── Get landlord subscription plan ───────────────────────────────────────
    let plan = 'free';
    try {
      const landlordSnap = await db.collection('landlords').doc(landlordId).get();
      plan =
        (landlordSnap.data()?.['subscription']?.['plan'] as string | undefined) ??
        'free';
    } catch (err) {
      logger.warn('enforceListingLimit: failed to fetch landlord doc, defaulting to free', err);
    }

    const limit = PLAN_LIMITS[plan] ?? 1;

    // ── Count existing active listings (excluding this new one) ──────────────
    let existingCount = 0;
    try {
      const snapshot = await db
        .collection('properties')
        .where('landlordId', '==', landlordId)
        .where('status.listing', '==', 'active')
        .get();

      // Subtract 1 because this new doc is already included in the snapshot
      existingCount = snapshot.size - 1;
    } catch (err) {
      logger.error('enforceListingLimit: failed to count existing listings', err);
      return;
    }

    if (existingCount < limit) {
      // Within limit — no action needed
      logger.info(
        `enforceListingLimit: landlord=${landlordId} plan=${plan} ` +
          `usage=${existingCount + 1}/${limit} — OK`
      );
      return;
    }

    // ── Limit exceeded — pause the new listing ───────────────────────────────
    logger.info(
      `enforceListingLimit: landlord=${landlordId} plan=${plan} ` +
        `limit=${limit} exceeded — pausing listing=${event.params.propertyId}`
    );

    try {
      await db.collection('properties').doc(event.params.propertyId).update({
        'status.listing': 'paused',
        statusReason: 'listing_limit_reached',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error('enforceListingLimit: failed to pause listing', err);
    }
  }
);
