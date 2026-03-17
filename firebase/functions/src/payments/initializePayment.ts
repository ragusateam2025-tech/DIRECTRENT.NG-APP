/**
 * PAY-001: initializePayment
 *
 * HTTPS Callable — authenticated tenant only.
 * Validates an accepted application, calculates the full cost breakdown,
 * creates a Paystack transaction, persists a `payments` document, and
 * returns the checkout URL for the mobile Paystack SDK.
 *
 * PRD ref: §2.1.4 — initializePayment
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { PaystackClient } from './paystack.client';
import { addDays, randomString } from '../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InitializePaymentRequest {
  applicationId: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'ussd';
}

interface PaymentBreakdown {
  annualRent: number;
  cautionDeposit: number;
  serviceCharge: number;
  platformFee: number;
  total: number;
}

// ─── Function ─────────────────────────────────────────────────────────────────

export const initializePayment = https.onCall(
  {
    enforceAppCheck: false,
    secrets: ['PAYSTACK_SECRET_KEY'],
    timeoutSeconds: 30,
  },
  async (request) => {
    // ── 1. Auth guard ───────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in to initialize payment.');
    }

    const tenantId = request.auth.uid;
    const { applicationId, paymentMethod } = request.data as InitializePaymentRequest;

    if (!applicationId || typeof applicationId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'applicationId is required.');
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // ── 2. Fetch application ────────────────────────────────────────────────
    const appSnap = await db.collection('applications').doc(applicationId).get();
    if (!appSnap.exists) {
      throw new https.HttpsError('not-found', 'Application not found.');
    }
    const application = appSnap.data()!;

    // ── 3. Ownership check ──────────────────────────────────────────────────
    if (application['tenantId'] !== tenantId) {
      throw new https.HttpsError('permission-denied', 'This application does not belong to you.');
    }

    // ── 4. Status check ─────────────────────────────────────────────────────
    if (application['status'] !== 'accepted') {
      throw new https.HttpsError(
        'failed-precondition',
        'Payment can only be initialized for accepted applications.'
      );
    }

    // ── 5. Return existing non-expired pending payment ──────────────────────
    const pendingSnap = await db
      .collection('payments')
      .where('applicationId', '==', applicationId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      const existing = pendingSnap.docs[0]!.data();
      if ((existing['expiresAt'] as admin.firestore.Timestamp).toMillis() > Date.now()) {
        logger.info(`Returning existing pending payment for applicationId=${applicationId}`);
        return {
          success: true,
          data: {
            reference: existing['id'] as string,
            authorizationUrl: existing['paystack']['authorizationUrl'] as string,
            accessCode: existing['paystack']['accessCode'] as string,
            expiresAt: (existing['expiresAt'] as admin.firestore.Timestamp).toDate().toISOString(),
            breakdown: existing['breakdown'] as PaymentBreakdown,
            escrowInfo: {
              depositAmount: (existing['breakdown'] as PaymentBreakdown).cautionDeposit,
              holdPeriodDays: 7,
              releaseDate: addDays(new Date(), 7).toISOString(),
            },
          },
        };
      }
    }

    // ── 6. Fetch property pricing ───────────────────────────────────────────
    const propertySnap = await db
      .collection('properties')
      .doc(application['propertyId'] as string)
      .get();

    if (!propertySnap.exists) {
      throw new https.HttpsError('not-found', 'Property not found.');
    }
    const property = propertySnap.data()!;
    const pricing = property['pricing'] as {
      annualRent: number;
      cautionDeposit: number;
      serviceCharge?: number;
    };

    // ── 7. Calculate breakdown ──────────────────────────────────────────────
    const breakdown: PaymentBreakdown = {
      annualRent: pricing.annualRent,
      cautionDeposit: pricing.cautionDeposit,
      serviceCharge: pricing.serviceCharge ?? 0,
      platformFee: Math.round(pricing.annualRent * 0.02),
      total: 0,
    };
    breakdown.total =
      breakdown.annualRent +
      breakdown.cautionDeposit +
      breakdown.serviceCharge +
      breakdown.platformFee;

    // ── 8. Get tenant email ─────────────────────────────────────────────────
    const userSnap = await db.collection('users').doc(tenantId).get();
    const email: string =
      (userSnap.data()?.['email'] as string | undefined) ??
      `${tenantId}@directrent.ng`;

    // ── 9. Generate unique reference ────────────────────────────────────────
    const reference = `DR-${Date.now()}-${randomString(8)}`;

    // ── 10. Build Paystack channels list ────────────────────────────────────
    const channels: string[] =
      paymentMethod != null
        ? [paymentMethod === 'ussd' ? 'ussd' : paymentMethod]
        : ['card', 'bank', 'ussd', 'bank_transfer'];

    // ── 11. Initialize Paystack transaction ─────────────────────────────────
    let paystackData: { authorization_url: string; access_code: string; reference: string };
    try {
      paystackData = await PaystackClient.initializeTransaction({
        email,
        amount: breakdown.total * 100, // Kobo
        reference,
        currency: 'NGN',
        callback_url: 'https://directrent.ng/payment/callback',
        channels,
        metadata: {
          tenantId,
          landlordId: application['landlordId'] as string,
          propertyId: application['propertyId'] as string,
          applicationId,
          breakdown,
          custom_fields: [
            {
              display_name: 'Property',
              variable_name: 'property',
              value: (property['title'] as string) ?? '',
            },
            {
              display_name: 'Address',
              variable_name: 'address',
              value: (property['location'] as { address?: string })?.address ?? '',
            },
          ],
        },
      });
    } catch (err: unknown) {
      logger.error('Paystack transaction initialization failed', err);
      throw new https.HttpsError(
        'unavailable',
        'Payment service is temporarily unavailable. Please try again.'
      );
    }

    // ── 12. Persist payment record ──────────────────────────────────────────
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000); // 30 min

    await db.collection('payments').doc(reference).set({
      id: reference,
      tenantId,
      landlordId: application['landlordId'],
      propertyId: application['propertyId'],
      applicationId,

      type: 'initial',
      status: 'pending',

      breakdown,
      currency: 'NGN',

      paystack: {
        reference,
        accessCode: paystackData.access_code,
        authorizationUrl: paystackData.authorization_url,
      },

      escrow: {
        status: 'pending',
        amount: breakdown.cautionDeposit,
        holdPeriodDays: 7,
      },

      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    logger.info(
      `Payment initialized: reference=${reference}, tenant=${tenantId}, ` +
        `application=${applicationId}, total=₦${breakdown.total}`
    );

    return {
      success: true,
      data: {
        reference,
        authorizationUrl: paystackData.authorization_url,
        accessCode: paystackData.access_code,
        expiresAt: expiresAt.toDate().toISOString(),
        breakdown,
        escrowInfo: {
          depositAmount: breakdown.cautionDeposit,
          holdPeriodDays: 7,
          releaseDate: addDays(new Date(), 7).toISOString(),
        },
      },
    };
  }
);
