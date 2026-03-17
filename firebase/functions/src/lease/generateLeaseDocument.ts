/**
 * LEASE-001: generateLeaseDocument
 *
 * HTTPS Callable — authenticated tenant or landlord.
 * Validates an accepted application, gathers all required parties and
 * property data, then creates a `leases` document ready for e-signature.
 *
 * PRD ref: §3.1 — generateLeaseDocument
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateLeaseRequest {
  applicationId: string;
}

interface LeaseTerms {
  startDate: admin.firestore.Timestamp;
  endDate: admin.firestore.Timestamp;
  durationMonths: number;
  annualRent: number;
  monthlyRent: number;
  cautionDeposit: number;
  serviceCharge: number;
  noticePeriodDays: number;
  renewalOption: boolean;
}

interface LeaseParties {
  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
}

interface LeaseProperty {
  address: string;
  propertyType: string;
  bedrooms: number;
  area: string;
}

interface LeaseSignatures {
  landlord: { signed: boolean; signedAt: admin.firestore.Timestamp | null };
  tenant: { signed: boolean; signedAt: admin.firestore.Timestamp | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a leaseDuration string to the equivalent number of months.
 */
function mapDurationToMonths(leaseDuration: string): number {
  switch (leaseDuration) {
    case '2_years':
      return 24;
    case '3_years':
      return 36;
    case '1_year':
    default:
      return 12;
  }
}

/**
 * Adds the specified number of months to a Firestore Timestamp and
 * returns a new Timestamp.
 */
function addMonthsToTimestamp(
  ts: admin.firestore.Timestamp,
  months: number
): admin.firestore.Timestamp {
  const d = ts.toDate();
  d.setMonth(d.getMonth() + months);
  return admin.firestore.Timestamp.fromDate(d);
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const generateLeaseDocument = https.onCall(
  { enforceAppCheck: false, timeoutSeconds: 30 },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Login required');
    }

    const callerUid = request.auth.uid;
    const { applicationId } = request.data as GenerateLeaseRequest;

    if (!applicationId || typeof applicationId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'applicationId is required.');
    }

    const db = admin.firestore();

    // ── 2. Fetch application ───────────────────────────────────────────────
    const appSnap = await db.collection('applications').doc(applicationId).get();
    if (!appSnap.exists) {
      throw new https.HttpsError('not-found', 'Application not found.');
    }
    const application = appSnap.data() as Record<string, unknown>;

    // ── 3. Verify caller is a party to this application ────────────────────
    const tenantId = application['tenantId'] as string;
    const landlordId = application['landlordId'] as string;

    if (callerUid !== tenantId && callerUid !== landlordId) {
      throw new https.HttpsError(
        'permission-denied',
        'You are not a party to this application.'
      );
    }

    // ── 4. Verify application is accepted ──────────────────────────────────
    if (application['status'] !== 'accepted') {
      throw new https.HttpsError(
        'failed-precondition',
        'Lease can only be generated for accepted applications.'
      );
    }

    // ── 5. Check if a lease already exists for this application ───────────
    const existingLeaseSnap = await db
      .collection('leases')
      .where('applicationId', '==', applicationId)
      .limit(1)
      .get();

    if (!existingLeaseSnap.empty) {
      const existing = existingLeaseSnap.docs[0]!.data() as Record<string, unknown>;
      logger.info(`Returning existing lease for applicationId=${applicationId}`);
      return {
        leaseId: existingLeaseSnap.docs[0]!.id,
        status: existing['status'] as string,
      };
    }

    // ── 6. Fetch tenant user doc ───────────────────────────────────────────
    const tenantUserSnap = await db.collection('users').doc(tenantId).get();
    if (!tenantUserSnap.exists) {
      throw new https.HttpsError('not-found', 'Tenant user record not found.');
    }
    const tenantUser = tenantUserSnap.data() as Record<string, unknown>;
    const tenantName =
      `${(tenantUser['firstName'] as string) ?? ''} ${(tenantUser['lastName'] as string) ?? ''}`.trim();
    const tenantPhone = (tenantUser['phone'] as string) ?? '';

    // ── 7. Fetch landlord user doc ─────────────────────────────────────────
    const landlordUserSnap = await db.collection('users').doc(landlordId).get();
    if (!landlordUserSnap.exists) {
      throw new https.HttpsError('not-found', 'Landlord user record not found.');
    }
    const landlordUser = landlordUserSnap.data() as Record<string, unknown>;
    const landlordName =
      `${(landlordUser['firstName'] as string) ?? ''} ${(landlordUser['lastName'] as string) ?? ''}`.trim();
    const landlordPhone = (landlordUser['phone'] as string) ?? '';

    // ── 8. Fetch property doc ──────────────────────────────────────────────
    const propertyId = application['propertyId'] as string;
    const propertySnap = await db.collection('properties').doc(propertyId).get();
    if (!propertySnap.exists) {
      throw new https.HttpsError('not-found', 'Property not found.');
    }
    const property = propertySnap.data() as Record<string, unknown>;

    // ── 9. Fetch completed payment for this application ────────────────────
    const paymentSnap = await db
      .collection('payments')
      .where('applicationId', '==', applicationId)
      .where('status', '==', 'completed')
      .limit(1)
      .get();

    const paymentDoc = paymentSnap.empty ? null : paymentSnap.docs[0]!;
    const payment = paymentDoc ? (paymentDoc.data() as Record<string, unknown>) : null;

    // ── 10. Calculate lease terms ──────────────────────────────────────────
    const applicationDetails = (application['details'] ?? {}) as Record<string, unknown>;
    const leaseDurationStr = (applicationDetails['leaseDuration'] as string) ?? '1_year';
    const durationMonths = mapDurationToMonths(leaseDurationStr);

    // startDate: preferredMoveIn from application, or now + 7 days
    let startDate: admin.firestore.Timestamp;
    if (
      applicationDetails['preferredMoveIn'] &&
      applicationDetails['preferredMoveIn'] instanceof admin.firestore.Timestamp
    ) {
      startDate = applicationDetails['preferredMoveIn'] as admin.firestore.Timestamp;
    } else {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      startDate = admin.firestore.Timestamp.fromDate(sevenDaysFromNow);
    }

    const endDate = addMonthsToTimestamp(startDate, durationMonths);

    const pricing = (property['pricing'] ?? {}) as Record<string, unknown>;
    const annualRent = (pricing['annualRent'] as number) ?? 0;
    const monthlyRent = Math.round(annualRent / 12);

    const paymentBreakdown = payment
      ? ((payment['breakdown'] ?? {}) as Record<string, unknown>)
      : {};
    const cautionDeposit =
      (paymentBreakdown['cautionDeposit'] as number | undefined) ??
      (pricing['cautionDeposit'] as number | undefined) ??
      annualRent;
    const serviceCharge = (pricing['serviceCharge'] as number | undefined) ?? 0;

    const terms: LeaseTerms = {
      startDate,
      endDate,
      durationMonths,
      annualRent,
      monthlyRent,
      cautionDeposit,
      serviceCharge,
      noticePeriodDays: 30,
      renewalOption: true,
    };

    const parties: LeaseParties = {
      landlordName,
      landlordPhone,
      tenantName,
      tenantPhone,
    };

    const location = (property['location'] ?? {}) as Record<string, unknown>;
    const details = (property['details'] ?? {}) as Record<string, unknown>;

    const propertyData: LeaseProperty = {
      address: (location['address'] as string | undefined) ?? '',
      propertyType: (property['propertyType'] as string | undefined) ?? '',
      bedrooms: (details['bedrooms'] as number | undefined) ?? 0,
      area: (location['area'] as string | undefined) ?? '',
    };

    const signatures: LeaseSignatures = {
      landlord: { signed: false, signedAt: null },
      tenant: { signed: false, signedAt: null },
    };

    // ── 11. Write lease document ───────────────────────────────────────────
    const leaseRef = db.collection('leases').doc();
    await leaseRef.set({
      propertyId,
      landlordId,
      tenantId,
      applicationId,
      paymentId: payment ? (paymentDoc!.id ?? '') : '',
      status: 'pending_signature',
      terms,
      parties,
      property: propertyData,
      signatures,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Lease generated: leaseId=${leaseRef.id}, applicationId=${applicationId}, ` +
        `tenantId=${tenantId}, landlordId=${landlordId}`
    );

    return { leaseId: leaseRef.id, status: 'pending_signature' };
  }
);
