# Directrent.ng Feature Specification
## Comprehensive Product Requirements Document for Agent Teams

**Document Version:** 1.0.0  
**Last Updated:** March 2026  
**Status:** Ready for Development  
**Domain:** www.directrent.ng

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Feature Priority Matrix](#2-feature-priority-matrix)
3. [Authentication & Onboarding](#3-authentication--onboarding)
4. [Identity Verification System](#4-identity-verification-system)
5. [Property Listing Management](#5-property-listing-management)
6. [Property Search & Discovery](#6-property-search--discovery)
7. [Application & Inquiry System](#7-application--inquiry-system)
8. [Messaging System](#8-messaging-system)
9. [Payment & Escrow System](#9-payment--escrow-system)
10. [Lease Management](#10-lease-management)
11. [Ratings & Reviews](#11-ratings--reviews)
12. [Analytics & Reporting](#12-analytics--reporting)
13. [Notification System](#13-notification-system)
14. [Admin & Moderation](#14-admin--moderation)

---

# 1. Document Overview

## 1.1 Purpose
This document provides detailed feature specifications for the Directrent.ng mobile application. Each feature includes user stories, acceptance criteria, technical specifications, API contracts, and testing requirements that Agent Teams can directly implement.

## 1.2 Agent Team Assignment

| Agent Team | Responsibility | Features |
|------------|----------------|----------|
| `frontend-tenant` | Tenant app UI/UX | Search, Property Details, Applications, Tenant Profile |
| `frontend-landlord` | Landlord app UI/UX | Dashboard, Listings, Applicant Management, Analytics |
| `backend` | Firebase & Cloud Functions | All database operations, business logic, security rules |
| `payments` | Paystack integration | Payment processing, escrow, withdrawals, receipts |
| `verification` | Identity verification | BVN/NIN verification, bank account verification |

## 1.3 Data Foundation (Primary Research)

All features are grounded in primary research (N=70: 50 tenants, 20 landlords):

**Tenant Pain Points (What We're Solving):**
- Unexpected fees during tenancy: Mean concern 4.18/5
- Losing security deposits unfairly: Mean concern 4.14/5
- Hidden property defects: Mean concern 4.10/5
- Fake agents/fraud risk: Mean concern 3.86-4.04/5
- Financial Friction Index: 3.5x higher with agents

**Landlord Pain Points (What We're Solving):**
- Payment delays: 93.3% experience with agents
- Extended vacancy: 39 extra days average
- Tenant turnover: 61% higher with agents
- Agent satisfaction: Only 3.07/5

**Feature Priorities (What Users Want Most):**
- Secure escrow services: 4.44/5 importance
- Background verification: 4.44/5 importance
- Ratings and reviews: 4.40/5 importance
- Verified credentials: 4.38/5 importance

---

# 2. Feature Priority Matrix

## 2.1 MVP Features (Phase 1 - Weeks 1-6)

| Priority | Feature | Tenant App | Landlord App | Backend |
|----------|---------|------------|--------------|---------|
| P0 | Phone Authentication | ✓ | ✓ | ✓ |
| P0 | Profile Creation | ✓ | ✓ | ✓ |
| P0 | BVN/NIN Verification | ✓ | ✓ | ✓ |
| P0 | Property Listing Creation | - | ✓ | ✓ |
| P0 | Property Search & Filters | ✓ | - | ✓ |
| P0 | Property Details View | ✓ | ✓ | ✓ |
| P0 | Direct Messaging | ✓ | ✓ | ✓ |
| P0 | Rental Application | ✓ | ✓ | ✓ |
| P0 | Push Notifications | ✓ | ✓ | ✓ |

## 2.2 Core Features (Phase 2 - Weeks 7-10)

| Priority | Feature | Tenant App | Landlord App | Backend |
|----------|---------|------------|--------------|---------|
| P1 | Paystack Payment Integration | ✓ | ✓ | ✓ |
| P1 | Security Deposit Escrow | ✓ | ✓ | ✓ |
| P1 | Digital Lease Generation | ✓ | ✓ | ✓ |
| P1 | Landlord Bank Verification | - | ✓ | ✓ |
| P1 | Property Analytics | - | ✓ | ✓ |
| P1 | Ratings & Reviews | ✓ | ✓ | ✓ |

## 2.3 Enhancement Features (Phase 3 - Weeks 11-14)

| Priority | Feature | Tenant App | Landlord App | Backend |
|----------|---------|------------|--------------|---------|
| P2 | Saved Properties & Alerts | ✓ | - | ✓ |
| P2 | Virtual Tour Integration | ✓ | ✓ | ✓ |
| P2 | Rent Payment Tracking | ✓ | ✓ | ✓ |
| P2 | Landlord Subscription Plans | - | ✓ | ✓ |
| P2 | Featured Listings | ✓ | ✓ | ✓ |
| P2 | Offline Mode | ✓ | ✓ | - |

---

# 3. Authentication & Onboarding

## 3.1 Feature Overview

**Feature ID:** AUTH-001  
**Feature Name:** Phone Number Authentication  
**Assigned To:** `backend`, `frontend-tenant`, `frontend-landlord`

### User Stories

```
AS A new user
I WANT TO sign up using my Nigerian phone number
SO THAT I can create an account without needing an email

AS A returning user
I WANT TO log in with my phone number and OTP
SO THAT I can securely access my account

AS A user
I WANT TO stay logged in across sessions
SO THAT I don't have to re-authenticate every time I open the app
```

### Acceptance Criteria

```gherkin
Feature: Phone Number Authentication

  Scenario: New user registration with valid Nigerian phone number
    Given I am on the phone number entry screen
    When I enter a valid Nigerian phone number "08012345678"
    And I tap "Continue"
    Then the system should send an OTP to "+2348012345678"
    And I should see the OTP verification screen
    And the OTP should expire after 5 minutes

  Scenario: OTP verification success
    Given I have received an OTP on my phone
    When I enter the correct 6-digit OTP "123456"
    Then I should be authenticated
    And if I am a new user, I should see the profile setup screen
    And if I am a returning user, I should see the home screen

  Scenario: Invalid phone number format
    Given I am on the phone number entry screen
    When I enter an invalid number "0701234"
    Then I should see an error "Please enter a valid Nigerian phone number"
    And the "Continue" button should be disabled

  Scenario: OTP resend with cooldown
    Given I am on the OTP verification screen
    And I have not received an OTP
    When I tap "Resend OTP"
    Then a new OTP should be sent
    And I should see a 60-second cooldown timer
    And the "Resend OTP" button should be disabled during cooldown

  Scenario: Maximum OTP attempts exceeded
    Given I have entered incorrect OTPs 5 times
    When I enter another incorrect OTP
    Then I should see "Too many attempts. Please try again in 1 hour."
    And I should be returned to the phone number entry screen
```

### Technical Specifications

#### 3.1.1 Phone Number Input Component

```typescript
// Component: PhoneNumberInput
// Location: packages/shared/components/PhoneNumberInput/

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
  loading?: boolean;
}

// Validation Rules
const VALIDATION = {
  // Accept: 08012345678, 8012345678, +2348012345678, 2348012345678
  pattern: /^(?:\+234|234|0)?[789][01]\d{8}$/,
  
  // Transform all formats to: +2348012345678
  normalize: (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+234')) return cleaned;
    if (cleaned.startsWith('234')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
    return `+234${cleaned}`;
  },
  
  // Display format: 0801 234 5678
  format: (phone: string): string => {
    const local = phone.replace('+234', '0');
    return `${local.slice(0,4)} ${local.slice(4,7)} ${local.slice(7)}`;
  }
};
```

#### 3.1.2 OTP Verification Component

```typescript
// Component: OTPInput
// Location: packages/shared/components/OTPInput/

interface OTPInputProps {
  length: 6;
  value: string;
  onChange: (value: string) => void;
  onComplete: (otp: string) => void;
  error?: string;
  autoFocus: true;
}

// OTP Configuration
const OTP_CONFIG = {
  length: 6,
  expirySeconds: 300,           // 5 minutes
  resendCooldownSeconds: 60,    // 1 minute between resends
  maxAttempts: 5,
  lockoutMinutes: 60            // 1 hour lockout after max attempts
};
```

#### 3.1.3 Firebase Authentication Flow

```typescript
// Service: auth.service.ts
// Location: packages/shared/services/

import auth from '@react-native-firebase/auth';

export const AuthService = {
  /**
   * Send OTP to phone number
   * @param phoneNumber - Normalized phone number (+234...)
   * @returns ConfirmationResult for OTP verification
   */
  sendOTP: async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
    // Validate Nigerian phone number
    if (!isValidNigerianPhone(phoneNumber)) {
      throw new Error('Invalid Nigerian phone number');
    }
    
    // Send OTP via Firebase
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    
    // Track analytics
    analytics().logEvent('otp_sent', { phone_masked: maskPhone(phoneNumber) });
    
    return confirmation;
  },
  
  /**
   * Verify OTP and sign in
   * @param confirmation - ConfirmationResult from sendOTP
   * @param otp - 6-digit OTP code
   * @returns User credential
   */
  verifyOTP: async (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    otp: string
  ): Promise<FirebaseAuthTypes.UserCredential> => {
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('OTP must be 6 digits');
    }
    
    // Verify OTP
    const credential = await confirmation.confirm(otp);
    
    // Track analytics
    analytics().logEvent('otp_verified', { 
      is_new_user: credential.additionalUserInfo?.isNewUser 
    });
    
    return credential;
  },
  
  /**
   * Check if user profile exists
   */
  checkUserExists: async (uid: string): Promise<boolean> => {
    const userDoc = await firestore().collection('users').doc(uid).get();
    return userDoc.exists;
  },
  
  /**
   * Sign out current user
   */
  signOut: async (): Promise<void> => {
    await auth().signOut();
  }
};
```

### API Contracts

#### 3.1.4 Cloud Function: onUserCreate

```typescript
// Function: onUserCreate
// Trigger: Firebase Auth onCreate
// Location: firebase/functions/src/auth/onCreate.ts

/**
 * Triggered when a new user is created in Firebase Auth
 * Creates initial user document in Firestore
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, phoneNumber } = user;
  
  // Create base user document
  await firestore().collection('users').doc(uid).set({
    uid,
    phone: phoneNumber,
    userType: null,           // Set during profile setup
    firstName: null,
    lastName: null,
    email: null,
    photoUrl: null,
    
    verification: {
      phone: { verified: true, verifiedAt: Timestamp.now() },
      email: { verified: false },
      bvn: { status: 'pending' },
      nin: { status: 'pending' }
    },
    
    profileComplete: false,
    profileCompleteness: 10,  // Phone verified = 10%
    
    settings: {
      notifications: { push: true, email: true, sms: true, marketing: false },
      privacy: { showPhone: false, showEmail: false }
    },
    
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
    fcmTokens: []
  });
  
  // Send welcome SMS via Termii
  await sendSMS(phoneNumber!, SMS_TEMPLATES.WELCOME);
  
  // Track analytics
  await analytics.logEvent('user_created', { uid });
  
  return { success: true };
});
```

### UI/UX Specifications

#### 3.1.5 Phone Entry Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Directrent Logo]                        │
│                                                             │
│                                                             │
│              Enter your phone number                        │
│       We'll send you a verification code                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🇳🇬 +234  │  0801 234 5678                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  By continuing, you agree to our Terms of Service          │
│  and Privacy Policy                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Continue                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.6 OTP Verification Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ←                                                          │
│                                                             │
│                    Verify your number                       │
│                                                             │
│         Enter the 6-digit code sent to                      │
│              +234 801 234 5678                              │
│                                                             │
│         ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐               │
│         │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │               │
│         └───┘ └───┘ └───┘ └───┘ └───┘ └───┘               │
│                                                             │
│              Code expires in 4:32                           │
│                                                             │
│         Didn't receive code? [Resend in 45s]               │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling

| Error Code | Condition | User Message | Action |
|------------|-----------|--------------|--------|
| AUTH_001 | Invalid phone format | "Please enter a valid Nigerian phone number" | Highlight input field |
| AUTH_002 | OTP expired | "Code expired. Please request a new one." | Show resend button |
| AUTH_003 | Invalid OTP | "Invalid code. Please try again." | Clear input, focus first digit |
| AUTH_004 | Max attempts exceeded | "Too many attempts. Try again in 1 hour." | Navigate to phone entry |
| AUTH_005 | Network error | "Connection error. Please check your internet." | Show retry button |
| AUTH_006 | Firebase error | "Something went wrong. Please try again." | Log error, show retry |

### Testing Requirements

```typescript
// Test file: auth.service.test.ts

describe('AuthService', () => {
  describe('sendOTP', () => {
    it('should send OTP for valid Nigerian phone number', async () => {
      const result = await AuthService.sendOTP('+2348012345678');
      expect(result.verificationId).toBeDefined();
    });
    
    it('should reject invalid phone number format', async () => {
      await expect(AuthService.sendOTP('12345')).rejects.toThrow('Invalid Nigerian phone number');
    });
    
    it('should normalize phone number before sending', async () => {
      // 08012345678 should become +2348012345678
      const result = await AuthService.sendOTP('08012345678');
      expect(result).toBeDefined();
    });
  });
  
  describe('verifyOTP', () => {
    it('should verify correct 6-digit OTP', async () => {
      const confirmation = await AuthService.sendOTP('+2348012345678');
      const result = await AuthService.verifyOTP(confirmation, '123456');
      expect(result.user).toBeDefined();
    });
    
    it('should reject OTP with wrong length', async () => {
      const confirmation = await AuthService.sendOTP('+2348012345678');
      await expect(AuthService.verifyOTP(confirmation, '12345')).rejects.toThrow('OTP must be 6 digits');
    });
  });
});
```

---

## 3.2 Profile Setup

**Feature ID:** AUTH-002  
**Feature Name:** User Profile Creation  
**Assigned To:** `frontend-tenant`, `frontend-landlord`, `backend`

### User Stories

```
AS A new tenant
I WANT TO create my profile with basic information
SO THAT landlords can learn about me

AS A new landlord
I WANT TO create my profile with property ownership details
SO THAT tenants can trust me

AS A user
I WANT TO upload a profile photo
SO THAT other users can recognize me
```

### Acceptance Criteria

```gherkin
Feature: Profile Setup

  Scenario: Complete tenant profile setup
    Given I am a new user after OTP verification
    When I select "I'm looking for a place to rent"
    And I enter my first name "Chidi"
    And I enter my last name "Okonkwo"
    And I enter my email "chidi@example.com"
    And I upload a profile photo
    And I tap "Continue"
    Then my profile should be created with userType "tenant"
    And I should see the BVN/NIN verification prompt
    And my profileCompleteness should be 40%

  Scenario: Complete landlord profile setup
    Given I am a new user after OTP verification
    When I select "I have property to rent out"
    And I complete basic profile information
    And I tap "Continue"
    Then my profile should be created with userType "landlord"
    And I should see the property ownership verification prompt

  Scenario: Skip optional verification
    Given I am on the BVN/NIN verification screen
    When I tap "Skip for now"
    Then I should see a warning about limited features
    And I should be able to proceed to the home screen
    And I should see a verification reminder banner

  Scenario: Profile photo requirements
    Given I am uploading a profile photo
    When I select an image larger than 10MB
    Then I should see "Image must be under 10MB"
    When I select a valid image
    Then the image should be cropped to a square
    And the image should be uploaded to Firebase Storage
```

### Technical Specifications

#### 3.2.1 Profile Setup Form

```typescript
// Component: ProfileSetupForm
// Location: packages/shared/components/ProfileSetupForm/

interface ProfileFormData {
  userType: 'tenant' | 'landlord';
  firstName: string;
  lastName: string;
  email: string;
  photoUri?: string;
}

const PROFILE_VALIDATION = z.object({
  userType: z.enum(['tenant', 'landlord']),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .regex(/^[a-zA-Z\-']+$/, 'First name can only contain letters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .regex(/^[a-zA-Z\-']+$/, 'Last name can only contain letters'),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  photoUri: z.string().url().optional()
});

// Profile completeness calculation
const calculateCompleteness = (profile: Partial<User>): number => {
  let score = 0;
  
  if (profile.phone) score += 10;                              // Phone verified
  if (profile.firstName && profile.lastName) score += 15;      // Name
  if (profile.email) score += 10;                              // Email
  if (profile.photoUrl) score += 15;                           // Photo
  if (profile.verification?.email?.verified) score += 10;      // Email verified
  if (profile.verification?.bvn?.status === 'verified') score += 20;   // BVN
  if (profile.verification?.nin?.status === 'verified') score += 20;   // NIN
  
  return score;
};
```

#### 3.2.2 Image Upload Service

```typescript
// Service: storage.service.ts
// Location: packages/shared/services/

import storage from '@react-native-firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const StorageService = {
  /**
   * Upload profile photo
   * - Resize to 500x500
   * - Compress to JPEG
   * - Upload to Firebase Storage
   */
  uploadProfilePhoto: async (
    userId: string,
    imageUri: string
  ): Promise<string> => {
    // Resize and compress
    const manipulated = await manipulateAsync(
      imageUri,
      [{ resize: { width: 500, height: 500 } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );
    
    // Generate unique filename
    const filename = `${userId}_${Date.now()}.jpg`;
    const storagePath = `users/${userId}/profile/${filename}`;
    
    // Upload to Firebase Storage
    const reference = storage().ref(storagePath);
    await reference.putFile(manipulated.uri);
    
    // Get download URL
    const downloadUrl = await reference.getDownloadURL();
    
    // Update user document
    await firestore().collection('users').doc(userId).update({
      photoUrl: downloadUrl,
      updatedAt: Timestamp.now()
    });
    
    return downloadUrl;
  }
};
```

#### 3.2.3 Profile Creation API

```typescript
// Function: createProfile
// Type: HTTPS Callable
// Location: firebase/functions/src/auth/createProfile.ts

interface CreateProfileInput {
  userType: 'tenant' | 'landlord';
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
}

export const createProfile = functions.https.onCall(
  async (data: CreateProfileInput, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const uid = context.auth.uid;
    
    // Validate input
    const validated = PROFILE_VALIDATION.parse(data);
    
    // Update user document
    const batch = firestore().batch();
    
    const userRef = firestore().collection('users').doc(uid);
    batch.update(userRef, {
      ...validated,
      profileComplete: true,
      profileCompleteness: calculateCompleteness({ ...validated, phone: true }),
      updatedAt: Timestamp.now()
    });
    
    // Create role-specific document
    if (validated.userType === 'tenant') {
      const tenantRef = firestore().collection('tenants').doc(uid);
      batch.set(tenantRef, {
        uid,
        employment: { status: null, verificationStatus: 'pending' },
        preferences: { areas: [], minBudget: 0, maxBudget: 0, bedrooms: [], propertyTypes: [], amenities: [] },
        rentalHistory: { count: 0, previousLeases: [] },
        rating: { average: 0, count: 0 },
        savedProperties: [],
        documents: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } else {
      const landlordRef = firestore().collection('landlords').doc(uid);
      batch.set(landlordRef, {
        uid,
        ownershipVerification: { status: 'pending', documents: [] },
        bankAccount: null,
        portfolio: { totalProperties: 0, activeListings: 0, occupiedProperties: 0, totalValue: 0 },
        subscription: { plan: 'free', status: 'active', features: { maxListings: 1, featuredListings: 0, analytics: false, prioritySupport: false } },
        rating: { average: 0, count: 0 },
        responseMetrics: { averageResponseTime: 0, responseRate: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    
    await batch.commit();
    
    // Send verification email
    await sendEmail(validated.email, EMAIL_TEMPLATES.VERIFY_EMAIL, {
      firstName: validated.firstName,
      verificationLink: await generateVerificationLink(uid)
    });
    
    return { success: true, profileCompleteness: calculateCompleteness({ ...validated, phone: true }) };
  }
);
```

---

# 4. Identity Verification System

## 4.1 BVN Verification

**Feature ID:** VERIFY-001  
**Feature Name:** Bank Verification Number (BVN) Verification  
**Assigned To:** `verification`, `backend`

### User Stories

```
AS A tenant
I WANT TO verify my identity using my BVN
SO THAT landlords can trust that I am who I say I am

AS A landlord
I WANT TO see if a tenant has verified their BVN
SO THAT I can make informed decisions about applications

AS A platform
I NEED TO verify user identities
SO THAT I can prevent fraud and build trust
```

### Acceptance Criteria

```gherkin
Feature: BVN Verification

  Scenario: Successful BVN verification
    Given I am on the BVN verification screen
    When I enter my 11-digit BVN "22123456789"
    And I tap "Verify BVN"
    Then the system should call the VerifyMe API
    And the response should match my profile name
    And my BVN status should be "verified"
    And I should see a success message
    And my profileCompleteness should increase by 20%

  Scenario: BVN does not match profile name
    Given I am on the BVN verification screen
    When I enter a BVN that returns a different name
    Then I should see "The name on this BVN doesn't match your profile"
    And I should be given options to:
      - Update my profile name to match BVN
      - Try a different BVN
      - Contact support

  Scenario: Invalid BVN format
    Given I am on the BVN verification screen
    When I enter "1234567"
    Then I should see "BVN must be 11 digits"
    And the "Verify" button should be disabled

  Scenario: BVN verification API failure
    Given the VerifyMe API is unavailable
    When I attempt to verify my BVN
    Then I should see "Verification service temporarily unavailable"
    And I should be able to retry or skip for now

  Scenario: BVN already verified by another user
    Given the BVN is already linked to another account
    When I attempt to verify with this BVN
    Then I should see "This BVN is already registered"
    And I should be advised to contact support
```

### Technical Specifications

#### 4.1.1 BVN Verification Service

```typescript
// Service: verification.service.ts
// Location: packages/shared/services/

interface BVNVerificationResult {
  success: boolean;
  data?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
    phoneNumber: string;
    gender: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const VerificationService = {
  /**
   * Verify BVN via Cloud Function
   * The actual API call happens server-side for security
   */
  verifyBVN: async (bvn: string): Promise<BVNVerificationResult> => {
    // Validate format
    if (!/^\d{11}$/.test(bvn)) {
      throw new Error('BVN must be 11 digits');
    }
    
    // Call Cloud Function
    const verifyBvnFn = functions().httpsCallable('verifyBvn');
    const result = await verifyBvnFn({ bvn });
    
    return result.data as BVNVerificationResult;
  }
};
```

#### 4.1.2 Cloud Function: verifyBvn

```typescript
// Function: verifyBvn
// Type: HTTPS Callable
// Location: firebase/functions/src/verification/verifyBvn.ts

import axios from 'axios';

const VERIFYME_CONFIG = {
  baseUrl: 'https://api.verifyme.ng/v1',
  apiKey: functions.config().verifyme.api_key
};

export const verifyBvn = functions.https.onCall(async (data, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const uid = context.auth.uid;
  const { bvn } = data;
  
  // Validate BVN format
  if (!/^\d{11}$/.test(bvn)) {
    throw new functions.https.HttpsError('invalid-argument', 'BVN must be 11 digits');
  }
  
  // Check if BVN already verified by another user
  const existingVerification = await firestore()
    .collection('users')
    .where('verification.bvn.hash', '==', hashBvn(bvn))
    .where('uid', '!=', uid)
    .get();
  
  if (!existingVerification.empty) {
    throw new functions.https.HttpsError('already-exists', 'This BVN is already registered');
  }
  
  try {
    // Call VerifyMe API
    const response = await axios.get(
      `${VERIFYME_CONFIG.baseUrl}/verifications/bvn/${bvn}`,
      {
        headers: {
          'Authorization': `Bearer ${VERIFYME_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const verifyMeData = response.data.data;
    
    // Get user profile to compare names
    const userDoc = await firestore().collection('users').doc(uid).get();
    const userProfile = userDoc.data();
    
    // Check name match (fuzzy)
    const nameMatch = compareNames(
      `${userProfile.firstName} ${userProfile.lastName}`,
      `${verifyMeData.firstname} ${verifyMeData.lastname}`
    );
    
    if (!nameMatch.matches && nameMatch.similarity < 0.8) {
      return {
        success: false,
        error: {
          code: 'NAME_MISMATCH',
          message: 'The name on this BVN doesn\'t match your profile',
          details: {
            profileName: `${userProfile.firstName} ${userProfile.lastName}`,
            bvnName: `${verifyMeData.firstname} ${verifyMeData.lastname}`,
            similarity: nameMatch.similarity
          }
        }
      };
    }
    
    // Update user verification status
    await firestore().collection('users').doc(uid).update({
      'verification.bvn': {
        status: 'verified',
        last4: bvn.slice(-4),
        verifiedAt: Timestamp.now(),
        verifyMeRef: response.data.id,
        hash: hashBvn(bvn)           // Store hash for duplicate detection
      },
      profileCompleteness: FieldValue.increment(20),
      updatedAt: Timestamp.now()
    });
    
    // Log verification for audit
    await firestore().collection('verificationLogs').add({
      uid,
      type: 'bvn',
      status: 'success',
      verifyMeRef: response.data.id,
      timestamp: Timestamp.now()
    });
    
    return {
      success: true,
      data: {
        firstName: verifyMeData.firstname,
        lastName: verifyMeData.lastname,
        dateOfBirth: verifyMeData.birthdate,
        phoneNumber: verifyMeData.phone
      }
    };
    
  } catch (error) {
    // Log failed verification
    await firestore().collection('verificationLogs').add({
      uid,
      type: 'bvn',
      status: 'failed',
      error: error.message,
      timestamp: Timestamp.now()
    });
    
    if (error.response?.status === 404) {
      throw new functions.https.HttpsError('not-found', 'BVN not found in national database');
    }
    
    throw new functions.https.HttpsError('internal', 'Verification service error');
  }
});

// Helper: Hash BVN for duplicate detection (never store raw BVN)
function hashBvn(bvn: string): string {
  const crypto = require('crypto');
  const salt = functions.config().security.bvn_salt;
  return crypto.createHmac('sha256', salt).update(bvn).digest('hex');
}

// Helper: Compare names with fuzzy matching
function compareNames(name1: string, name2: string): { matches: boolean; similarity: number } {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Calculate Levenshtein similarity
  const similarity = 1 - (levenshteinDistance(n1, n2) / Math.max(n1.length, n2.length));
  
  return {
    matches: similarity >= 0.85,
    similarity
  };
}
```

#### 4.1.3 UI Component: BVN Verification Screen

```typescript
// Screen: BVNVerificationScreen
// Location: apps/tenant/app/verification/bvn.tsx (and landlord equivalent)

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useVerification } from '@directrent/shared/hooks';
import { router } from 'expo-router';

export default function BVNVerificationScreen() {
  const [bvn, setBvn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { verifyBvn, loading } = useVerification();
  
  const handleVerify = async () => {
    setError(null);
    
    try {
      const result = await verifyBvn(bvn);
      
      if (result.success) {
        Alert.alert(
          'Verification Successful',
          `Your identity has been verified as ${result.data.firstName} ${result.data.lastName}`,
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.error?.code === 'NAME_MISMATCH') {
        Alert.alert(
          'Name Mismatch',
          result.error.message,
          [
            { text: 'Update Profile', onPress: () => handleUpdateProfile(result.error.details.bvnName) },
            { text: 'Try Different BVN', onPress: () => setBvn('') },
            { text: 'Contact Support', onPress: () => openSupport() }
          ]
        );
      }
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const isValidBvn = /^\d{11}$/.test(bvn);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Identity</Text>
      <Text style={styles.subtitle}>
        Enter your Bank Verification Number (BVN) to verify your identity
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>BVN (11 digits)</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={bvn}
          onChangeText={setBvn}
          placeholder="Enter your 11-digit BVN"
          keyboardType="number-pad"
          maxLength={11}
          editable={!loading}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 Your data is secure</Text>
        <Text style={styles.infoText}>
          We use bank-grade encryption and never store your full BVN.
          Verification is powered by VerifyMe, a CBN-licensed provider.
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.button, (!isValidBvn || loading) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={!isValidBvn || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify BVN'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
      
      <Text style={styles.skipWarning}>
        Without verification, you won't be able to message landlords or submit applications.
      </Text>
    </View>
  );
}
```

### Data Security Requirements

```typescript
// CRITICAL: BVN/NIN Security Rules

const SECURITY_REQUIREMENTS = {
  storage: {
    // NEVER store raw BVN/NIN
    rawBvn: false,
    rawNin: false,
    
    // Store only:
    last4Digits: true,        // For display: "****6789"
    hashedValue: true,        // For duplicate detection
    verificationStatus: true, // 'pending' | 'verified' | 'failed'
    verifiedAt: true,         // Timestamp
    verifyMeRef: true         // External reference ID
  },
  
  transmission: {
    // BVN/NIN only transmitted to:
    cloudFunctions: true,     // Server-side only
    verifyMeApi: true,        // Via server
    clientApp: false          // NEVER send to client after verification
  },
  
  logging: {
    // Audit logs contain:
    userId: true,
    verificationType: true,
    status: true,
    timestamp: true,
    // NEVER log:
    fullBvn: false,
    fullNin: false
  },
  
  access: {
    // Who can see verification status:
    owner: true,              // User can see their own status
    landlords: true,          // Can see "verified" badge, not details
    tenants: true,            // Can see landlord "verified" badge
    admins: true              // Can see status for support
  }
};
```

---

## 4.2 NIN Verification

**Feature ID:** VERIFY-002  
**Feature Name:** National Identification Number (NIN) Verification  
**Assigned To:** `verification`, `backend`

### Technical Specifications

```typescript
// Function: verifyNin
// Type: HTTPS Callable
// Location: firebase/functions/src/verification/verifyNin.ts

// Nearly identical to BVN verification, but uses NIN endpoint
export const verifyNin = functions.https.onCall(async (data, context) => {
  // ... authentication and validation ...
  
  try {
    const response = await axios.get(
      `${VERIFYME_CONFIG.baseUrl}/verifications/nin/${data.nin}`,
      {
        headers: {
          'Authorization': `Bearer ${VERIFYME_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Process response (same as BVN)
    // ...
    
  } catch (error) {
    // Error handling (same as BVN)
  }
});
```

---

## 4.3 Bank Account Verification (Landlords)

**Feature ID:** VERIFY-003  
**Feature Name:** Bank Account Verification for Payment Withdrawals  
**Assigned To:** `verification`, `payments`, `backend`

### User Stories

```
AS A landlord
I WANT TO add and verify my bank account
SO THAT I can receive rent payments from tenants

AS the platform
I NEED TO verify bank accounts belong to the landlord
SO THAT I can securely transfer funds
```

### Technical Specifications

```typescript
// Function: verifyBankAccount
// Type: HTTPS Callable
// Location: firebase/functions/src/verification/verifyBankAccount.ts

interface BankAccountInput {
  bankCode: string;         // e.g., "058" for GTBank
  accountNumber: string;    // 10 digits
}

export const verifyBankAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const uid = context.auth.uid;
  const { bankCode, accountNumber } = data;
  
  // Validate account number format
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new functions.https.HttpsError('invalid-argument', 'Account number must be 10 digits');
  }
  
  // Verify user is a landlord
  const userDoc = await firestore().collection('users').doc(uid).get();
  if (userDoc.data()?.userType !== 'landlord') {
    throw new functions.https.HttpsError('permission-denied', 'Only landlords can add bank accounts');
  }
  
  try {
    // Step 1: Resolve account name via Paystack
    const resolveResponse = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        }
      }
    );
    
    const accountName = resolveResponse.data.data.account_name;
    
    // Step 2: Create transfer recipient in Paystack
    const recipientResponse = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const recipientCode = recipientResponse.data.data.recipient_code;
    
    // Step 3: Store verified bank account
    await firestore().collection('landlords').doc(uid).update({
      bankAccount: {
        bankCode,
        bankName: getBankName(bankCode),
        accountNumber: encryptAccountNumber(accountNumber),
        accountNumberLast4: accountNumber.slice(-4),
        accountName,
        verified: true,
        paystackRecipientCode: recipientCode,
        verifiedAt: Timestamp.now()
      },
      updatedAt: Timestamp.now()
    });
    
    return {
      success: true,
      data: {
        accountName,
        bankName: getBankName(bankCode),
        accountNumberLast4: accountNumber.slice(-4)
      }
    };
    
  } catch (error) {
    if (error.response?.status === 422) {
      throw new functions.https.HttpsError('invalid-argument', 'Could not resolve account. Please check the details.');
    }
    throw new functions.https.HttpsError('internal', 'Bank verification failed');
  }
});

// Nigerian banks list
const NIGERIAN_BANKS = [
  { code: '058', name: 'GTBank' },
  { code: '044', name: 'Access Bank' },
  { code: '011', name: 'First Bank' },
  { code: '033', name: 'UBA' },
  { code: '057', name: 'Zenith Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '032', name: 'Union Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '214', name: 'FCMB' },
  { code: '039', name: 'Stanbic IBTC' },
  // ... more banks
];
```

---

*Continued in FEATURE_SPEC_PART2.md...*
