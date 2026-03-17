import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface CreateProfileInput {
  userType: 'tenant' | 'landlord';
  firstName: string;
  lastName: string;
  email: string;
}

function validateInput(data: unknown): CreateProfileInput {
  if (typeof data !== 'object' || data === null) {
    throw new https.HttpsError('invalid-argument', 'Request body must be an object');
  }

  const d = data as Record<string, unknown>;

  if (d.userType !== 'tenant' && d.userType !== 'landlord') {
    throw new https.HttpsError('invalid-argument', 'userType must be "tenant" or "landlord"');
  }
  if (typeof d.firstName !== 'string' || d.firstName.trim().length < 2) {
    throw new https.HttpsError('invalid-argument', 'firstName must be at least 2 characters');
  }
  if (typeof d.lastName !== 'string' || d.lastName.trim().length < 2) {
    throw new https.HttpsError('invalid-argument', 'lastName must be at least 2 characters');
  }
  if (typeof d.email !== 'string' || !d.email.includes('@')) {
    throw new https.HttpsError('invalid-argument', 'email must be a valid email address');
  }

  return {
    userType: d.userType,
    firstName: (d.firstName as string).trim(),
    lastName: (d.lastName as string).trim(),
    email: (d.email as string).trim().toLowerCase(),
  };
}

/**
 * Creates or completes a user profile after phone authentication.
 * Writes to `users/{uid}` and creates a role-specific doc in `tenants/` or `landlords/`.
 */
export const createProfile = https.onCall(async (request) => {
  if (!request.auth) {
    throw new https.HttpsError('unauthenticated', 'You must be logged in to create a profile');
  }

  const uid = request.auth.uid;
  const input = validateInput(request.data);

  const db = admin.firestore();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  // Prevent duplicate profile creation
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data()?.userType !== null && userDoc.data()?.userType !== undefined) {
    throw new https.HttpsError('already-exists', 'Profile already exists for this user');
  }

  const batch = db.batch();

  // Update the base user document (created by onUserCreate trigger)
  const userRef = db.collection('users').doc(uid);
  batch.update(userRef, {
    userType: input.userType,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    profileComplete: true,
    profileCompleteness: 40,
    _searchName: `${input.firstName} ${input.lastName}`.toLowerCase(),
    updatedAt: serverTimestamp,
  });

  if (input.userType === 'tenant') {
    const tenantRef = db.collection('tenants').doc(uid);
    batch.set(tenantRef, {
      uid,
      employment: { status: null, verificationStatus: 'pending' },
      preferences: {
        areas: [],
        minBudget: 0,
        maxBudget: 0,
        bedrooms: [],
        propertyTypes: [],
        amenities: [],
        alertsEnabled: false,
      },
      rentalHistory: { count: 0, previousLeases: [] },
      rating: {
        average: 0,
        count: 0,
        breakdown: {
          paymentTimeliness: 0,
          propertyUpkeep: 0,
          communication: 0,
          compliance: 0,
        },
      },
      savedProperties: [],
      savedSearches: [],
      viewedProperties: [],
      documents: {},
      activeLeases: [],
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });
  } else {
    const landlordRef = db.collection('landlords').doc(uid);
    batch.set(landlordRef, {
      uid,
      ownershipVerification: { status: 'pending', documents: [] },
      bankAccount: null,
      portfolio: {
        totalProperties: 0,
        activeListings: 0,
        occupiedProperties: 0,
        vacantProperties: 0,
        totalValue: 0,
        totalEarnings: 0,
        pendingPayments: 0,
      },
      subscription: {
        plan: 'free',
        status: 'active',
        features: {
          maxListings: 1,
          featuredListings: 0,
          analytics: false,
          prioritySupport: false,
          bulkUpload: false,
          apiAccess: false,
        },
      },
      rating: {
        average: 0,
        count: 0,
        breakdown: {
          communication: 0,
          propertyCondition: 0,
          maintenance: 0,
          valueForMoney: 0,
        },
      },
      responseMetrics: {
        averageResponseTime: 0,
        responseRate: 0,
        totalInquiries: 0,
        respondedInquiries: 0,
      },
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });
  }

  await batch.commit();

  return {
    success: true,
    data: {
      uid,
      userType: input.userType,
      profileCompleteness: 40,
    },
  };
});
