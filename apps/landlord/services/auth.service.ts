import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { normalizePhone, isValidNigerianPhone } from '@directrent/shared';

export type UserProfile = {
  uid: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
  userType: 'tenant' | 'landlord' | null;
  profileComplete: boolean;
  profileCompleteness: number;
  verification: {
    bvn: { status: string };
    nin: { status: string };
    phone: { verified: boolean };
    email: { verified: boolean };
  };
};

export type CreateProfileInput = {
  userType: 'tenant' | 'landlord';
  firstName: string;
  lastName: string;
  email: string;
};

/**
 * Module-level store for the Firebase ConfirmationResult.
 * Cannot be serialized to router params, so held in memory between screens.
 */
let _pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export const AuthService = {
  async sendOTP(phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> {
    const normalized = normalizePhone(phoneNumber);
    if (!isValidNigerianPhone(normalized)) {
      throw new Error('Please enter a valid Nigerian phone number');
    }
    const confirmation = await auth().signInWithPhoneNumber(normalized);
    _pendingConfirmation = confirmation;
    return confirmation;
  },

  async verifyOTP(otp: string): Promise<FirebaseAuthTypes.UserCredential> {
    if (!_pendingConfirmation) {
      throw new Error('No pending verification. Please request a new code.');
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('Please enter a valid 6-digit code');
    }
    const credential = await _pendingConfirmation.confirm(otp);
    _pendingConfirmation = null;
    return credential;
  },

  hasPendingConfirmation(): boolean {
    return _pendingConfirmation !== null;
  },

  clearConfirmation(): void {
    _pendingConfirmation = null;
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const doc = await firestore().collection('users').doc(uid).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  },

  async createProfile(uid: string, data: CreateProfileInput): Promise<void> {
    const serverTimestamp = firestore.FieldValue.serverTimestamp();
    const batch = firestore().batch();

    const userRef = firestore().collection('users').doc(uid);
    batch.update(userRef, {
      userType: data.userType,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      profileComplete: true,
      profileCompleteness: 40,
      _searchName: `${data.firstName} ${data.lastName}`.toLowerCase(),
      updatedAt: serverTimestamp,
    });

    if (data.userType === 'tenant') {
      const tenantRef = firestore().collection('tenants').doc(uid);
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
      const landlordRef = firestore().collection('landlords').doc(uid);
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
  },

  async signOut(): Promise<void> {
    _pendingConfirmation = null;
    await auth().signOut();
  },
};
