# CLAUDE.md — Directrent.ng Firebase Backend
## Backend Services Configuration

---

## 🔥 Firebase Overview

**Project Name:** directrent-ng  
**Region:** europe-west1 (closest to Lagos)  
**Services Used:**
- Firebase Authentication (Phone + Email)
- Cloud Firestore (Database)
- Firebase Storage (Images, Documents)
- Cloud Functions (Business Logic)
- Firebase Cloud Messaging (Push Notifications)
- Firebase Analytics + Crashlytics

---

## 📊 Firestore Database Schema

### Collection: `users`
```typescript
interface User {
  // Document ID: Firebase Auth UID
  uid: string;
  
  // Basic info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;                    // Format: +234XXXXXXXXXX
  photoUrl: string;
  userType: 'tenant' | 'landlord';
  
  // Verification
  verification: {
    phone: { verified: boolean; verifiedAt: Timestamp };
    email: { verified: boolean; verifiedAt: Timestamp };
    bvn: {
      status: 'pending' | 'verified' | 'failed';
      last4: string;                // Last 4 digits only
      verifiedAt: Timestamp;
      verifyMeRef: string;          // Reference ID from VerifyMe
    };
    nin: {
      status: 'pending' | 'verified' | 'failed';
      last4: string;
      verifiedAt: Timestamp;
      verifyMeRef: string;
    };
  };
  
  // Profile completeness
  profileComplete: boolean;
  profileCompleteness: number;      // 0-100
  
  // Settings
  settings: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
      marketing: boolean;
    };
    privacy: {
      showPhone: boolean;
      showEmail: boolean;
    };
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  
  // Device tokens for push notifications
  fcmTokens: string[];
}
```

### Collection: `tenants` (extends users)
```typescript
interface Tenant {
  // Document ID: Same as user UID
  uid: string;
  
  // Employment
  employment: {
    status: 'employed' | 'self_employed' | 'student' | 'unemployed' | 'other';
    employer?: string;
    role?: string;
    monthlyIncome?: 'below_200k' | '200k_500k' | '500k_1m' | 'above_1m';
    verificationStatus: 'pending' | 'verified' | 'failed';
    documents?: string[];           // Storage paths
  };
  
  // Search preferences
  preferences: {
    areas: string[];                // ['Yaba', 'Ikeja', 'Lekki']
    minBudget: number;
    maxBudget: number;
    bedrooms: number[];
    propertyTypes: string[];
    amenities: string[];
  };
  
  // Rental history
  rentalHistory: {
    count: number;
    currentLease?: string;          // Reference to active lease
    previousLeases: string[];       // References to past leases
  };
  
  // Ratings
  rating: {
    average: number;
    count: number;
  };
  
  // Saved properties
  savedProperties: string[];        // Property IDs
  
  // Documents (reusable for applications)
  documents: {
    governmentId?: { type: string; url: string; uploadedAt: Timestamp };
    employmentLetter?: { url: string; uploadedAt: Timestamp };
    bankStatements?: { url: string; months: number; uploadedAt: Timestamp };
  };
}
```

### Collection: `landlords` (extends users)
```typescript
interface Landlord {
  // Document ID: Same as user UID
  uid: string;
  
  // Verification
  ownershipVerification: {
    status: 'pending' | 'verified' | 'failed';
    documents: Array<{
      type: 'deed_of_assignment' | 'c_of_o' | 'governors_consent' | 'survey_plan' | 'utility_bill';
      url: string;
      verified: boolean;
      uploadedAt: Timestamp;
    }>;
    verifiedAt?: Timestamp;
    verifiedBy?: string;            // Admin UID
  };
  
  // Bank account for payments
  bankAccount: {
    bankName: string;
    bankCode: string;
    accountNumber: string;          // Encrypted
    accountName: string;
    verified: boolean;
    paystackRecipientCode: string;
  };
  
  // Portfolio
  portfolio: {
    totalProperties: number;
    activeListings: number;
    occupiedProperties: number;
    totalValue: number;             // Sum of annual rents
  };
  
  // Subscription
  subscription: {
    plan: 'free' | 'basic' | 'premium';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt?: Timestamp;
    features: {
      maxListings: number;
      featuredListings: number;
      analytics: boolean;
      prioritySupport: boolean;
    };
  };
  
  // Ratings
  rating: {
    average: number;
    count: number;
  };
  
  // Response metrics
  responseMetrics: {
    averageResponseTime: number;    // In minutes
    responseRate: number;           // % of inquiries responded
  };
}
```

### Collection: `properties`
```typescript
interface Property {
  // Document ID: Auto-generated
  id: string;
  
  // Ownership
  landlordId: string;
  
  // Basic info
  title: string;
  description: string;
  propertyType: 'self_contained' | 'mini_flat' | 'one_bedroom' | 'two_bedroom' | 
                'three_bedroom' | 'duplex' | 'bungalow' | 'boys_quarters';
  
  // Details
  details: {
    bedrooms: number;
    bathrooms: number;
    sizeSqm?: number;
    yearBuilt?: number;
    furnishing: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
  };
  
  // Location
  location: {
    address: string;
    area: string;                   // e.g., 'Yaba'
    lga: string;                    // e.g., 'Yaba'
    state: 'Lagos';
    coordinates: {
      latitude: number;
      longitude: number;
    };
    geohash: string;                // For geo-queries
    nearbyLandmarks: string[];
  };
  
  // Pricing
  pricing: {
    annualRent: number;
    cautionDeposit: number;         // Actual amount (not multiplier)
    serviceCharge: number;
    agreementFee: number;
    totalUpfront: number;           // Calculated
    platformFee: number;            // 2-3% of annual rent
    agentSavings: number;           // What tenant saves vs agent
  };
  
  // Media
  media: {
    photos: Array<{
      url: string;
      thumbnail: string;
      caption?: string;
      isPrimary: boolean;
      order: number;
    }>;
    virtualTourUrl?: string;
    videoUrl?: string;
  };
  
  // Amenities
  amenities: string[];
  
  // Rules
  rules: {
    petPolicy: 'no_pets' | 'small_pets' | 'all_pets';
    maxOccupants: number;
    customRules: string[];
  };
  
  // Status
  status: {
    listing: 'draft' | 'active' | 'paused' | 'rented' | 'expired';
    availability: 'available' | 'pending' | 'rented';
    featured: boolean;
    featuredUntil?: Timestamp;
    verified: boolean;
    verifiedAt?: Timestamp;
  };
  
  // Analytics
  analytics: {
    viewCount: number;
    savedCount: number;
    inquiryCount: number;
    applicationCount: number;
    lastViewedAt?: Timestamp;
  };
  
  // Current tenant (if rented)
  currentTenant?: {
    tenantId: string;
    leaseId: string;
    leaseStartDate: Timestamp;
    leaseEndDate: Timestamp;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
```

### Collection: `applications`
```typescript
interface Application {
  // Document ID: Auto-generated
  id: string;
  
  // References
  propertyId: string;
  landlordId: string;
  tenantId: string;
  
  // Status
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  
  // Application details
  details: {
    preferredMoveIn: Timestamp;
    leaseDuration: '1_year' | '2_years' | '3_years';
    occupants: {
      adults: number;
      children: number;
      pets: { hasPets: boolean; petType?: string };
    };
    message: string;
  };
  
  // Tenant snapshot (at time of application)
  tenantSnapshot: {
    name: string;
    photoUrl: string;
    phone: string;                  // Visible only if accepted
    email: string;                  // Visible only if accepted
    verification: {
      bvn: boolean;
      nin: boolean;
      employment: boolean;
    };
    rating: {
      average: number;
      count: number;
    };
    employmentInfo?: {
      status: string;
      employer?: string;
      role?: string;
      incomeRange?: string;
    };
  };
  
  // Documents submitted
  documents: {
    governmentId: { type: string; url: string };
    employmentLetter?: { url: string };
    bankStatement?: { url: string; months: number };
    previousLease?: { url: string };
  };
  
  // Payment intent (for escrow)
  paymentIntent?: {
    paystackRef: string;
    amount: number;
    status: 'pending' | 'authorized' | 'captured' | 'failed';
  };
  
  // Timeline
  timeline: Array<{
    action: 'submitted' | 'viewed' | 'messaged' | 'accepted' | 'rejected' | 'withdrawn';
    timestamp: Timestamp;
    note?: string;
  }>;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;             // Auto-expire after 14 days
}
```

### Collection: `conversations`
```typescript
interface Conversation {
  // Document ID: {landlordId}_{tenantId}_{propertyId}
  id: string;
  
  // Participants
  landlordId: string;
  tenantId: string;
  propertyId: string;
  
  // Last message preview
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
    type: 'text' | 'image' | 'document' | 'system';
  };
  
  // Unread counts
  unreadCount: {
    [landlordId]: number;
    [tenantId]: number;
  };
  
  // Application reference
  applicationId?: string;
  applicationStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  
  // Status
  status: 'active' | 'archived' | 'blocked';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Subcollection: messages
}

// Subcollection: conversations/{id}/messages
interface Message {
  id: string;
  senderId: string;
  senderType: 'landlord' | 'tenant';
  
  // Content
  type: 'text' | 'image' | 'document' | 'property_card' | 'application_update' | 
        'schedule_viewing' | 'payment_request' | 'location' | 'system';
  content: {
    text?: string;
    imageUrl?: string;
    documentUrl?: string;
    documentName?: string;
    propertyId?: string;
    viewingDetails?: {
      date: Timestamp;
      time: string;
      status: 'proposed' | 'confirmed' | 'cancelled';
    };
    paymentDetails?: {
      amount: number;
      type: 'rent' | 'deposit' | 'service_charge';
      paystackUrl: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Status
  read: boolean;
  readAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
}
```

### Collection: `leases`
```typescript
interface Lease {
  id: string;
  
  // References
  propertyId: string;
  landlordId: string;
  tenantId: string;
  applicationId: string;
  
  // Terms
  terms: {
    startDate: Timestamp;
    endDate: Timestamp;
    durationMonths: number;
    annualRent: number;
    paymentFrequency: 'annually' | 'semi_annually' | 'quarterly' | 'monthly';
    cautionDeposit: number;
    serviceCharge: number;
  };
  
  // Documents
  documents: {
    leaseAgreement: {
      url: string;
      generatedAt: Timestamp;
      signedByLandlord: boolean;
      signedByTenant: boolean;
      landlordSignedAt?: Timestamp;
      tenantSignedAt?: Timestamp;
    };
    inventoryList?: { url: string };
    moveInPhotos?: string[];
  };
  
  // Status
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  
  // Renewal
  renewal: {
    notificationSent: boolean;
    tenantResponse?: 'renew' | 'vacate' | 'pending';
    newTermsProposed?: boolean;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `payments`
```typescript
interface Payment {
  id: string;
  
  // References
  propertyId: string;
  landlordId: string;
  tenantId: string;
  leaseId: string;
  
  // Payment details
  type: 'rent' | 'deposit' | 'service_charge' | 'platform_fee';
  amount: number;
  currency: 'NGN';
  period?: {
    from: Timestamp;
    to: Timestamp;
  };
  
  // Paystack
  paystack: {
    reference: string;
    accessCode?: string;
    authorizationCode?: string;
    transactionId?: number;
    channel: 'card' | 'bank' | 'ussd' | 'bank_transfer';
  };
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  
  // Escrow (for deposits)
  escrow?: {
    status: 'held' | 'released' | 'disputed' | 'refunded';
    heldAt: Timestamp;
    releaseDate: Timestamp;
    releasedAt?: Timestamp;
    disputeReason?: string;
  };
  
  // Landlord payout
  payout?: {
    amount: number;                 // After platform fee
    status: 'pending' | 'processing' | 'completed' | 'failed';
    paystackTransferId?: string;
    completedAt?: Timestamp;
  };
  
  // Timestamps
  createdAt: Timestamp;
  paidAt?: Timestamp;
  
  // Receipt
  receiptUrl?: string;
}
```

### Collection: `reviews`
```typescript
interface Review {
  id: string;
  
  // References
  propertyId: string;
  leaseId: string;
  reviewerId: string;
  revieweeId: string;
  
  // Type
  type: 'tenant_to_landlord' | 'landlord_to_tenant';
  
  // Rating
  rating: {
    overall: number;                // 1-5
    categories: {
      // For tenant_to_landlord
      communication?: number;
      propertyCondition?: number;
      maintenance?: number;
      valueForMoney?: number;
      
      // For landlord_to_tenant
      paymentTimeliness?: number;
      propertyUpkeep?: number;
      communication?: number;
      compliance?: number;
    };
  };
  
  // Content
  content: {
    text: string;
    pros?: string[];
    cons?: string[];
  };
  
  // Status
  status: 'published' | 'hidden' | 'flagged';
  
  // Response
  response?: {
    text: string;
    respondedAt: Timestamp;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
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
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;  // Soft delete only
    }
    
    // Tenants collection
    match /tenants/{tenantId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(tenantId) && isTenant();
      allow update: if isOwner(tenantId);
    }
    
    // Landlords collection
    match /landlords/{landlordId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(landlordId) && isLandlord();
      allow update: if isOwner(landlordId);
    }
    
    // Properties collection
    match /properties/{propertyId} {
      allow read: if true;  // Public listing
      allow create: if isLandlord() && isVerified();
      allow update: if isOwner(resource.data.landlordId);
      allow delete: if isOwner(resource.data.landlordId);
    }
    
    // Applications collection
    match /applications/{applicationId} {
      allow read: if isOwner(resource.data.tenantId) || 
                    isOwner(resource.data.landlordId);
      allow create: if isTenant() && isVerified();
      allow update: if isOwner(resource.data.tenantId) || 
                      isOwner(resource.data.landlordId);
    }
    
    // Conversations collection
    match /conversations/{conversationId} {
      allow read: if isOwner(resource.data.landlordId) || 
                    isOwner(resource.data.tenantId);
      allow create: if isVerified();
      
      match /messages/{messageId} {
        allow read: if isOwner(get(/databases/$(database)/documents/conversations/$(conversationId)).data.landlordId) ||
                      isOwner(get(/databases/$(database)/documents/conversations/$(conversationId)).data.tenantId);
        allow create: if isVerified();
      }
    }
    
    // Payments collection
    match /payments/{paymentId} {
      allow read: if isOwner(resource.data.tenantId) || 
                    isOwner(resource.data.landlordId);
      allow create: if false;  // Only via Cloud Functions
      allow update: if false;  // Only via Cloud Functions
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;  // Public
      allow create: if isVerified() && 
                      (isOwner(request.resource.data.reviewerId));
      allow update: if isOwner(resource.data.reviewerId) ||
                      isOwner(resource.data.revieweeId);
    }
  }
}
```

---

## ☁️ Cloud Functions

### Authentication Functions
```typescript
// functions/src/auth/onCreate.ts
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  // Create user document
  // Send welcome SMS via Termii
  // Send welcome email via SendGrid
  // Track analytics event
});

// functions/src/auth/onDelete.ts
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  // Soft delete user data
  // Archive conversations
  // Handle active leases
  // Send confirmation email
});
```

### Verification Functions
```typescript
// functions/src/verification/verifyBvn.ts
export const verifyBvn = functions.https.onCall(async (data, context) => {
  // Validate user is authenticated
  // Call VerifyMe API
  // Store verification status
  // Update user document
  // Return result
});

// functions/src/verification/verifyNin.ts
export const verifyNin = functions.https.onCall(async (data, context) => {
  // Similar to BVN verification
});

// functions/src/verification/verifyBankAccount.ts
export const verifyBankAccount = functions.https.onCall(async (data, context) => {
  // Call Paystack resolve account
  // Create transfer recipient
  // Store verified account
});
```

### Payment Functions (Paystack Integration)
```typescript
// functions/src/payments/initializePayment.ts
export const initializePayment = functions.https.onCall(async (data, context) => {
  const { amount, type, propertyId, leaseId } = data;
  
  // Validate user
  // Calculate platform fee
  // Create Paystack transaction
  // Create payment document
  // Return authorization URL
});

// functions/src/payments/webhook.ts
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify Paystack signature
  // Handle charge.success
  // Handle transfer.success
  // Handle refund events
  // Update payment status
  // Notify parties
});

// functions/src/payments/processEscrowRelease.ts
export const processEscrowRelease = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    // Find escrow payments due for release
    // Initiate transfer to landlord
    // Update payment status
    // Send notifications
  });

// functions/src/payments/initiateTransfer.ts
export const initiateTransfer = functions.https.onCall(async (data, context) => {
  // Validate landlord
  // Get bank account
  // Calculate amount (minus fees)
  // Create Paystack transfer
  // Track transfer status
});
```

### Notification Functions
```typescript
// functions/src/notifications/sendPush.ts
export const sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    
    // Get user FCM tokens
    // Send via Firebase Cloud Messaging
    // Update delivery status
  });

// functions/src/notifications/sendSms.ts
export const sendSms = functions.https.onCall(async (data, context) => {
  // Validate sender
  // Call Termii API
  // Log SMS sent
});

// functions/src/notifications/sendEmail.ts
export const sendEmail = functions.https.onCall(async (data, context) => {
  // Validate sender
  // Call SendGrid API
  // Log email sent
});
```

### Property Functions
```typescript
// functions/src/properties/onPropertyCreate.ts
export const onPropertyCreate = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snap, context) => {
    // Generate thumbnails
    // Calculate pricing breakdown
    // Update landlord portfolio
    // Index for search
  });

// functions/src/properties/calculateMarketRate.ts
export const calculateMarketRate = functions.https.onCall(async (data, context) => {
  const { area, propertyType, bedrooms } = data;
  
  // Query similar properties
  // Calculate average, median, range
  // Return market insights
});

// functions/src/properties/expireListings.ts
export const expireListings = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Find listings older than 90 days
    // Send renewal reminders
    // Expire stale listings
  });
```

### Lease Functions
```typescript
// functions/src/leases/generateLeaseDocument.ts
export const generateLeaseDocument = functions.https.onCall(async (data, context) => {
  // Validate application is accepted
  // Generate PDF from template
  // Upload to Storage
  // Create lease document
  // Return download URL
});

// functions/src/leases/checkLeaseExpiry.ts
export const checkLeaseExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Find leases expiring in 60 days
    // Send renewal notifications
    // Update renewal status
  });
```

### Analytics Functions
```typescript
// functions/src/analytics/trackPropertyView.ts
export const trackPropertyView = functions.https.onCall(async (data, context) => {
  // Increment view count
  // Track viewer demographics
  // Update analytics aggregates
});

// functions/src/analytics/generateDailyReport.ts
export const generateDailyReport = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Aggregate daily metrics
    // Store in analytics collection
    // Identify low-performing listings
    // Send alerts to landlords
  });
```

---

## 📦 Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    function isPdf() {
      return request.resource.contentType == 'application/pdf';
    }
    
    function isUnder10MB() {
      return request.resource.size < 10 * 1024 * 1024;
    }
    
    // User profile photos
    match /users/{userId}/profile/{fileName} {
      allow read: if true;
      allow write: if isOwner(userId) && isImage() && isUnder10MB();
    }
    
    // User documents (verification)
    match /users/{userId}/documents/{fileName} {
      allow read: if isOwner(userId);  // Private
      allow write: if isOwner(userId) && (isImage() || isPdf()) && isUnder10MB();
    }
    
    // Property photos
    match /properties/{propertyId}/photos/{fileName} {
      allow read: if true;  // Public
      allow write: if isAuthenticated() && isImage() && isUnder10MB();
    }
    
    // Property documents
    match /properties/{propertyId}/documents/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isPdf() && isUnder10MB();
    }
    
    // Chat attachments
    match /conversations/{conversationId}/attachments/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isUnder10MB();
    }
    
    // Lease documents
    match /leases/{leaseId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if false;  // Only via Cloud Functions
    }
  }
}
```

---

## 🔗 Third-Party API Integration

### Paystack Configuration
```typescript
// functions/src/config/paystack.ts
export const PAYSTACK_CONFIG = {
  secretKey: functions.config().paystack.secret_key,
  publicKey: functions.config().paystack.public_key,
  baseUrl: 'https://api.paystack.co',
  
  endpoints: {
    initializeTransaction: '/transaction/initialize',
    verifyTransaction: '/transaction/verify/:reference',
    listBanks: '/bank',
    resolveAccount: '/bank/resolve',
    createTransferRecipient: '/transferrecipient',
    initiateTransfer: '/transfer',
    verifyTransfer: '/transfer/verify/:reference'
  },
  
  webhookEvents: [
    'charge.success',
    'transfer.success',
    'transfer.failed',
    'refund.processed'
  ]
};
```

### VerifyMe Configuration
```typescript
// functions/src/config/verifyme.ts
export const VERIFYME_CONFIG = {
  apiKey: functions.config().verifyme.api_key,
  baseUrl: 'https://api.verifyme.ng/v1',
  
  endpoints: {
    verifyBvn: '/verifications/bvn/:bvn',
    verifyNin: '/verifications/nin/:nin',
    verifyPhoneNumber: '/verifications/phone-number/:phone'
  }
};
```

### Termii Configuration (SMS)
```typescript
// functions/src/config/termii.ts
export const TERMII_CONFIG = {
  apiKey: functions.config().termii.api_key,
  senderId: 'DIRECTRENT',
  baseUrl: 'https://api.ng.termii.com/api',
  
  templates: {
    otp: 'Your Directrent verification code is {otp}. Valid for 5 minutes.',
    welcome: 'Welcome to Directrent! Start finding your perfect home at directrent.ng',
    applicationReceived: 'New application received for {property}. Review now at directrent.ng',
    paymentReminder: 'Rent payment of ₦{amount} due in {days} days for {property}.',
    paymentReceived: 'Payment of ₦{amount} received for {property}. Thank you!'
  }
};
```

---

## ⚠️ Backend Specific Rules

### DO
- Always validate user authentication before data access
- Use transactions for financial operations
- Encrypt sensitive data (BVN, bank accounts)
- Log all payment operations
- Use batch writes for related updates
- Implement retry logic for external APIs
- Set up monitoring and alerting
- Use typed interfaces for all documents

### DO NOT
- Never store raw BVN/NIN numbers
- Never expose API keys in client code
- Never skip webhook signature verification
- Never process payments without escrow for deposits
- Never delete data permanently (soft delete only)
- Never trust client-provided user IDs

---

*Module: Firebase Backend*
*Parent: CLAUDE.md (root)*
*Version: 1.0.0*
