/**
 * generateDailyReport
 *
 * Scheduled Cloud Function — runs daily at midnight Lagos time (Africa/Lagos).
 * Aggregates key platform metrics for the previous calendar day and writes the
 * result to the dailyReports collection keyed by ISO date string.
 */
import { scheduler, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const generateDailyReport = scheduler.onSchedule(
  { schedule: 'every 24 hours', timeZone: 'Africa/Lagos' },
  async () => {
    const db = admin.firestore();

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    const yStart = admin.firestore.Timestamp.fromDate(yesterday);
    const yEnd = admin.firestore.Timestamp.fromDate(todayStart);
    const dateStr = yesterday.toISOString().split('T')[0] as string;

    // ── Count property views ─────────────────────────────────────────────────
    const viewsSnap = await db
      .collection('propertyViews')
      .where('viewedAt', '>=', yStart)
      .where('viewedAt', '<', yEnd)
      .count()
      .get();

    // ── Count new applications ───────────────────────────────────────────────
    const appsSnap = await db
      .collection('applications')
      .where('createdAt', '>=', yStart)
      .where('createdAt', '<', yEnd)
      .count()
      .get();

    // ── Count new user registrations ─────────────────────────────────────────
    const usersSnap = await db
      .collection('users')
      .where('createdAt', '>=', yStart)
      .where('createdAt', '<', yEnd)
      .count()
      .get();

    // ── Count completed payments ─────────────────────────────────────────────
    const paymentsSnap = await db
      .collection('payments')
      .where('status', '==', 'completed')
      .where('createdAt', '>=', yStart)
      .where('createdAt', '<', yEnd)
      .count()
      .get();

    const report = {
      date: dateStr,
      views: viewsSnap.data().count,
      applications: appsSnap.data().count,
      newUsers: usersSnap.data().count,
      completedPayments: paymentsSnap.data().count,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('dailyReports').doc(dateStr).set(report);

    logger.info(`generateDailyReport: report generated for ${dateStr}`, report);
  }
);
