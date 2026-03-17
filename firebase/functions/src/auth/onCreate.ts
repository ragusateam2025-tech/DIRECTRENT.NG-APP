import { auth } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

/**
 * Triggered when a new user is created via Firebase Auth (phone OTP).
 * Creates the initial skeleton user document in Firestore.
 * Profile details (name, email, userType) are filled in by the createProfile function.
 */
export const onUserCreated = auth.user().onCreate(async (user) => {
  const { uid, phoneNumber } = user;

  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  const userDoc = {
    uid,
    phone: phoneNumber ?? null,
    email: null,
    userType: null,          // Set by createProfile after onboarding
    firstName: null,
    lastName: null,
    photoUrl: null,
    dateOfBirth: null,
    gender: null,

    verification: {
      phone: {
        verified: !!phoneNumber,
        verifiedAt: phoneNumber ? serverTimestamp : null,
      },
      email: {
        verified: false,
        verifiedAt: null,
        verificationToken: null,
      },
      bvn: {
        status: 'pending',
        last4: null,
        hash: null,
        verifiedAt: null,
        verifyMeRef: null,
        expiresAt: null,
      },
      nin: {
        status: 'pending',
        last4: null,
        hash: null,
        verifiedAt: null,
        verifyMeRef: null,
        expiresAt: null,
      },
    },

    profileComplete: false,
    profileCompleteness: 10,   // Phone verified = 10%

    settings: {
      notifications: {
        push: true,
        email: true,
        sms: true,
        marketing: false,
        newMessages: true,
        applicationUpdates: true,
        paymentReminders: true,
        priceDrops: true,
        newListings: true,
      },
      privacy: {
        showPhone: false,
        showEmail: false,
        profileVisibility: 'verified_only',
      },
      language: 'en',
      currency: 'NGN',
    },

    fcmTokens: [],
    lastLoginAt: serverTimestamp,
    lastActiveAt: serverTimestamp,
    loginCount: 1,
    status: 'active',
    suspensionReason: null,
    deletedAt: null,
    _searchName: null,

    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  };

  await admin.firestore().collection('users').doc(uid).set(userDoc);
});
