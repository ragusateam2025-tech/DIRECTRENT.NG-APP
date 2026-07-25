# DIRECTRENT.NG MASTER PRD
## Production-Grade Feature Specification for Agent Teams
### Version 2.0.0 | March 2026

---

# DOCUMENT NAVIGATION

| Section | Contents | Agent Team |
|---------|----------|------------|
| Part 1 | Architecture, Data Models, State Machines | `architect`, `backend` |
| Part 2 | Authentication & Verification | `backend`, `verification` |
| Part 3 | Property Management & Search | `frontend-landlord`, `frontend-tenant`, `backend` |
| Part 4 | Applications, Messaging, Payments | `frontend-*`, `backend`, `payments` |
| Part 5 | Testing, Security, Performance | All Teams |

---

# PART 1: SYSTEM ARCHITECTURE

## 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DIRECTRENT.NG ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐           │
│  │   TENANT APP    │     │  LANDLORD APP   │     │   ADMIN PANEL   │           │
│  │  (React Native) │     │  (React Native) │     │     (Next.js)   │           │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘           │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                              │
│  ┌────────────────────────────────▼────────────────────────────────────────┐   │
│  │                        FIREBASE SERVICES                                 │   │
│  ├──────────────────┬──────────────────┬───────────────┬──────────────────┤   │
│  │   Authentication │    Firestore     │    Storage    │  Cloud Functions │   │
│  │   (Phone OTP)    │   (Database)     │   (Files)     │  (Business Logic)│   │
│  └──────────────────┴──────────────────┴───────────────┴──────────────────┘   │
│                                   │                                              │
│  ┌────────────────────────────────▼────────────────────────────────────────┐   │
│  │                       EXTERNAL SERVICES                                  │   │
│  ├────────────────┬────────────────┬────────────────┬─────────────────────┤   │
│  │    Paystack    │    VerifyMe    │    Termii      │   Google Maps      │   │
│  │   (Payments)   │  (BVN/NIN)     │    (SMS)       │   (Location)       │   │
│  └────────────────┴────────────────┴────────────────┴─────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Technology Stack Specifications

### 1.2.1 Mobile Applications

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React Native | 0.76+ | Cross-platform mobile |
| Build System | Expo SDK | 52+ | Development & builds |
| Navigation | Expo Router | 4+ | File-based routing |
| State | Redux Toolkit | 2.0+ | Global state |
| Data Fetching | RTK Query | 2.0+ | API caching |
| Forms | React Hook Form | 7.50+ | Form management |
| Validation | Zod | 3.22+ | Schema validation |
| UI Components | React Native Paper | 5.12+ | Material Design |
| Maps | react-native-maps | 1.10+ | Google Maps |

### 1.2.2 Backend Services

| Service | Technology | Region | Purpose |
|---------|------------|--------|---------|
| Authentication | Firebase Auth | europe-west1 | Phone OTP |
| Database | Cloud Firestore | europe-west1 | Primary data store |
| Storage | Cloud Storage | europe-west1 | Files/images |
| Functions | Cloud Functions | europe-west1 | Business logic |
| Messaging | Firebase Cloud Messaging | - | Push notifications |
| Analytics | Firebase Analytics | - | Usage tracking |

### 1.2.3 External Integrations

| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| Paystack | Payments | `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` |
| VerifyMe | Identity verification | `VERIFYME_API_KEY` |
| Termii | SMS delivery | `TERMII_API_KEY`, `TERMII_SENDER_ID` |
| Google Maps | Location services | `GOOGLE_MAPS_API_KEY` |
| SendGrid | Email delivery | `SENDGRID_API_KEY` |

---

## 1.3 Complete Firestore Schema

### 1.3.1 Collections Overview

```
firestore/
├── users/                    # All user accounts
│   └── {userId}/
│       └── fcmTokens[]       # Push notification tokens
├── tenants/                  # Tenant-specific data
│   └── {userId}/
├── landlords/                # Landlord-specific data
│   └── {userId}/
├── properties/               # Property listings
│   └── {propertyId}/
├── applications/             # Rental applications
│   └── {applicationId}/
├── conversations/            # Chat threads
│   └── {conversationId}/
│       └── messages/         # Chat messages (subcollection)
│           └── {messageId}/
├── leases/                   # Lease agreements
│   └── {leaseId}/
├── payments/                 # Payment transactions
│   └── {paymentId}/
├── reviews/                  # Ratings & reviews
│   └── {reviewId}/
├── verificationLogs/         # Audit trail
│   └── {logId}/
├── disputes/                 # Payment disputes
│   └── {disputeId}/
├── savedSearches/            # Tenant saved searches
│   └── {searchId}/
├── listingDrafts/            # Unpublished listings
│   └── {draftId}/
└── analytics/                # Aggregated metrics
    └── {documentId}/
```

### 1.3.2 Users Collection Schema

```typescript
// Collection: users
// Document ID: Firebase Auth UID

interface User {
  // Identity
  uid: string;                           // Firebase Auth UID
  phone: string;                         // E.164 format: +2348012345678
  email: string | null;                  // Optional email
  
  // Profile
  userType: 'tenant' | 'landlord' | null;  // Set after onboarding
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;               // Firebase Storage URL
  dateOfBirth: Timestamp | null;
  gender: 'male' | 'female' | 'other' | null;
  
  // Verification Status
  verification: {
    phone: {
      verified: boolean;
      verifiedAt: Timestamp | null;
    };
    email: {
      verified: boolean;
      verifiedAt: Timestamp | null;
      verificationToken: string | null;  // For email verification link
    };
    bvn: {
      status: 'pending' | 'verified' | 'failed' | 'expired';
      last4: string | null;              // Last 4 digits only
      hash: string | null;               // SHA-256 hash for duplicate detection
      verifiedAt: Timestamp | null;
      verifyMeRef: string | null;        // External reference
      expiresAt: Timestamp | null;       // Re-verification required after 2 years
    };
    nin: {
      status: 'pending' | 'verified' | 'failed' | 'expired';
      last4: string | null;
      hash: string | null;
      verifiedAt: Timestamp | null;
      verifyMeRef: string | null;
      expiresAt: Timestamp | null;
    };
  };
  
  // Profile Completion
  profileComplete: boolean;
  profileCompleteness: number;           // 0-100 percentage
  
  // Settings
  settings: {
    notifications: {
      push: boolean;                     // Push notifications enabled
      email: boolean;                    // Email notifications enabled
      sms: boolean;                      // SMS notifications enabled
      marketing: boolean;                // Marketing communications
      
      // Granular preferences
      newMessages: boolean;
      applicationUpdates: boolean;
      paymentReminders: boolean;
      priceDrops: boolean;               // Tenant only
      newListings: boolean;              // Tenant only
    };
    privacy: {
      showPhone: boolean;                // Show phone to other users
      showEmail: boolean;                // Show email to other users
      profileVisibility: 'public' | 'verified_only' | 'private';
    };
    language: 'en' | 'yo' | 'ig' | 'ha';  // UI language
    currency: 'NGN';                     // Always NGN
  };
  
  // FCM Tokens (for push notifications)
  fcmTokens: Array<{
    token: string;
    device: string;                      // Device identifier
    platform: 'ios' | 'android';
    createdAt: Timestamp;
    lastUsedAt: Timestamp;
  }>;
  
  // Activity Tracking
  lastLoginAt: Timestamp;
  lastActiveAt: Timestamp;
  loginCount: number;
  
  // Account Status
  status: 'active' | 'suspended' | 'deleted';
  suspensionReason: string | null;
  deletedAt: Timestamp | null;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Search Indexes (for queries)
  _searchName: string;                   // Lowercase full name for search
}

// Firestore Indexes Required:
// - users: userType ASC, status ASC, createdAt DESC
// - users: verification.bvn.status ASC, userType ASC
// - users: verification.bvn.hash ASC, uid ASC (for duplicate detection)
```

### 1.3.3 Tenants Collection Schema

```typescript
// Collection: tenants
// Document ID: Same as users/{userId}

interface Tenant {
  uid: string;
  
  // Employment Information
  employment: {
    status: 'employed' | 'self_employed' | 'student' | 'unemployed' | null;
    employer: string | null;
    role: string | null;
    industry: string | null;
    monthlyIncome: 'under_100k' | '100k_250k' | '250k_500k' | '500k_1m' | 'over_1m' | null;
    employmentStartDate: Timestamp | null;
    verificationStatus: 'pending' | 'verified' | 'failed';
    verifiedAt: Timestamp | null;
  };
  
  // Rental Preferences
  preferences: {
    areas: string[];                     // Preferred areas: ['Yaba', 'Ikeja']
    minBudget: number;                   // Minimum annual rent
    maxBudget: number;                   // Maximum annual rent
    bedrooms: number[];                  // Acceptable bedroom counts: [1, 2]
    propertyTypes: string[];             // ['mini_flat', 'two_bedroom']
    amenities: string[];                 // Must-have amenities
    moveInDate: Timestamp | null;        // Earliest move-in
    alertsEnabled: boolean;              // New listing alerts
  };
  
  // Rental History
  rentalHistory: {
    count: number;                       // Total past rentals
    previousLeases: Array<{
      propertyId: string | null;         // If rented via platform
      address: string;
      landlordName: string | null;
      landlordPhone: string | null;
      startDate: Timestamp;
      endDate: Timestamp;
      annualRent: number;
      exitReason: 'lease_end' | 'moved' | 'evicted' | 'other';
      reference: boolean;                // Landlord can be contacted
    }>;
  };
  
  // Saved Properties
  savedProperties: string[];             // Array of propertyIds
  savedSearches: string[];               // Array of savedSearchIds
  viewedProperties: Array<{
    propertyId: string;
    viewedAt: Timestamp;
    viewCount: number;
  }>;
  
  // Rating (from landlords)
  rating: {
    average: number;                     // 0-5, one decimal
    count: number;                       // Number of ratings
    breakdown: {
      paymentTimeliness: number;
      propertyUpkeep: number;
      communication: number;
      compliance: number;
    };
  };
  
  // Documents (reusable across applications)
  documents: {
    governmentId: {
      type: 'national_id' | 'drivers_license' | 'voters_card' | 'passport';
      url: string;
      uploadedAt: Timestamp;
      verified: boolean;
    } | null;
    employmentLetter: {
      url: string;
      uploadedAt: Timestamp;
      expiresAt: Timestamp;              // Letters older than 3 months need refresh
    } | null;
    bankStatement: {
      url: string;
      months: number;                    // 3 or 6 months
      uploadedAt: Timestamp;
      expiresAt: Timestamp;
    } | null;
  };
  
  // Active Rentals
  activeLeases: string[];                // Array of leaseIds
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Indexes:
// - tenants: preferences.areas ARRAY_CONTAINS, preferences.maxBudget ASC
// - tenants: rating.average DESC, updatedAt DESC
```

### 1.3.4 Landlords Collection Schema

```typescript
// Collection: landlords
// Document ID: Same as users/{userId}

interface Landlord {
  uid: string;
  
  // Property Ownership Verification
  ownershipVerification: {
    status: 'pending' | 'submitted' | 'verified' | 'rejected';
    documents: Array<{
      type: 'certificate_of_occupancy' | 'deed_of_assignment' | 'land_receipt' | 'family_receipt' | 'other';
      url: string;
      uploadedAt: Timestamp;
      verified: boolean;
      rejectionReason: string | null;
    }>;
    verifiedAt: Timestamp | null;
    verifiedBy: string | null;           // Admin UID who verified
    notes: string | null;
  };
  
  // Bank Account (for receiving payments)
  bankAccount: {
    bankCode: string;                    // Nigerian bank code
    bankName: string;
    accountNumber: string;               // Encrypted
    accountNumberLast4: string;          // Display only
    accountName: string;                 // From Paystack resolve
    verified: boolean;
    paystackRecipientCode: string;       // For transfers
    verifiedAt: Timestamp;
  } | null;
  
  // Portfolio Summary (denormalized for quick access)
  portfolio: {
    totalProperties: number;
    activeListings: number;
    occupiedProperties: number;
    vacantProperties: number;
    totalValue: number;                  // Sum of annual rents
    totalEarnings: number;               // All-time earnings via platform
    pendingPayments: number;             // Expected upcoming payments
  };
  
  // Subscription Plan
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'past_due' | 'cancelled' | 'trial';
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    features: {
      maxListings: number;               // 1 for free, 5 for basic, 20 for premium, unlimited for enterprise
      featuredListings: number;          // 0, 1, 5, unlimited
      analytics: boolean;
      prioritySupport: boolean;
      bulkUpload: boolean;
      apiAccess: boolean;
    };
    paystackSubscriptionCode: string | null;
  };
  
  // Rating (from tenants)
  rating: {
    average: number;
    count: number;
    breakdown: {
      communication: number;
      propertyCondition: number;
      maintenance: number;
      valueForMoney: number;
    };
  };
  
  // Response Metrics
  responseMetrics: {
    averageResponseTime: number;         // Minutes
    responseRate: number;                // Percentage
    totalInquiries: number;
    respondedInquiries: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Indexes:
// - landlords: subscription.plan ASC, portfolio.activeListings DESC
// - landlords: rating.average DESC, portfolio.totalProperties DESC
```

### 1.3.5 Properties Collection Schema

```typescript
// Collection: properties
// Document ID: Auto-generated

interface Property {
  id: string;
  landlordId: string;                    // Reference to landlords collection
  
  // Basic Information
  title: string;                         // "Spacious 2BR in Yaba"
  description: string;                   // Detailed description
  propertyType: 'self_contained' | 'mini_flat' | 'one_bedroom' | 'two_bedroom' | 
                'three_bedroom' | 'four_bedroom' | 'duplex' | 'bungalow' | 
                'boys_quarters' | 'penthouse' | 'studio';
  
  // Property Details
  details: {
    bedrooms: number;
    bathrooms: number;
    toilets: number;
    sizeSqm: number | null;
    yearBuilt: number | null;
    furnishing: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
    floors: number;                      // Which floor (0 = ground)
    totalFloors: number;                 // Building total floors
    parkingSpaces: number;
    compound: 'shared' | 'private' | 'none';
  };
  
  // Location (Indexed for geo-queries)
  location: {
    address: string;                     // Full street address
    area: string;                        // e.g., "Yaba"
    lga: string;                         // Local Government Area
    state: 'Lagos';                      // Always Lagos initially
    coordinates: {
      latitude: number;                  // 6.3 - 6.7 for Lagos
      longitude: number;                 // 3.0 - 4.0 for Lagos
    };
    geohash: string;                     // For geo-queries
    nearbyLandmarks: string[];           // ["University of Lagos", "Yaba Tech"]
    transportAccess: string[];           // ["BRT Yaba", "Ojuelegba Station"]
  };
  
  // Pricing (All amounts in Naira)
  pricing: {
    annualRent: number;                  // Primary: yearly rent
    monthlyEquivalent: number;           // Calculated: annualRent / 12
    cautionDeposit: number;              // Usually 1 year rent
    cautionDepositMonths: number;        // 12, 24, etc.
    serviceCharge: number;               // Annual service charge
    agreementFee: number;                // One-time legal fee
    
    // Platform fees (calculated)
    platformFee: number;                 // 2% of annual rent
    totalUpfront: number;                // Sum of all upfront costs
    
    // Comparison (calculated from market data)
    agentSavings: number;                // 10% of annual rent (traditional agent fee)
    marketComparison: {
      areaAverage: number;
      percentile: number;                // Where this listing falls
      recommendation: 'competitive' | 'market' | 'premium' | 'below' | 'above';
    } | null;
  };
  
  // Media
  media: {
    photos: Array<{
      url: string;                       // Full-size image
      thumbnail: string;                 // 300x300 thumbnail
      order: number;                     // Display order (0 = primary)
      isPrimary: boolean;
      caption: string | null;
      width: number;
      height: number;
    }>;
    virtualTourUrl: string | null;       // 360° tour link
    videoUrl: string | null;             // Video tour link
    floorPlanUrl: string | null;
  };
  
  // Amenities (indexed for filtering)
  amenities: string[];                   // Array of amenity IDs
  /*
    Standard amenities:
    - '24hr_electricity', 'generator_backup', 'solar_power'
    - 'water_supply', 'borehole', 'water_heater'
    - 'security', 'cctv', 'gateman', 'fence'
    - 'parking', 'garage'
    - 'air_conditioning', 'ceiling_fan'
    - 'fitted_kitchen', 'wardrobe', 'pop_ceiling'
    - 'internet_ready', 'cable_ready'
    - 'gym', 'swimming_pool', 'garden'
    - 'balcony', 'terrace'
    - 'ensuite', 'guest_toilet'
    - 'servant_quarters', 'store_room'
  */
  
  // Rules & Policies
  rules: {
    petPolicy: 'no_pets' | 'small_pets' | 'cats_only' | 'dogs_only' | 'all_pets';
    smokingPolicy: 'no_smoking' | 'outdoor_only' | 'allowed';
    maxOccupants: number;
    noisePolicy: string | null;          // "Quiet hours: 10pm - 7am"
    guestPolicy: string | null;
    customRules: string[];               // Additional house rules
  };
  
  // Availability
  availability: {
    status: 'available' | 'reserved' | 'rented' | 'maintenance';
    availableFrom: Timestamp;            // When property becomes available
    minimumLease: number;                // Months (usually 12)
    maximumLease: number;                // Months (usually 36)
  };
  
  // Current Tenant (if rented)
  currentTenant: {
    tenantId: string;
    leaseId: string;
    moveInDate: Timestamp;
    leaseEndDate: Timestamp;
  } | null;
  
  // Status Flags
  status: {
    listing: 'draft' | 'active' | 'paused' | 'expired' | 'rented' | 'deleted';
    verified: boolean;                   // Admin verified
    verifiedAt: Timestamp | null;
    verifiedBy: string | null;
    featured: boolean;                   // Premium placement
    featuredUntil: Timestamp | null;
    boostActive: boolean;                // Temporary boost
    boostUntil: Timestamp | null;
    flagged: boolean;                    // Reported by users
    flagReason: string | null;
  };
  
  // Analytics (updated periodically)
  analytics: {
    viewCount: number;
    uniqueViewers: number;
    savedCount: number;
    shareCount: number;
    inquiryCount: number;
    applicationCount: number;
    conversionRate: number;              // Applications / Views
    averageViewDuration: number;         // Seconds
    lastViewedAt: Timestamp | null;
    
    // Performance over time
    weeklyViews: number[];               // Last 8 weeks
    weeklyInquiries: number[];
  };
  
  // Search Optimization
  _searchKeywords: string[];             // Tokenized for full-text search
  _priceRange: string;                   // 'under_500k', '500k_1m', etc.
  _bedroomRange: string;                 // '1', '2', '3plus'
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
  expiresAt: Timestamp | null;           // Auto-expire after 90 days
}

// Firestore Indexes (Critical for performance):
// - properties: status.listing ASC, location.area ASC, pricing.annualRent ASC
// - properties: status.listing ASC, location.geohash ASC
// - properties: status.listing ASC, amenities ARRAY_CONTAINS_ANY, pricing.annualRent ASC
// - properties: status.listing ASC, details.bedrooms ASC, location.area ASC
// - properties: landlordId ASC, status.listing ASC, createdAt DESC
// - properties: status.featured ASC, publishedAt DESC
// - properties: location.area ASC, propertyType ASC, pricing.annualRent ASC
```

### 1.3.6 Applications Collection Schema

```typescript
// Collection: applications
// Document ID: Auto-generated

interface Application {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  
  // Application Status
  status: 'pending' | 'viewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  
  // Application Details
  details: {
    preferredMoveIn: Timestamp;
    leaseDuration: '1_year' | '2_years' | '3_years';
    proposedRent: number | null;         // If negotiating
    
    occupants: {
      adults: number;
      children: number;
      pets: {
        hasPets: boolean;
        petType: string | null;
        petCount: number;
      };
    };
    
    message: string;                     // Introduction message
    additionalNotes: string | null;
  };
  
  // Tenant Snapshot (captured at application time)
  tenantSnapshot: {
    name: string;
    photoUrl: string;
    phone: string;                       // Revealed only after acceptance
    email: string;                       // Revealed only after acceptance
    
    verification: {
      bvn: boolean;
      nin: boolean;
      employment: boolean;
    };
    
    rating: {
      average: number;
      count: number;
    };
    
    employmentInfo: {
      status: string;
      employer: string | null;
      role: string | null;
      monthlyIncome: string | null;
      employmentDuration: string | null;
    } | null;
    
    rentalHistory: {
      count: number;
      lastAddress: string | null;
    };
    
    profileCompleteness: number;
  };
  
  // Documents Submitted
  documents: {
    governmentId: {
      type: string;
      url: string;
      verified: boolean;
    } | null;
    employmentLetter: {
      url: string;
      uploadedAt: Timestamp;
    } | null;
    bankStatement: {
      url: string;
      months: number;
    } | null;
    additionalDocs: Array<{
      name: string;
      url: string;
      uploadedAt: Timestamp;
    }>;
  };
  
  // Communication
  conversationId: string | null;         // Link to conversation
  
  // Timeline
  timeline: Array<{
    action: 'submitted' | 'viewed' | 'shortlisted' | 'messaged' | 
            'document_requested' | 'document_submitted' |
            'accepted' | 'rejected' | 'withdrawn' | 'expired';
    timestamp: Timestamp;
    actor: string;                       // UID who performed action
    note: string | null;
    metadata: Record<string, any> | null;
  }>;
  
  // Landlord's Notes (private)
  landlordNotes: string | null;
  
  // Scoring (internal)
  score: {
    total: number;                       // 0-100
    breakdown: {
      verificationScore: number;         // BVN + NIN = 40 points
      employmentScore: number;           // 20 points
      rentalHistoryScore: number;        // 20 points
      profileCompletenessScore: number;  // 10 points
      responseTimeScore: number;         // 10 points
    };
  };
  
  // Expiration
  expiresAt: Timestamp;                  // 14 days from submission
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Indexes:
// - applications: landlordId ASC, status ASC, createdAt DESC
// - applications: tenantId ASC, status ASC, createdAt DESC
// - applications: propertyId ASC, status ASC
// - applications: status ASC, expiresAt ASC
```

---

## 1.4 State Machine Diagrams

### 1.4.1 User Lifecycle State Machine

```
                                    ┌─────────────────────────────────────────┐
                                    │           USER LIFECYCLE                │
                                    └─────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌─────────────────────────────────────────────────┐
                              │                  ANONYMOUS                       │
                              │  (User opens app, no authentication)            │
                              └──────────────────────┬──────────────────────────┘
                                                     │
                                          [Enters phone number]
                                                     │
                                                     ▼
                              ┌─────────────────────────────────────────────────┐
                              │               OTP_PENDING                        │
                              │  (Waiting for OTP verification)                 │
                              └──────────────────────┬──────────────────────────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    │                                 │
                           [OTP valid]                        [5 attempts failed]
                                    │                                 │
                                    ▼                                 ▼
┌──────────────────────────────────────────────────┐    ┌─────────────────────────┐
│               AUTHENTICATED                       │    │       LOCKED_OUT        │
│  (Phone verified, checking profile)              │    │  (Wait 1 hour)          │
└──────────────────────┬───────────────────────────┘    └─────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │                         │
    [New user]              [Existing user]
          │                         │
          ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  PROFILE_SETUP      │   │      ACTIVE         │
│  (Creating profile) │   │  (Fully active)     │
└─────────┬───────────┘   └──────────┬──────────┘
          │                          │
    [Completes form]           [Admin action]
          │                          │
          ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐
│ VERIFICATION_PROMPT │   │     SUSPENDED       │
│ (BVN/NIN optional)  │   │ (Pending review)    │
└─────────┬───────────┘   └──────────┬──────────┘
          │                          │
    ┌─────┴─────┐              [Reinstated]
    │           │                    │
[Verifies]  [Skips]                  │
    │           │                    │
    ▼           ▼                    ▼
┌─────────────────────┐   ┌─────────────────────┐
│   ACTIVE_VERIFIED   │◄──┤      ACTIVE         │
│ (Full platform)     │   │  (Limited features) │
└─────────────────────┘   └─────────────────────┘
```

### 1.4.2 Property Listing State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PROPERTY LISTING LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │     DRAFT     │
                              │ (Incomplete)  │
                              └───────┬───────┘
                                      │
                             [Publish action]
                                      │
                                      ▼
                              ┌───────────────┐
                              │    ACTIVE     │◄────────────────────┐
                              │  (Live in     │                     │
                              │   search)     │                     │
                              └───────┬───────┘                     │
                                      │                             │
         ┌────────────────────────────┼────────────────────────┐    │
         │                            │                        │    │
    [Pause]                    [Application                [Resume] │
         │                      accepted]                      │    │
         ▼                            │                        │    │
  ┌──────────────┐                    │                  ┌─────┴────┴───┐
  │    PAUSED    │◄───────────────────┼──────────────────│   PAUSED     │
  │  (Hidden)    │                    │    [Tenant       │  (Hidden)    │
  └──────────────┘                    │     cancels]     └──────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   RESERVED    │
                              │  (Pending     │
                              │   payment)    │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                                   │
            [Payment complete]                    [Payment fails/
                    │                              timeout 48hr]
                    ▼                                   │
            ┌───────────────┐                           │
            │    RENTED     │                           │
            │  (Occupied)   │                           │
            └───────┬───────┘                           │
                    │                                   │
            [Lease ends]                                │
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    ACTIVE     │
                              │  (Available   │
                              │    again)     │
                              └───────────────┘


Special Transitions:
───────────────────
• ANY STATE → DELETED: Landlord deletes listing
• ANY STATE → EXPIRED: 90 days without renewal
• ANY STATE → FLAGGED: User reports violation
```

### 1.4.3 Rental Application State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE MACHINE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │                   PENDING                    │
                    │  • Tenant submits application               │
                    │  • Landlord receives notification           │
                    │  • Timer: 14 days to expiration             │
                    └──────────────────────┬──────────────────────┘
                                           │
              ┌───────────────┬────────────┼────────────┬───────────────┐
              │               │            │            │               │
     [Landlord views]  [Tenant withdraws]  │    [14 days pass]  [Property rented]
              │               │            │            │               │
              ▼               ▼            │            ▼               ▼
      ┌──────────────┐ ┌──────────────┐    │   ┌──────────────┐ ┌──────────────┐
      │    VIEWED    │ │  WITHDRAWN   │    │   │   EXPIRED    │ │  CANCELLED   │
      │              │ │   (Final)    │    │   │   (Final)    │ │   (Final)    │
      └──────┬───────┘ └──────────────┘    │   └──────────────┘ └──────────────┘
             │                             │
             │                             │
    ┌────────┼────────┐                    │
    │        │        │                    │
[Shortlist] │  [Reject]                    │
    │        │        │                    │
    ▼        │        ▼                    │
┌──────────────┐  ┌──────────────┐         │
│ SHORTLISTED  │  │   REJECTED   │         │
│              │  │   (Final)    │         │
└──────┬───────┘  └──────────────┘         │
       │                                   │
       │                                   │
  ┌────┼────┐                              │
  │         │                              │
[Accept]  [Reject]                         │
  │         │                              │
  ▼         │                              │
┌──────────────┐                           │
│   ACCEPTED   │                           │
│              │◄──────────────────────────┘
│ • Tenant notified                        │
│ • Contact revealed                       │
│ • Payment link sent                      │
│ • Timer: 48hr to pay                     │
└──────┬───────┘
       │
  ┌────┼────────────────┐
  │                     │
[Payment success]  [No payment 48hr]
  │                     │
  ▼                     ▼
┌──────────────┐  ┌──────────────┐
│  COMPLETED   │  │   EXPIRED    │
│   (Final)    │  │   (Final)    │
│              │  │              │
│ • Lease      │  │ • Property   │
│   created    │  │   re-listed  │
│ • Property   │  │              │
│   marked     │  │              │
│   rented     │  │              │
└──────────────┘  └──────────────┘


Status Transition Rules:
────────────────────────
• PENDING → VIEWED: Automatic when landlord opens application
• VIEWED → SHORTLISTED: Landlord explicitly shortlists
• SHORTLISTED → ACCEPTED: Only ONE application can be accepted per property
• ACCEPTED → COMPLETED: Triggered by payment webhook
• Tenant can WITHDRAW at any stage except COMPLETED
```

### 1.4.4 Payment & Escrow State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT STATE MACHINE                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │  INITIALIZED  │
                              │               │
                              │ Paystack      │
                              │ URL generated │
                              └───────┬───────┘
                                      │
                       ┌──────────────┼──────────────┐
                       │              │              │
                  [Success]     [Abandoned]    [Failed]
                       │              │              │
                       ▼              ▼              ▼
              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
              │   PENDING    │ │  ABANDONED   │ │   FAILED     │
              │              │ │   (Final)    │ │   (Retry)    │
              │ Processing...│ └──────────────┘ └──────────────┘
              └───────┬──────┘
                      │
               [Webhook received]
                      │
                      ▼
              ┌───────────────┐
              │   COMPLETED   │
              │               │
              │ Funds received│
              └───────┬───────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    [Has deposit]            [No deposit]
         │                         │
         ▼                         ▼
  ┌──────────────┐          ┌──────────────┐
  │ ESCROW_HELD  │          │ PAYOUT_READY │
  │              │          │              │
  │ 7-day hold   │          │ Transfer     │
  │ starts       │          │ immediately  │
  └───────┬──────┘          └───────┬──────┘
          │                         │
     ┌────┼────────┐                │
     │             │                │
[7 days pass] [Dispute filed]       │
     │             │                │
     ▼             ▼                │
┌──────────────┐ ┌──────────────┐   │
│ESCROW_RELEASE│ │   DISPUTED   │   │
│              │ │              │   │
│ Ready to     │ │ Frozen until │   │
│ transfer     │ │ resolved     │   │
└───────┬──────┘ └───────┬──────┘   │
        │                │          │
        │        ┌───────┴───────┐  │
        │        │               │  │
        │  [Landlord wins]  [Tenant wins]
        │        │               │  │
        │        ▼               ▼  │
        │  ┌──────────────┐ ┌──────────────┐
        │  │PAYOUT_READY  │ │  REFUNDED    │
        │  │              │ │   (Final)    │
        │  └───────┬──────┘ └──────────────┘
        │          │
        └──────────┤
                   │
          [Transfer initiated]
                   │
                   ▼
          ┌───────────────┐
          │  TRANSFERRED  │
          │   (Final)     │
          │               │
          │ Funds in      │
          │ landlord's    │
          │ bank account  │
          └───────────────┘
```

---

## 1.5 API Rate Limits & Quotas

### 1.5.1 Firebase Quotas

| Service | Free Tier | Blaze Plan | Our Target |
|---------|-----------|------------|------------|
| Auth verifications | 10K/month | Unlimited | <50K/month |
| Firestore reads | 50K/day | Pay per use | <500K/day |
| Firestore writes | 20K/day | Pay per use | <100K/day |
| Cloud Functions invocations | 125K/month | 2M free + pay | <500K/month |
| Storage | 5GB | Pay per GB | <50GB |
| FCM messages | Unlimited | Unlimited | <100K/day |

### 1.5.2 External API Rate Limits

| Service | Rate Limit | Our Approach |
|---------|------------|--------------|
| Paystack | 100 req/sec | Queue with exponential backoff |
| VerifyMe | 50 req/min | Cache results, batch processing |
| Termii | 100 req/sec | Queue SMS, priority for OTP |
| Google Maps | 1000 req/sec | Cache geocoding results |

### 1.5.3 Client Rate Limits (To Implement)

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| OTP requests | 3 | 5 minutes |
| Search queries | 60 | 1 minute |
| Message sends | 30 | 1 minute |
| Application submits | 5 | 1 hour |
| Profile updates | 10 | 1 minute |

---

*Continued in MASTER_PRD_PART2.md...*
