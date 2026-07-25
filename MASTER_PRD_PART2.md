# DIRECTRENT.NG MASTER PRD — PART 2
## API Contracts, Error Handling & Security Specifications

---

# 2. COMPLETE API CONTRACTS

## 2.1 Cloud Functions API Reference

### 2.1.1 Authentication Functions

#### `sendOTP` — Request OTP for Phone Verification

```typescript
// Function: sendOTP
// Type: HTTPS Callable
// Rate Limit: 3 requests per 5 minutes per phone number

// REQUEST
interface SendOTPRequest {
  phone: string;          // Nigerian phone: "08012345678" or "+2348012345678"
  purpose: 'login' | 'signup' | 'reset';
}

// RESPONSE (Success)
interface SendOTPResponse {
  success: true;
  data: {
    phoneNormalized: string;     // "+2348012345678"
    expiresIn: number;           // 300 (seconds)
    resendAvailableIn: number;   // 60 (seconds)
    attemptsRemaining: number;   // 5
  };
}

// RESPONSE (Error)
interface SendOTPErrorResponse {
  success: false;
  error: {
    code: 'INVALID_PHONE' | 'RATE_LIMITED' | 'BLOCKED' | 'SERVICE_ERROR';
    message: string;
    details?: {
      retryAfter?: number;       // Seconds until retry allowed
      blockedUntil?: string;     // ISO timestamp
    };
  };
}

// IMPLEMENTATION
export const sendOTP = functions.https.onCall(async (data, context) => {
  const { phone, purpose } = data;
  
  // 1. Validate phone format
  const phoneRegex = /^(?:\+234|234|0)?[789][01]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid Nigerian phone number', {
      code: 'INVALID_PHONE'
    });
  }
  
  // 2. Normalize phone to E.164
  const normalized = normalizePhone(phone);  // → "+2348012345678"
  
  // 3. Check rate limit
  const rateLimitKey = `otp:${normalized}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, 300);  // 5 min window
  
  if (attempts > 3) {
    const ttl = await redis.ttl(rateLimitKey);
    throw new functions.https.HttpsError('resource-exhausted', 'Too many OTP requests', {
      code: 'RATE_LIMITED',
      details: { retryAfter: ttl }
    });
  }
  
  // 4. Check if phone is blocked
  const blockDoc = await firestore()
    .collection('blockedPhones')
    .doc(normalized)
    .get();
  
  if (blockDoc.exists && blockDoc.data()!.blockedUntil > Timestamp.now()) {
    throw new functions.https.HttpsError('permission-denied', 'Phone number temporarily blocked', {
      code: 'BLOCKED',
      details: { blockedUntil: blockDoc.data()!.blockedUntil.toDate().toISOString() }
    });
  }
  
  // 5. Generate and send OTP via Firebase Auth
  // (Actual OTP is handled by Firebase Phone Auth on client)
  // This function just validates and tracks
  
  // 6. Log attempt
  await firestore().collection('otpLogs').add({
    phone: normalized,
    purpose,
    timestamp: Timestamp.now(),
    ip: context.rawRequest.ip
  });
  
  return {
    success: true,
    data: {
      phoneNormalized: normalized,
      expiresIn: 300,
      resendAvailableIn: 60,
      attemptsRemaining: 3 - attempts
    }
  };
});
```

#### `createUserProfile` — Create User Profile After OTP Verification

```typescript
// Function: createUserProfile
// Type: HTTPS Callable
// Requires: Authenticated user

// REQUEST
interface CreateUserProfileRequest {
  userType: 'tenant' | 'landlord';
  firstName: string;              // 2-50 chars, letters only
  lastName: string;               // 2-50 chars, letters only
  email?: string;                 // Valid email format
  photoUri?: string;              // Local URI for upload
  dateOfBirth?: string;           // ISO date string (YYYY-MM-DD)
  gender?: 'male' | 'female' | 'other';
}

// RESPONSE (Success)
interface CreateUserProfileResponse {
  success: true;
  data: {
    userId: string;
    userType: 'tenant' | 'landlord';
    profileCompleteness: number;
    nextStep: 'verification' | 'home';
    verificationRequired: boolean;
  };
}

// VALIDATION SCHEMA
const createUserProfileSchema = z.object({
  userType: z.enum(['tenant', 'landlord']),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .regex(/^[a-zA-Z\-']+$/, 'First name can only contain letters, hyphens, and apostrophes'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .regex(/^[a-zA-Z\-']+$/, 'Last name can only contain letters'),
  email: z.string().email().toLowerCase().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other']).optional()
});

// ERROR CODES
const PROFILE_ERRORS = {
  NOT_AUTHENTICATED: 'User must be authenticated',
  PROFILE_EXISTS: 'Profile already created',
  VALIDATION_FAILED: 'Invalid profile data',
  PHOTO_UPLOAD_FAILED: 'Failed to upload profile photo',
  DATABASE_ERROR: 'Failed to save profile'
};
```

### 2.1.2 Verification Functions

#### `verifyBVN` — Bank Verification Number Verification

```typescript
// Function: verifyBVN
// Type: HTTPS Callable
// Requires: Authenticated user
// External API: VerifyMe

// REQUEST
interface VerifyBVNRequest {
  bvn: string;              // Exactly 11 digits
  consentGiven: true;       // Must be true (NDPR compliance)
}

// RESPONSE (Success)
interface VerifyBVNSuccessResponse {
  success: true;
  data: {
    verified: true;
    firstName: string;           // From BVN record
    lastName: string;
    dateOfBirth: string;
    matchScore: number;          // 0-100 name match score
    verifiedAt: string;          // ISO timestamp
    reference: string;           // VerifyMe reference
  };
}

// RESPONSE (Name Mismatch)
interface VerifyBVNMismatchResponse {
  success: false;
  error: {
    code: 'NAME_MISMATCH';
    message: string;
    details: {
      profileName: string;
      bvnName: string;
      matchScore: number;
      options: ['update_profile', 'try_different_bvn', 'contact_support'];
    };
  };
}

// RESPONSE (Other Errors)
interface VerifyBVNErrorResponse {
  success: false;
  error: {
    code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'ALREADY_REGISTERED' | 
          'SERVICE_UNAVAILABLE' | 'CONSENT_REQUIRED' | 'RATE_LIMITED';
    message: string;
    details?: Record<string, any>;
  };
}

// IMPLEMENTATION
export const verifyBVN = functions
  .runWith({ 
    timeoutSeconds: 30,
    memory: '256MB',
    secrets: ['VERIFYME_API_KEY', 'BVN_HASH_SALT']
  })
  .https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', VERIFICATION_ERRORS.NOT_AUTHENTICATED);
    }
    
    const uid = context.auth.uid;
    
    // 2. Validate input
    if (!/^\d{11}$/.test(data.bvn)) {
      throw new functions.https.HttpsError('invalid-argument', 'BVN must be exactly 11 digits', {
        code: 'INVALID_FORMAT'
      });
    }
    
    if (data.consentGiven !== true) {
      throw new functions.https.HttpsError('invalid-argument', 'Consent is required for BVN verification', {
        code: 'CONSENT_REQUIRED'
      });
    }
    
    // 3. Check for duplicate BVN (another user)
    const bvnHash = createHmac('sha256', process.env.BVN_HASH_SALT!)
      .update(data.bvn)
      .digest('hex');
    
    const existingUser = await firestore()
      .collection('users')
      .where('verification.bvn.hash', '==', bvnHash)
      .where('uid', '!=', uid)
      .limit(1)
      .get();
    
    if (!existingUser.empty) {
      throw new functions.https.HttpsError('already-exists', 'This BVN is registered to another account', {
        code: 'ALREADY_REGISTERED'
      });
    }
    
    // 4. Check rate limit (1 attempt per 5 minutes)
    const recentAttempt = await firestore()
      .collection('verificationLogs')
      .where('uid', '==', uid)
      .where('type', '==', 'bvn')
      .where('timestamp', '>', Timestamp.fromMillis(Date.now() - 5 * 60 * 1000))
      .limit(1)
      .get();
    
    if (!recentAttempt.empty) {
      throw new functions.https.HttpsError('resource-exhausted', 'Please wait 5 minutes between verification attempts', {
        code: 'RATE_LIMITED'
      });
    }
    
    // 5. Call VerifyMe API
    try {
      const response = await axios.get(
        `https://api.verifyme.ng/v1/verifications/bvn/${data.bvn}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.VERIFYME_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      const bvnData = response.data.data;
      
      // 6. Get user profile for name comparison
      const userDoc = await firestore().collection('users').doc(uid).get();
      const user = userDoc.data()!;
      
      // 7. Compare names (fuzzy matching)
      const profileName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const bvnName = `${bvnData.firstname} ${bvnData.lastname}`.toLowerCase();
      const matchScore = calculateNameSimilarity(profileName, bvnName);
      
      if (matchScore < 80) {
        // Log failed attempt
        await logVerification(uid, 'bvn', 'name_mismatch', { matchScore });
        
        return {
          success: false,
          error: {
            code: 'NAME_MISMATCH',
            message: 'The name on this BVN does not match your profile',
            details: {
              profileName: `${user.firstName} ${user.lastName}`,
              bvnName: `${bvnData.firstname} ${bvnData.lastname}`,
              matchScore,
              options: ['update_profile', 'try_different_bvn', 'contact_support']
            }
          }
        };
      }
      
      // 8. Success - Update user document
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
      
      await firestore().collection('users').doc(uid).update({
        'verification.bvn': {
          status: 'verified',
          last4: data.bvn.slice(-4),
          hash: bvnHash,
          verifiedAt: now,
          verifyMeRef: response.data.id,
          expiresAt
        },
        profileCompleteness: FieldValue.increment(20),
        updatedAt: now
      });
      
      // 9. Log success
      await logVerification(uid, 'bvn', 'success', { verifyMeRef: response.data.id });
      
      return {
        success: true,
        data: {
          verified: true,
          firstName: bvnData.firstname,
          lastName: bvnData.lastname,
          dateOfBirth: bvnData.birthdate,
          matchScore,
          verifiedAt: now.toDate().toISOString(),
          reference: response.data.id
        }
      };
      
    } catch (error: any) {
      // Log failure
      await logVerification(uid, 'bvn', 'error', { error: error.message });
      
      if (error.response?.status === 404) {
        throw new functions.https.HttpsError('not-found', 'BVN not found in national database', {
          code: 'NOT_FOUND'
        });
      }
      
      throw new functions.https.HttpsError('unavailable', 'Verification service temporarily unavailable', {
        code: 'SERVICE_UNAVAILABLE'
      });
    }
  });

// Helper: Log verification attempt
async function logVerification(
  uid: string, 
  type: 'bvn' | 'nin' | 'bank',
  status: 'success' | 'error' | 'name_mismatch',
  metadata: Record<string, any>
) {
  await firestore().collection('verificationLogs').add({
    uid,
    type,
    status,
    metadata,
    timestamp: Timestamp.now()
  });
}

// Helper: Calculate name similarity (Levenshtein-based)
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().replace(/[^a-z]/g, '');
  const s2 = name2.toLowerCase().replace(/[^a-z]/g, '');
  
  if (s1 === s2) return 100;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= s2.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round((1 - distance / maxLength) * 100);
}
```

### 2.1.3 Property Functions

#### `createListing` — Create New Property Listing

```typescript
// Function: createListing
// Type: HTTPS Callable
// Requires: Authenticated landlord with verification

// REQUEST
interface CreateListingRequest {
  basicInfo: {
    title: string;                    // 10-100 chars
    propertyType: PropertyType;
    bedrooms: number;                 // 0-10
    bathrooms: number;                // 1-10
    toilets?: number;
    sizeSqm?: number;                 // 10-2000
    yearBuilt?: number;               // 1960-current
    furnishing: FurnishingType;
  };
  
  location: {
    address: string;                  // 10-200 chars
    area: string;                     // Must be valid Lagos area
    lga: string;
    coordinates: {
      latitude: number;               // 6.3-6.7 (Lagos bounds)
      longitude: number;              // 3.0-4.0
    };
    nearbyLandmarks?: string[];       // Max 5
  };
  
  media: {
    photos: Array<{
      uri: string;                    // Firebase Storage path or upload URI
      order: number;
      isPrimary: boolean;
    }>;
    virtualTourUrl?: string;
    videoUrl?: string;
  };
  
  pricing: {
    annualRent: number;               // 100,000 - 50,000,000
    cautionDepositMonths: number;     // 6, 12, 18, 24
    serviceCharge?: number;           // 0+
    agreementFee?: number;            // 0+
  };
  
  details: {
    description: string;              // 50-2000 chars
    amenities: string[];              // Valid amenity IDs
    petPolicy: PetPolicy;
    smokingPolicy?: SmokingPolicy;
    maxOccupants: number;             // 1-10
    customRules?: string[];           // Max 10
  };
  
  draftId?: string;                   // If converting from draft
}

// RESPONSE (Success)
interface CreateListingSuccessResponse {
  success: true;
  data: {
    propertyId: string;
    status: 'active';
    publishedAt: string;
    expiresAt: string;
    pricing: {
      annualRent: number;
      cautionDeposit: number;
      serviceCharge: number;
      platformFee: number;
      totalUpfront: number;
      agentSavings: number;
    };
    analytics: {
      estimatedViews: number;         // Based on area/price
      competitorCount: number;
    };
  };
}

// VALIDATION
const createListingSchema = z.object({
  basicInfo: z.object({
    title: z.string().min(10).max(100),
    propertyType: z.enum([
      'self_contained', 'mini_flat', 'one_bedroom', 'two_bedroom',
      'three_bedroom', 'four_bedroom', 'duplex', 'bungalow',
      'boys_quarters', 'penthouse', 'studio'
    ]),
    bedrooms: z.number().int().min(0).max(10),
    bathrooms: z.number().int().min(1).max(10),
    toilets: z.number().int().min(1).max(10).optional(),
    sizeSqm: z.number().min(10).max(2000).optional(),
    yearBuilt: z.number().int().min(1960).max(new Date().getFullYear()).optional(),
    furnishing: z.enum(['unfurnished', 'semi_furnished', 'fully_furnished'])
  }),
  
  location: z.object({
    address: z.string().min(10).max(200),
    area: z.string().refine(
      area => VALID_LAGOS_AREAS.includes(area),
      'Please select a valid Lagos area'
    ),
    lga: z.string().min(2),
    coordinates: z.object({
      latitude: z.number().min(6.3).max(6.7),
      longitude: z.number().min(3.0).max(4.0)
    }),
    nearbyLandmarks: z.array(z.string()).max(5).optional()
  }),
  
  media: z.object({
    photos: z.array(z.object({
      uri: z.string(),
      order: z.number(),
      isPrimary: z.boolean()
    })).min(5, 'Please upload at least 5 photos').max(20),
    virtualTourUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional()
  }),
  
  pricing: z.object({
    annualRent: z.number()
      .min(100000, 'Minimum rent is ₦100,000')
      .max(50000000, 'Maximum rent is ₦50,000,000'),
    cautionDepositMonths: z.number().refine(
      m => [6, 12, 18, 24].includes(m),
      'Caution deposit must be 6, 12, 18, or 24 months'
    ),
    serviceCharge: z.number().min(0).optional(),
    agreementFee: z.number().min(0).optional()
  }),
  
  details: z.object({
    description: z.string().min(50).max(2000),
    amenities: z.array(z.string()).min(1),
    petPolicy: z.enum(['no_pets', 'small_pets', 'cats_only', 'dogs_only', 'all_pets']),
    smokingPolicy: z.enum(['no_smoking', 'outdoor_only', 'allowed']).optional(),
    maxOccupants: z.number().int().min(1).max(10),
    customRules: z.array(z.string().max(200)).max(10).optional()
  }),
  
  draftId: z.string().optional()
});

// ERROR CODES
const LISTING_ERRORS = {
  NOT_LANDLORD: 'Only landlords can create listings',
  NOT_VERIFIED: 'Please verify your identity before listing',
  LISTING_LIMIT: 'You have reached your listing limit',
  INVALID_AREA: 'Please select a valid Lagos area',
  INSUFFICIENT_PHOTOS: 'Please upload at least 5 photos',
  PHOTO_UPLOAD_FAILED: 'Failed to process photos',
  INVALID_COORDINATES: 'Location is outside Lagos',
  DATABASE_ERROR: 'Failed to save listing'
};
```

### 2.1.4 Payment Functions

#### `initializePayment` — Initialize Paystack Transaction

```typescript
// Function: initializePayment
// Type: HTTPS Callable
// Requires: Authenticated tenant with accepted application

// REQUEST
interface InitializePaymentRequest {
  applicationId: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'ussd';
}

// RESPONSE (Success)
interface InitializePaymentSuccessResponse {
  success: true;
  data: {
    reference: string;               // Unique payment reference
    authorizationUrl: string;        // Paystack checkout URL
    accessCode: string;              // For mobile SDK
    expiresAt: string;               // ISO timestamp (30 mins)
    
    breakdown: {
      annualRent: number;
      cautionDeposit: number;
      serviceCharge: number;
      platformFee: number;
      total: number;
    };
    
    escrowInfo: {
      depositAmount: number;
      holdPeriodDays: 7;
      releaseDate: string;           // Estimated release date
    };
  };
}

// IMPLEMENTATION
export const initializePayment = functions
  .runWith({ 
    timeoutSeconds: 30,
    secrets: ['PAYSTACK_SECRET_KEY']
  })
  .https.onCall(async (data, context) => {
    // 1. Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const tenantId = context.auth.uid;
    const { applicationId, paymentMethod } = data;
    
    // 2. Get application
    const appDoc = await firestore().collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Application not found');
    }
    
    const application = appDoc.data()!;
    
    // 3. Validate application belongs to tenant
    if (application.tenantId !== tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your application');
    }
    
    // 4. Validate application status
    if (application.status !== 'accepted') {
      throw new functions.https.HttpsError('failed-precondition', 'Application must be accepted');
    }
    
    // 5. Check for existing pending payment
    const pendingPayment = await firestore()
      .collection('payments')
      .where('applicationId', '==', applicationId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (!pendingPayment.empty) {
      const existing = pendingPayment.docs[0].data();
      // Return existing if not expired
      if (existing.expiresAt > Timestamp.now()) {
        return {
          success: true,
          data: {
            reference: existing.id,
            authorizationUrl: existing.paystack.authorizationUrl,
            accessCode: existing.paystack.accessCode,
            expiresAt: existing.expiresAt.toDate().toISOString(),
            breakdown: existing.breakdown,
            escrowInfo: {
              depositAmount: existing.breakdown.cautionDeposit,
              holdPeriodDays: 7,
              releaseDate: addDays(new Date(), 7).toISOString()
            }
          }
        };
      }
    }
    
    // 6. Get property pricing
    const propertyDoc = await firestore().collection('properties').doc(application.propertyId).get();
    const property = propertyDoc.data()!;
    
    // 7. Calculate breakdown
    const breakdown = {
      annualRent: property.pricing.annualRent,
      cautionDeposit: property.pricing.cautionDeposit,
      serviceCharge: property.pricing.serviceCharge || 0,
      platformFee: Math.round(property.pricing.annualRent * 0.02),
      total: 0
    };
    breakdown.total = breakdown.annualRent + breakdown.cautionDeposit + 
                      breakdown.serviceCharge + breakdown.platformFee;
    
    // 8. Get user email
    const userDoc = await firestore().collection('users').doc(tenantId).get();
    const user = userDoc.data()!;
    
    // 9. Generate unique reference
    const reference = `DR-${Date.now()}-${randomString(8)}`;
    
    // 10. Initialize with Paystack
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email || `${tenantId}@directrent.ng`,
        amount: breakdown.total * 100,  // Kobo
        reference,
        currency: 'NGN',
        callback_url: `https://directrent.ng/payment/callback`,
        channels: paymentMethod ? [paymentMethod === 'ussd' ? 'ussd' : paymentMethod] : ['card', 'bank', 'ussd', 'bank_transfer'],
        metadata: {
          tenantId,
          landlordId: application.landlordId,
          propertyId: application.propertyId,
          applicationId,
          breakdown,
          custom_fields: [
            { display_name: 'Property', variable_name: 'property', value: property.title },
            { display_name: 'Address', variable_name: 'address', value: property.location.address }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const paystackData = paystackResponse.data.data;
    const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000); // 30 mins
    
    // 11. Create payment record
    await firestore().collection('payments').doc(reference).set({
      id: reference,
      tenantId,
      landlordId: application.landlordId,
      propertyId: application.propertyId,
      applicationId,
      
      type: 'initial',
      status: 'pending',
      
      breakdown,
      currency: 'NGN',
      
      paystack: {
        reference,
        accessCode: paystackData.access_code,
        authorizationUrl: paystackData.authorization_url
      },
      
      escrow: {
        status: 'pending',
        amount: breakdown.cautionDeposit,
        holdPeriodDays: 7
      },
      
      expiresAt,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
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
          releaseDate: addDays(new Date(), 7).toISOString()
        }
      }
    };
  });
```

#### `paystackWebhook` — Handle Paystack Events

```typescript
// Function: paystackWebhook
// Type: HTTPS Request (not callable)
// Endpoint: POST /paystackWebhook

export const paystackWebhook = functions
  .runWith({ 
    timeoutSeconds: 60,
    secrets: ['PAYSTACK_SECRET_KEY']
  })
  .https.onRequest(async (req, res) => {
    // 1. Verify webhook signature
    const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid Paystack webhook signature');
      res.status(401).send('Unauthorized');
      return;
    }
    
    const event = req.body;
    console.log('Paystack webhook received:', event.event);
    
    try {
      switch (event.event) {
        case 'charge.success':
          await handleChargeSuccess(event.data);
          break;
          
        case 'transfer.success':
          await handleTransferSuccess(event.data);
          break;
          
        case 'transfer.failed':
          await handleTransferFailed(event.data);
          break;
          
        case 'refund.processed':
          await handleRefund(event.data);
          break;
          
        default:
          console.log('Unhandled webhook event:', event.event);
      }
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Processing error');
    }
  });

async function handleChargeSuccess(data: any) {
  const { reference, amount, channel, paid_at, metadata } = data;
  
  // 1. Get payment record
  const paymentRef = firestore().collection('payments').doc(reference);
  const paymentDoc = await paymentRef.get();
  
  if (!paymentDoc.exists) {
    console.error(`Payment not found: ${reference}`);
    return;
  }
  
  const payment = paymentDoc.data()!;
  
  // 2. Prevent duplicate processing
  if (payment.status === 'completed') {
    console.log(`Payment ${reference} already processed`);
    return;
  }
  
  // 3. Verify amount matches
  const expectedAmount = payment.breakdown.total * 100;
  if (amount !== expectedAmount) {
    console.error(`Amount mismatch: expected ${expectedAmount}, got ${amount}`);
    await paymentRef.update({
      status: 'amount_mismatch',
      'paystack.receivedAmount': amount,
      updatedAt: Timestamp.now()
    });
    return;
  }
  
  const batch = firestore().batch();
  const now = Timestamp.now();
  const escrowReleaseDate = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // 4. Update payment status
  batch.update(paymentRef, {
    status: 'completed',
    paidAt: Timestamp.fromDate(new Date(paid_at)),
    'paystack.channel': channel,
    'paystack.transactionId': data.id,
    
    escrow: {
      status: 'held',
      amount: payment.breakdown.cautionDeposit,
      heldAt: now,
      releaseDate: escrowReleaseDate
    },
    
    updatedAt: now
  });
  
  // 5. Create lease
  const leaseRef = firestore().collection('leases').doc();
  batch.set(leaseRef, {
    id: leaseRef.id,
    propertyId: metadata.propertyId,
    landlordId: metadata.landlordId,
    tenantId: metadata.tenantId,
    applicationId: metadata.applicationId,
    paymentId: reference,
    
    terms: {
      startDate: Timestamp.fromDate(addDays(new Date(), 7)),
      endDate: Timestamp.fromDate(addYears(new Date(), 1)),
      durationMonths: 12,
      annualRent: payment.breakdown.annualRent,
      paymentFrequency: 'annually',
      cautionDeposit: payment.breakdown.cautionDeposit,
      serviceCharge: payment.breakdown.serviceCharge
    },
    
    documents: {
      leaseAgreement: null,
      signedByLandlord: false,
      signedByTenant: false
    },
    
    status: 'pending_signature',
    
    createdAt: now,
    updatedAt: now
  });
  
  // 6. Update property
  batch.update(firestore().collection('properties').doc(metadata.propertyId), {
    'availability.status': 'rented',
    'currentTenant': {
      tenantId: metadata.tenantId,
      leaseId: leaseRef.id,
      moveInDate: Timestamp.fromDate(addDays(new Date(), 7)),
      leaseEndDate: Timestamp.fromDate(addYears(new Date(), 1))
    },
    'status.listing': 'rented',
    updatedAt: now
  });
  
  // 7. Update application
  batch.update(firestore().collection('applications').doc(metadata.applicationId), {
    status: 'completed',
    'timeline': FieldValue.arrayUnion({
      action: 'payment_completed',
      timestamp: now,
      note: `Payment of ${formatCurrency(amount / 100)} received`
    }),
    updatedAt: now
  });
  
  // 8. Update tenant
  batch.update(firestore().collection('tenants').doc(metadata.tenantId), {
    'activeLeases': FieldValue.arrayUnion(leaseRef.id),
    updatedAt: now
  });
  
  // 9. Update landlord portfolio
  batch.update(firestore().collection('landlords').doc(metadata.landlordId), {
    'portfolio.occupiedProperties': FieldValue.increment(1),
    'portfolio.vacantProperties': FieldValue.increment(-1),
    'portfolio.totalEarnings': FieldValue.increment(payment.breakdown.annualRent),
    updatedAt: now
  });
  
  await batch.commit();
  
  // 10. Send notifications
  await Promise.all([
    sendPushNotification(metadata.tenantId, {
      title: 'Payment Successful! 🎉',
      body: `Your payment of ${formatCurrency(amount / 100)} has been confirmed.`,
      data: { type: 'PAYMENT_SUCCESSFUL', reference, action: 'view_lease' }
    }),
    sendPushNotification(metadata.landlordId, {
      title: 'Payment Received! 💰',
      body: `${formatCurrency(amount / 100)} received for your property.`,
      data: { type: 'PAYMENT_RECEIVED', reference, propertyId: metadata.propertyId }
    })
  ]);
  
  // 11. Generate lease document
  await generateLeaseDocument(leaseRef.id);
  
  // 12. Track analytics
  await analytics().logEvent('payment_completed', {
    amount: amount / 100,
    channel,
    propertyId: metadata.propertyId,
    area: metadata.area || 'unknown'
  });
  
  console.log(`Payment ${reference} processed successfully`);
}
```

---

# 3. ERROR HANDLING SPECIFICATION

## 3.1 Error Code Registry

### 3.1.1 Authentication Errors (1xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 1001 | INVALID_PHONE | 400 | Please enter a valid Nigerian phone number | Correct phone format |
| 1002 | OTP_EXPIRED | 400 | Code expired. Please request a new one. | Request new OTP |
| 1003 | OTP_INVALID | 400 | Invalid code. Please try again. | Enter correct OTP |
| 1004 | OTP_MAX_ATTEMPTS | 429 | Too many attempts. Try again in 1 hour. | Wait 1 hour |
| 1005 | PHONE_BLOCKED | 403 | This phone number has been blocked. | Contact support |
| 1006 | SESSION_EXPIRED | 401 | Your session has expired. Please log in again. | Re-authenticate |
| 1007 | DEVICE_LIMIT | 403 | Maximum devices reached. | Log out other devices |

### 3.1.2 Verification Errors (2xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 2001 | BVN_INVALID_FORMAT | 400 | BVN must be exactly 11 digits | Enter correct BVN |
| 2002 | BVN_NOT_FOUND | 404 | BVN not found in national database | Verify BVN is correct |
| 2003 | BVN_NAME_MISMATCH | 409 | Name on BVN doesn't match profile | Update profile or use different BVN |
| 2004 | BVN_ALREADY_USED | 409 | This BVN is registered to another account | Contact support |
| 2005 | NIN_INVALID_FORMAT | 400 | NIN must be exactly 11 digits | Enter correct NIN |
| 2006 | VERIFICATION_RATE_LIMITED | 429 | Please wait 5 minutes between attempts | Wait 5 minutes |
| 2007 | VERIFICATION_SERVICE_DOWN | 503 | Verification service temporarily unavailable | Retry later |
| 2008 | CONSENT_REQUIRED | 400 | You must consent to verification | Provide consent |

### 3.1.3 Property Errors (3xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 3001 | PROPERTY_NOT_FOUND | 404 | Property not found | Check property ID |
| 3002 | NOT_LANDLORD | 403 | Only landlords can create listings | Switch to landlord account |
| 3003 | LISTING_LIMIT_REACHED | 403 | You've reached your listing limit | Upgrade subscription |
| 3004 | INVALID_COORDINATES | 400 | Location must be within Lagos | Use valid Lagos address |
| 3005 | INSUFFICIENT_PHOTOS | 400 | Please upload at least 5 photos | Add more photos |
| 3006 | PHOTO_TOO_LARGE | 400 | Image must be under 10MB | Compress image |
| 3007 | PHOTO_TOO_SMALL | 400 | Image must be at least 800x600 pixels | Use higher resolution |
| 3008 | PROPERTY_UNAVAILABLE | 409 | This property is no longer available | Browse other properties |
| 3009 | INVALID_PRICE | 400 | Price must be between ₦100,000 and ₦50,000,000 | Enter valid price |

### 3.1.4 Application Errors (4xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 4001 | APPLICATION_NOT_FOUND | 404 | Application not found | Check application ID |
| 4002 | VERIFICATION_REQUIRED | 403 | Please verify your identity to apply | Complete verification |
| 4003 | ALREADY_APPLIED | 409 | You already have a pending application | View existing application |
| 4004 | APPLICATION_EXPIRED | 410 | This application has expired | Submit new application |
| 4005 | CANNOT_WITHDRAW | 400 | Cannot withdraw completed application | Contact support |
| 4006 | NOT_YOUR_APPLICATION | 403 | You don't have access to this application | Check permissions |
| 4007 | APPLICATION_LIMIT | 429 | Maximum 5 pending applications | Wait for responses |

### 3.1.5 Payment Errors (5xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 5001 | PAYMENT_NOT_FOUND | 404 | Payment not found | Check payment reference |
| 5002 | PAYMENT_EXPIRED | 410 | Payment session expired | Initialize new payment |
| 5003 | PAYMENT_FAILED | 402 | Payment failed. Please try again. | Use different payment method |
| 5004 | INSUFFICIENT_FUNDS | 402 | Insufficient funds | Add funds or use different card |
| 5005 | CARD_DECLINED | 402 | Card declined by bank | Contact bank or use different card |
| 5006 | INVALID_CARD | 400 | Invalid card details | Check card information |
| 5007 | AMOUNT_MISMATCH | 400 | Payment amount doesn't match | Contact support |
| 5008 | DUPLICATE_PAYMENT | 409 | Payment already processed | View receipt |
| 5009 | PAYOUT_FAILED | 500 | Transfer to landlord failed | Will be retried automatically |
| 5010 | DISPUTE_IN_PROGRESS | 409 | Payment is under dispute | Wait for resolution |

### 3.1.6 Messaging Errors (6xxx)

| Code | Name | HTTP Status | User Message | Resolution |
|------|------|-------------|--------------|------------|
| 6001 | CONVERSATION_NOT_FOUND | 404 | Conversation not found | Check conversation ID |
| 6002 | NOT_PARTICIPANT | 403 | You're not part of this conversation | Request access |
| 6003 | MESSAGE_TOO_LONG | 400 | Message exceeds 2000 characters | Shorten message |
| 6004 | ATTACHMENT_TOO_LARGE | 400 | File exceeds 10MB limit | Compress file |
| 6005 | BLOCKED_USER | 403 | This user has blocked you | Unable to message |
| 6006 | RATE_LIMITED | 429 | Too many messages. Please slow down. | Wait 1 minute |

---

## 3.2 Error Response Format

```typescript
// Standard error response structure
interface ErrorResponse {
  success: false;
  error: {
    code: string;               // Error code (e.g., "BVN_INVALID_FORMAT")
    message: string;            // User-friendly message
    field?: string;             // Field that caused error (for validation)
    details?: {
      [key: string]: any;       // Additional context
    };
    actions?: Array<{           // Suggested actions
      type: 'retry' | 'redirect' | 'contact' | 'upgrade';
      label: string;
      target?: string;          // URL or screen name
    }>;
    retryAfter?: number;        // Seconds until retry allowed (for rate limits)
    requestId?: string;         // For support reference
  };
  timestamp: string;            // ISO timestamp
}

// Example error responses
const examples = {
  validationError: {
    success: false,
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Please correct the following errors',
      details: {
        'basicInfo.title': 'Title must be at least 10 characters',
        'media.photos': 'Please upload at least 5 photos'
      }
    },
    timestamp: '2026-03-12T10:30:00Z'
  },
  
  rateLimitError: {
    success: false,
    error: {
      code: 'OTP_MAX_ATTEMPTS',
      message: 'Too many attempts. Try again in 1 hour.',
      retryAfter: 3600,
      actions: [
        { type: 'redirect', label: 'Contact Support', target: '/support' }
      ]
    },
    timestamp: '2026-03-12T10:30:00Z'
  },
  
  paymentError: {
    success: false,
    error: {
      code: 'CARD_DECLINED',
      message: 'Your card was declined by your bank',
      details: {
        reason: 'insufficient_funds',
        cardLast4: '4242'
      },
      actions: [
        { type: 'retry', label: 'Try Again' },
        { type: 'redirect', label: 'Use Different Card', target: '/payment/methods' }
      ],
      requestId: 'req_abc123xyz'
    },
    timestamp: '2026-03-12T10:30:00Z'
  }
};
```

---

# 4. SECURITY SPECIFICATIONS

## 4.1 Security Checklist by Feature

### 4.1.1 Authentication Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Phone numbers stored in E.164 format | Normalize before storage | ☐ |
| OTP rate limiting (3/5min) | Redis counter | ☐ |
| Brute force protection (5 attempts → 1hr lockout) | Firestore tracking | ☐ |
| Session tokens rotated on sensitive actions | Firebase Auth | ☐ |
| FCM tokens pruned on logout | Cloud Function trigger | ☐ |
| Multi-device session management | Track active sessions | ☐ |

### 4.1.2 Identity Verification Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| BVN/NIN never stored raw | Store only hash + last 4 | ☐ |
| BVN/NIN transmitted only to server | Client never sees API calls | ☐ |
| Verification results cached (prevent re-verification) | 2-year expiry | ☐ |
| Duplicate BVN/NIN detection | Hash comparison | ☐ |
| Consent logging for NDPR | Audit trail | ☐ |
| API keys in Secret Manager | Firebase secrets | ☐ |

### 4.1.3 Payment Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Paystack webhook signature verification | HMAC-SHA512 | ☐ |
| Payment amounts verified server-side | Compare with stored amount | ☐ |
| No card details stored | Paystack handles all card data | ☐ |
| Idempotent payment processing | Check status before processing | ☐ |
| Bank account numbers encrypted | AES-256 encryption | ☐ |
| Transfer limits enforced | Max ₦10M per transaction | ☐ |

### 4.1.4 Data Protection (NDPR Compliance)

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Personal data encrypted at rest | Firestore encryption | ☐ |
| Personal data encrypted in transit | TLS 1.3 | ☐ |
| Data retention policy (7 years for payments) | Automated cleanup | ☐ |
| User data export capability | Admin function | ☐ |
| User data deletion capability | Cascading delete | ☐ |
| Privacy policy consent tracking | Consent timestamp | ☐ |
| Data processing audit log | verificationLogs collection | ☐ |

## 4.2 Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== HELPER FUNCTIONS ==========
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isVerified() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.verification.bvn.status == 'verified' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.verification.nin.status == 'verified';
    }
    
    function isLandlord() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.userType == 'landlord';
    }
    
    function isTenant() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.userType == 'tenant';
    }
    
    function isParticipant(conversation) {
      return request.auth.uid == conversation.participants.landlordId ||
             request.auth.uid == conversation.participants.tenantId;
    }
    
    // ========== USERS COLLECTION ==========
    
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isOwner(userId);
      
      // Users can update their own profile (limited fields)
      allow update: if isOwner(userId) && 
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['firstName', 'lastName', 'email', 'photoUrl', 
                    'dateOfBirth', 'gender', 'settings', 'updatedAt']);
      
      // Never allow client delete (admin only)
      allow delete: if false;
      
      // Create handled by Cloud Functions only
      allow create: if false;
    }
    
    // ========== TENANTS COLLECTION ==========
    
    match /tenants/{userId} {
      allow read: if isOwner(userId);
      
      allow update: if isOwner(userId) &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['preferences', 'employment', 'savedProperties', 
                    'viewedProperties', 'updatedAt']);
      
      allow create, delete: if false;
    }
    
    // ========== LANDLORDS COLLECTION ==========
    
    match /landlords/{userId} {
      allow read: if isOwner(userId);
      
      // Limited fields updatable by landlord
      allow update: if isOwner(userId) &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['updatedAt']);
      
      allow create, delete: if false;
    }
    
    // ========== PROPERTIES COLLECTION ==========
    
    match /properties/{propertyId} {
      // Anyone can read active listings
      allow read: if resource.data.status.listing == 'active' ||
                    isOwner(resource.data.landlordId);
      
      // Landlords can update their own properties
      allow update: if isOwner(resource.data.landlordId) && isLandlord() &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['title', 'description', 'pricing', 'details', 
                    'amenities', 'rules', 'media', 'status.listing', 
                    'availability', 'updatedAt']);
      
      // Create/delete via Cloud Functions only
      allow create, delete: if false;
    }
    
    // ========== APPLICATIONS COLLECTION ==========
    
    match /applications/{applicationId} {
      // Tenant can read their own applications
      // Landlord can read applications for their properties
      allow read: if isOwner(resource.data.tenantId) ||
                    isOwner(resource.data.landlordId);
      
      // Tenant can withdraw their application
      allow update: if isOwner(resource.data.tenantId) &&
        request.resource.data.status == 'withdrawn' &&
        resource.data.status in ['pending', 'viewed', 'shortlisted'];
      
      // Landlord can update status
      allow update: if isOwner(resource.data.landlordId) &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'landlordNotes', 'timeline', 'updatedAt']);
      
      allow create, delete: if false;
    }
    
    // ========== CONVERSATIONS COLLECTION ==========
    
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && isParticipant(resource.data);
      
      allow update: if isAuthenticated() && isParticipant(resource.data) &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'updatedAt', 'unreadCount']);
      
      allow create, delete: if false;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
          isParticipant(get(/databases/$(database)/documents/conversations/$(conversationId)).data);
        
        // Message creation via Cloud Functions only (to validate sender)
        allow create, update, delete: if false;
      }
    }
    
    // ========== PAYMENTS COLLECTION ==========
    
    match /payments/{paymentId} {
      // Tenant and landlord can read their payments
      allow read: if isOwner(resource.data.tenantId) ||
                    isOwner(resource.data.landlordId);
      
      // All writes via Cloud Functions only (webhook handlers)
      allow create, update, delete: if false;
    }
    
    // ========== LEASES COLLECTION ==========
    
    match /leases/{leaseId} {
      allow read: if isOwner(resource.data.tenantId) ||
                    isOwner(resource.data.landlordId);
      
      allow create, update, delete: if false;
    }
    
    // ========== REVIEWS COLLECTION ==========
    
    match /reviews/{reviewId} {
      // Anyone can read published reviews
      allow read: if resource.data.status == 'published';
      
      // Create via Cloud Functions only
      allow create, update, delete: if false;
    }
    
    // ========== SENSITIVE COLLECTIONS ==========
    
    match /verificationLogs/{logId} {
      // Admin only - no client access
      allow read, write: if false;
    }
    
    match /disputes/{disputeId} {
      allow read: if isOwner(resource.data.tenantId) ||
                    isOwner(resource.data.landlordId);
      allow write: if false;
    }
  }
}
```

---

# 5. PERFORMANCE SPECIFICATIONS

## 5.1 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| App cold start | < 3 seconds | < 5 seconds |
| App warm start | < 1 second | < 2 seconds |
| Search results | < 500ms | < 1 second |
| Property details | < 300ms | < 500ms |
| Image load | < 1 second | < 2 seconds |
| Message send | < 200ms | < 500ms |
| Payment init | < 2 seconds | < 5 seconds |
| API response (p95) | < 200ms | < 500ms |
| Firebase Function cold start | < 2 seconds | < 5 seconds |

## 5.2 Optimization Strategies

### 5.2.1 Database Optimization

```typescript
// Firestore Query Optimization

// ✅ GOOD: Use compound indexes
const searchProperties = async (filters: SearchFilters) => {
  let query = firestore()
    .collection('properties')
    .where('status.listing', '==', 'active')
    .where('location.area', '==', filters.area)
    .where('pricing.annualRent', '>=', filters.minPrice)
    .where('pricing.annualRent', '<=', filters.maxPrice)
    .orderBy('pricing.annualRent', 'asc')
    .limit(20);
  
  // Use startAfter for pagination (not offset)
  if (filters.cursor) {
    const cursorDoc = await firestore().collection('properties').doc(filters.cursor).get();
    query = query.startAfter(cursorDoc);
  }
  
  return query.get();
};

// ✅ GOOD: Denormalize data for common queries
// Store propertySnapshot in conversations to avoid extra reads
const conversationWithSnapshot = {
  propertyId: 'prop_123',
  propertySnapshot: {
    title: 'Spacious 2BR in Yaba',
    primaryPhoto: 'https://...',
    annualRent: 650000,
    area: 'Yaba'
  }
};

// ✅ GOOD: Use counters for aggregations
// Don't query all properties to count - use a counter document
await firestore()
  .collection('landlords')
  .doc(landlordId)
  .update({
    'portfolio.totalProperties': FieldValue.increment(1)
  });

// ❌ BAD: Avoid client-side filtering large datasets
// This reads ALL properties then filters
const badQuery = firestore()
  .collection('properties')
  .get()
  .then(snapshot => {
    return snapshot.docs.filter(doc => doc.data().pricing.annualRent < 500000);
  });
```

### 5.2.2 Image Optimization

```typescript
// Image processing pipeline
const IMAGE_CONFIG = {
  sizes: {
    thumbnail: { width: 300, height: 300, quality: 70 },
    medium: { width: 800, height: 600, quality: 80 },
    full: { width: 1920, height: 1440, quality: 85 }
  },
  formats: ['webp', 'jpeg'],
  maxSizeMB: 10
};

// Generate responsive images on upload
const processPropertyImage = async (
  originalUri: string,
  propertyId: string,
  order: number
): Promise<{ full: string; medium: string; thumbnail: string }> => {
  const images = await Promise.all([
    // Full size
    processImage(originalUri, IMAGE_CONFIG.sizes.full),
    // Medium for listing cards
    processImage(originalUri, IMAGE_CONFIG.sizes.medium),
    // Thumbnail for search results
    processImage(originalUri, IMAGE_CONFIG.sizes.thumbnail)
  ]);
  
  // Upload all versions
  const [fullUrl, mediumUrl, thumbnailUrl] = await Promise.all([
    uploadToStorage(`properties/${propertyId}/full_${order}.webp`, images[0]),
    uploadToStorage(`properties/${propertyId}/medium_${order}.webp`, images[1]),
    uploadToStorage(`properties/${propertyId}/thumb_${order}.webp`, images[2])
  ]);
  
  return { full: fullUrl, medium: mediumUrl, thumbnail: thumbnailUrl };
};

// Client-side: Use appropriate image size
const PropertyCard = ({ property }) => (
  <FastImage
    source={{ 
      uri: property.media.photos[0].thumbnail,  // Use thumbnail, not full
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable
    }}
    style={styles.thumbnail}
    resizeMode={FastImage.resizeMode.cover}
  />
);
```

### 5.2.3 Caching Strategy

```typescript
// RTK Query caching configuration
const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: firebaseBaseQuery,
  tagTypes: ['Property', 'Application', 'Conversation', 'Payment'],
  endpoints: (builder) => ({
    getProperties: builder.query<Property[], SearchFilters>({
      query: (filters) => ({ type: 'searchProperties', filters }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Property' as const, id })),
              { type: 'Property', id: 'LIST' }
            ]
          : [{ type: 'Property', id: 'LIST' }],
      // Keep search results for 5 minutes
      keepUnusedDataFor: 300
    }),
    
    getProperty: builder.query<Property, string>({
      query: (id) => ({ type: 'getProperty', id }),
      providesTags: (result, error, id) => [{ type: 'Property', id }],
      // Keep individual property for 10 minutes
      keepUnusedDataFor: 600
    }),
    
    getConversations: builder.query<Conversation[], void>({
      query: () => ({ type: 'getConversations' }),
      providesTags: ['Conversation'],
      // Real-time updates via Firebase listener
      onCacheEntryAdded: async (arg, { cacheDataLoaded, cacheEntryRemoved, updateCachedData }) => {
        await cacheDataLoaded;
        const unsubscribe = firestore()
          .collection('conversations')
          .where('participants.tenantId', '==', auth().currentUser?.uid)
          .onSnapshot((snapshot) => {
            updateCachedData((draft) => {
              // Update cache with real-time changes
              snapshot.docChanges().forEach((change) => {
                // Handle add, modify, remove
              });
            });
          });
        await cacheEntryRemoved;
        unsubscribe();
      }
    })
  })
});
```

---

*Continued in MASTER_PRD_PART3.md...*
