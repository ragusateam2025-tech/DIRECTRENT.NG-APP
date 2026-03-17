/**
 * SCHEDULED-001: dailyCleanup
 *
 * Runs every day at 02:00 Lagos time (01:00 UTC).
 *
 * Tasks:
 *  1. Expire stale applications — pending applications whose expiresAt has
 *     passed are moved to status 'expired'.
 *  2. Release held escrow — completed payments whose escrow.releaseDate has
 *     passed are moved to escrow.status 'released_to_landlord'.
 *  3. Stale unsigned leases — placeholder log only (complex domain logic
 *     deferred to a later sprint).
 *
 * Both update tasks use batched writes (Firestore max 500 per batch).
 */
import { scheduler } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

// ─── Helper: flush a batch and start a new one ─────────────────────────────────

async function flushBatch(
  batch: FirebaseFirestore.WriteBatch,
  db: FirebaseFirestore.Firestore
): Promise<FirebaseFirestore.WriteBatch> {
  await batch.commit();
  return db.batch();
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const dailyCleanup = scheduler.onSchedule(
  { schedule: '0 1 * * *', timeZone: 'Africa/Lagos' },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // ── Task 1: Expire stale pending applications ──────────────────────────
    const expiredApplicationsSnap = await db
      .collection('applications')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', now)
      .get();

    let expiredAppCount = 0;

    if (!expiredApplicationsSnap.empty) {
      let batch = db.batch();
      let opsInBatch = 0;

      for (const doc of expiredApplicationsSnap.docs) {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        opsInBatch += 1;
        expiredAppCount += 1;

        if (opsInBatch >= BATCH_SIZE) {
          batch = await flushBatch(batch, db);
          opsInBatch = 0;
        }
      }

      // Flush remaining ops
      if (opsInBatch > 0) {
        await batch.commit();
      }
    }

    console.log(
      `[dailyCleanup] Task 1 — expired applications: ${expiredAppCount} updated.`
    );

    // ── Task 2: Release held escrow payments whose release date has passed ─
    const dueEscrowSnap = await db
      .collection('payments')
      .where('escrow.status', '==', 'held')
      .where('escrow.releaseDate', '<=', now)
      .get();

    let releasedEscrowCount = 0;

    if (!dueEscrowSnap.empty) {
      let batch = db.batch();
      let opsInBatch = 0;

      for (const doc of dueEscrowSnap.docs) {
        batch.update(doc.ref, {
          'escrow.status': 'released_to_landlord',
          'escrow.releasedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        opsInBatch += 1;
        releasedEscrowCount += 1;

        if (opsInBatch >= BATCH_SIZE) {
          batch = await flushBatch(batch, db);
          opsInBatch = 0;
        }
      }

      // Flush remaining ops
      if (opsInBatch > 0) {
        await batch.commit();
      }
    }

    console.log(
      `[dailyCleanup] Task 2 — escrow releases: ${releasedEscrowCount} payments released to landlord.`
    );

    // ── Task 3: Stale unsigned leases (placeholder) ────────────────────────
    // Full domain logic (checking property rental status + 48-hour window) is
    // deferred to a later sprint. Logged for observability.
    console.log(
      '[dailyCleanup] Task 3 — stale unsigned lease expiry: deferred to later sprint.'
    );

    // ── Completion log ─────────────────────────────────────────────────────
    console.log('Daily cleanup completed', {
      timestamp: now.toDate().toISOString(),
      expiredApplications: expiredAppCount,
      escrowReleasedToLandlord: releasedEscrowCount,
    });
  }
);
