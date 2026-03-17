/**
 * expireListings
 *
 * Scheduled Cloud Function — runs every 24 hours.
 * Finds active property listings that have been published for more than 90 days
 * and marks them as 'expired' in batches of up to 100.
 */
import { scheduler, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const expireListings = scheduler.onSchedule('every 24 hours', async () => {
  const db = admin.firestore();
  const ts = admin.firestore.FieldValue.serverTimestamp();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90); // 90 days ago

  const staleSnap = await db
    .collection('properties')
    .where('status.listing', '==', 'active')
    .where('publishedAt', '<', admin.firestore.Timestamp.fromDate(cutoff))
    .limit(100)
    .get();

  if (staleSnap.empty) {
    logger.info('expireListings: no stale listings to expire');
    return;
  }

  const batch = db.batch();
  staleSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { 'status.listing': 'expired', updatedAt: ts });
  });
  await batch.commit();

  logger.info(`expireListings: expired ${staleSnap.size} stale listings`);
});
