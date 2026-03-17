/**
 * checkLeaseExpiry
 *
 * Scheduled Cloud Function — runs every 24 hours.
 * Finds active leases whose end date falls within the next 60 days and for which
 * the expiry notification has not yet been sent. Notifies both landlord and tenant
 * via FCM, then marks the lease so the notification is not re-sent.
 */
import { scheduler, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const checkLeaseExpiry = scheduler.onSchedule('every 24 hours', async () => {
  const db = admin.firestore();
  const now = new Date();

  const in60Days = new Date();
  in60Days.setDate(now.getDate() + 60);

  const expiringSnap = await db
    .collection('leases')
    .where('status', '==', 'active')
    .where('terms.endDate', '<=', admin.firestore.Timestamp.fromDate(in60Days))
    .where('terms.endDate', '>=', admin.firestore.Timestamp.fromDate(now))
    .where('renewal.notificationSent', '==', false)
    .limit(100)
    .get();

  if (expiringSnap.empty) {
    logger.info('checkLeaseExpiry: no expiring leases found');
    return;
  }

  const batch = db.batch();

  for (const leaseDoc of expiringSnap.docs) {
    const lease = leaseDoc.data();
    const endDate = (lease['terms']['endDate'] as admin.firestore.Timestamp).toDate();
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // ── Collect FCM tokens from both parties ─────────────────────────────────
    const landlordSnap = await db
      .collection('users')
      .doc(lease['landlordId'] as string)
      .get();
    const landlordTokens: string[] =
      (landlordSnap.data()?.['fcmTokens'] as string[] | undefined) ?? [];

    const tenantSnap = await db
      .collection('users')
      .doc(lease['tenantId'] as string)
      .get();
    const tenantTokens: string[] =
      (tenantSnap.data()?.['fcmTokens'] as string[] | undefined) ?? [];

    const allTokens = [...landlordTokens, ...tenantTokens].filter(Boolean);

    if (allTokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens: allTokens,
        notification: {
          title: 'Lease Ending Soon',
          body: `Your lease ends in ${daysLeft} days. Take action now.`,
        },
        data: {
          type: 'lease_expiry',
          leaseId: leaseDoc.id,
          daysLeft: String(daysLeft),
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    }

    batch.update(leaseDoc.ref, { 'renewal.notificationSent': true });
  }

  await batch.commit();
  logger.info(`checkLeaseExpiry: processed ${expiringSnap.size} expiring leases`);
});
