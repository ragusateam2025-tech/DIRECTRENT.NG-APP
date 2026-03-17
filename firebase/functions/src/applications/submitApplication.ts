import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface SubmitApplicationData {
  propertyId: string;
  details: {
    preferredMoveIn: string;
    leaseDuration: '1_year' | '2_years' | '3_years';
    occupants: {
      adults: number;
      children?: number;
      pets?: { hasPets: boolean; petType?: string };
    };
    message: string;
  };
}

interface UserDoc {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  verification?: {
    bvn?: { status: string };
    nin?: { status: string };
  };
  profileCompleteness?: number;
}

interface TenantDoc {
  employment?: {
    status: string;
    employer?: string;
    role?: string;
    monthlyIncome?: string;
    verificationStatus: string;
  };
  rating?: {
    average: number;
    count: number;
  };
}

interface PropertyDoc {
  landlordId: string;
  status: {
    listing: string;
    availability: string;
  };
}

export const submitApplication = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const uid = request.auth.uid;
    const data = request.data as SubmitApplicationData;

    // 2. Validate input
    if (!data.propertyId || typeof data.propertyId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'propertyId is required');
    }
    if (!data.details?.preferredMoveIn || typeof data.details.preferredMoveIn !== 'string') {
      throw new https.HttpsError('invalid-argument', 'details.preferredMoveIn is required');
    }
    const validDurations = ['1_year', '2_years', '3_years'];
    if (!validDurations.includes(data.details.leaseDuration)) {
      throw new https.HttpsError(
        'invalid-argument',
        'details.leaseDuration must be 1_year, 2_years, or 3_years',
      );
    }
    if (
      typeof data.details?.occupants?.adults !== 'number' ||
      data.details.occupants.adults < 1
    ) {
      throw new https.HttpsError(
        'invalid-argument',
        'details.occupants.adults must be a number >= 1',
      );
    }
    if (!data.details?.message || typeof data.details.message !== 'string') {
      throw new https.HttpsError('invalid-argument', 'details.message is required');
    }
    if (data.details.message.trim().length < 20) {
      throw new https.HttpsError(
        'invalid-argument',
        'details.message must be at least 20 characters',
      );
    }

    const db = admin.firestore();
    const { propertyId, details } = data;

    // 3. Load property doc
    const propertyRef = db.collection('properties').doc(propertyId);
    const propertySnap = await propertyRef.get();
    if (!propertySnap.exists) {
      throw new https.HttpsError('not-found', 'Property not found');
    }
    const propertyData = propertySnap.data() as PropertyDoc;
    if (
      propertyData.status.listing !== 'active' ||
      propertyData.status.availability !== 'available'
    ) {
      throw new https.HttpsError('not-found', 'Property is not currently available');
    }

    // 4. Check tenant is NOT the landlord
    if (propertyData.landlordId === uid) {
      throw new https.HttpsError(
        'permission-denied',
        'Landlords cannot apply to their own properties',
      );
    }

    // 5. Check no existing non-rejected/non-withdrawn application
    const existingQuery = await db
      .collection('applications')
      .where('propertyId', '==', propertyId)
      .where('tenantId', '==', uid)
      .where('status', 'not-in', ['rejected', 'withdrawn', 'expired'])
      .limit(1)
      .get();
    if (!existingQuery.empty) {
      throw new https.HttpsError(
        'already-exists',
        'You already have an active application for this property',
      );
    }

    // 6. Load tenant doc and user doc
    const [tenantSnap, userSnap] = await Promise.all([
      db.collection('tenants').doc(uid).get(),
      db.collection('users').doc(uid).get(),
    ]);

    if (!userSnap.exists) {
      throw new https.HttpsError('not-found', 'User profile not found');
    }
    const userData = userSnap.data() as UserDoc;
    const tenantData = tenantSnap.exists ? (tenantSnap.data() as TenantDoc) : null;

    // 7. Build tenantSnapshot
    const tenantSnapshot = {
      name: `${userData.firstName} ${userData.lastName}`,
      photoUrl: userData.photoUrl ?? '',
      phone: userData.phone,
      email: userData.email ?? '',
      verification: {
        bvn: userData.verification?.bvn?.status === 'verified',
        nin: userData.verification?.nin?.status === 'verified',
        employment: tenantData?.employment?.verificationStatus === 'verified',
      },
      rating: tenantData?.rating ?? { average: 0, count: 0 },
      employmentInfo: tenantData?.employment
        ? {
            status: tenantData.employment.status,
            employer: tenantData.employment.employer ?? null,
            role: tenantData.employment.role ?? null,
            monthlyIncome: tenantData.employment.monthlyIncome ?? null,
          }
        : null,
      profileCompleteness: userData.profileCompleteness ?? 0,
    };

    // 8. Batch write
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    );

    const newApplicationRef = db.collection('applications').doc();

    batch.set(newApplicationRef, {
      propertyId,
      landlordId: propertyData.landlordId,
      tenantId: uid,
      status: 'pending',
      details: {
        preferredMoveIn: details.preferredMoveIn,
        leaseDuration: details.leaseDuration,
        occupants: {
          adults: details.occupants.adults,
          children: details.occupants.children ?? 0,
          pets: details.occupants.pets ?? { hasPets: false },
        },
        message: details.message,
      },
      tenantSnapshot,
      timeline: [
        {
          action: 'submitted',
          timestamp: now,
          actor: uid,
        },
      ],
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    batch.update(propertyRef, {
      'analytics.applicationCount': admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();

    // 9. Return result
    return { success: true, applicationId: newApplicationRef.id };
  },
);
