# DIRECTRENT.NG MASTER PRD — PART 3
## Testing, Agent Team Tasks & Implementation Guide

---

# 6. TESTING SPECIFICATIONS

## 6.1 Testing Requirements

| Test Type | Coverage Target | Tools |
|-----------|-----------------|-------|
| Unit Tests | 80% | Jest, React Testing Library |
| Integration Tests | 70% | Jest, Firebase Emulator |
| E2E Tests | 50% critical paths | Detox (mobile), Playwright (admin) |
| Security Tests | All auth + payment flows | OWASP ZAP, manual pen testing |
| Performance Tests | All API endpoints | k6, Firebase Performance |

## 6.2 Test Fixtures

### 6.2.1 User Fixtures

```typescript
// tests/fixtures/users.ts

export const MOCK_USERS = {
  verifiedTenant: {
    uid: 'tenant_001',
    phone: '+2348012345678',
    email: 'chidi@test.com',
    userType: 'tenant',
    firstName: 'Chidi',
    lastName: 'Okonkwo',
    photoUrl: 'https://storage.googleapis.com/directrent-test/users/tenant_001.jpg',
    verification: {
      phone: { verified: true, verifiedAt: new Date('2026-01-15') },
      email: { verified: true, verifiedAt: new Date('2026-01-15') },
      bvn: { status: 'verified', last4: '7890', verifiedAt: new Date('2026-01-16') },
      nin: { status: 'verified', last4: '4567', verifiedAt: new Date('2026-01-16') }
    },
    profileComplete: true,
    profileCompleteness: 100,
    settings: {
      notifications: { push: true, email: true, sms: true, marketing: false },
      privacy: { showPhone: false, showEmail: false, profileVisibility: 'verified_only' }
    }
  },
  
  unverifiedTenant: {
    uid: 'tenant_002',
    phone: '+2348098765432',
    userType: 'tenant',
    firstName: 'Ada',
    lastName: 'Nwosu',
    verification: {
      phone: { verified: true },
      bvn: { status: 'pending' },
      nin: { status: 'pending' }
    },
    profileComplete: true,
    profileCompleteness: 40
  },
  
  verifiedLandlord: {
    uid: 'landlord_001',
    phone: '+2348055555555',
    email: 'property@test.com',
    userType: 'landlord',
    firstName: 'Tunde',
    lastName: 'Bakare',
    verification: {
      phone: { verified: true },
      bvn: { status: 'verified', last4: '1234' }
    },
    profileComplete: true,
    profileCompleteness: 100
  }
};

export const MOCK_TENANTS = {
  fullProfile: {
    uid: 'tenant_001',
    employment: {
      status: 'employed',
      employer: 'Tech Corp Nigeria',
      role: 'Software Engineer',
      industry: 'Technology',
      monthlyIncome: '500k_1m',
      verificationStatus: 'verified'
    },
    preferences: {
      areas: ['Yaba', 'Surulere'],
      minBudget: 400000,
      maxBudget: 800000,
      bedrooms: [1, 2],
      propertyTypes: ['mini_flat', 'two_bedroom'],
      amenities: ['24hr_electricity', 'security'],
      alertsEnabled: true
    },
    rentalHistory: {
      count: 2,
      previousLeases: [
        {
          address: '15 Murtala Mohammed Way, Yaba',
          landlordName: 'Mr. Adebayo',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-12-31'),
          annualRent: 500000,
          exitReason: 'moved',
          reference: true
        }
      ]
    },
    rating: {
      average: 4.5,
      count: 2,
      breakdown: {
        paymentTimeliness: 5.0,
        propertyUpkeep: 4.0,
        communication: 4.5,
        compliance: 4.5
      }
    },
    savedProperties: ['prop_001', 'prop_002'],
    documents: {
      governmentId: {
        type: 'national_id',
        url: 'https://storage.googleapis.com/...',
        verified: true
      }
    },
    activeLeases: []
  }
};

export const MOCK_LANDLORDS = {
  premiumLandlord: {
    uid: 'landlord_001',
    ownershipVerification: {
      status: 'verified',
      documents: [
        { type: 'certificate_of_occupancy', verified: true }
      ]
    },
    bankAccount: {
      bankCode: '058',
      bankName: 'GTBank',
      accountNumberLast4: '4567',
      accountName: 'Tunde Bakare',
      verified: true,
      paystackRecipientCode: 'RCP_abc123'
    },
    portfolio: {
      totalProperties: 5,
      activeListings: 3,
      occupiedProperties: 2,
      vacantProperties: 1,
      totalValue: 4500000,
      totalEarnings: 2000000
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      features: {
        maxListings: 20,
        featuredListings: 5,
        analytics: true,
        prioritySupport: true
      }
    },
    rating: {
      average: 4.8,
      count: 15,
      breakdown: {
        communication: 4.9,
        propertyCondition: 4.7,
        maintenance: 4.8,
        valueForMoney: 4.6
      }
    },
    responseMetrics: {
      averageResponseTime: 45,
      responseRate: 95
    }
  }
};
```

### 6.2.2 Property Fixtures

```typescript
// tests/fixtures/properties.ts

export const MOCK_PROPERTIES = {
  activeListing: {
    id: 'prop_001',
    landlordId: 'landlord_001',
    title: 'Spacious 2BR Apartment in Yaba',
    description: 'Beautiful 2-bedroom apartment with modern finishes...',
    propertyType: 'two_bedroom',
    
    details: {
      bedrooms: 2,
      bathrooms: 2,
      toilets: 2,
      sizeSqm: 85,
      yearBuilt: 2020,
      furnishing: 'semi_furnished',
      floors: 2,
      totalFloors: 4,
      parkingSpaces: 1,
      compound: 'shared'
    },
    
    location: {
      address: '15 Herbert Macaulay Way, Yaba, Lagos',
      area: 'Yaba',
      lga: 'Yaba',
      state: 'Lagos',
      coordinates: {
        latitude: 6.5158,
        longitude: 3.3747
      },
      geohash: 's1z2b3c4',
      nearbyLandmarks: ['University of Lagos', 'Yaba Tech'],
      transportAccess: ['BRT Yaba', 'Jibowu Railway']
    },
    
    pricing: {
      annualRent: 650000,
      monthlyEquivalent: 54167,
      cautionDeposit: 650000,
      cautionDepositMonths: 12,
      serviceCharge: 50000,
      agreementFee: 25000,
      platformFee: 13000,
      totalUpfront: 1388000,
      agentSavings: 65000,
      marketComparison: {
        areaAverage: 680000,
        percentile: 45,
        recommendation: 'competitive'
      }
    },
    
    media: {
      photos: [
        {
          url: 'https://storage.googleapis.com/directrent-test/prop_001/full_0.webp',
          thumbnail: 'https://storage.googleapis.com/directrent-test/prop_001/thumb_0.webp',
          order: 0,
          isPrimary: true,
          width: 1920,
          height: 1440
        },
        // ... more photos
      ],
      virtualTourUrl: null,
      videoUrl: null
    },
    
    amenities: [
      '24hr_electricity', 'generator_backup', 'water_supply', 
      'borehole', 'security', 'parking', 'fitted_kitchen', 'wardrobe'
    ],
    
    rules: {
      petPolicy: 'small_pets',
      smokingPolicy: 'no_smoking',
      maxOccupants: 4,
      noisePolicy: 'Quiet hours: 10pm - 7am',
      guestPolicy: null,
      customRules: ['No loud music after 9pm']
    },
    
    availability: {
      status: 'available',
      availableFrom: new Date('2026-04-01'),
      minimumLease: 12,
      maximumLease: 24
    },
    
    currentTenant: null,
    
    status: {
      listing: 'active',
      verified: true,
      verifiedAt: new Date('2026-03-01'),
      featured: false,
      flagged: false
    },
    
    analytics: {
      viewCount: 150,
      uniqueViewers: 98,
      savedCount: 23,
      inquiryCount: 12,
      applicationCount: 3,
      conversionRate: 0.02
    },
    
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-03-10'),
    publishedAt: new Date('2026-02-15'),
    expiresAt: new Date('2026-05-15')
  },
  
  rentedProperty: {
    id: 'prop_002',
    // ... similar structure with status.listing = 'rented'
  },
  
  draftProperty: {
    id: 'draft_001',
    // ... partial data for draft
  }
};
```

### 6.2.3 Payment & Application Fixtures

```typescript
// tests/fixtures/applications.ts

export const MOCK_APPLICATIONS = {
  pendingApplication: {
    id: 'app_001',
    propertyId: 'prop_001',
    landlordId: 'landlord_001',
    tenantId: 'tenant_001',
    status: 'pending',
    
    details: {
      preferredMoveIn: new Date('2026-04-15'),
      leaseDuration: '1_year',
      proposedRent: null,
      occupants: {
        adults: 2,
        children: 0,
        pets: { hasPets: false }
      },
      message: 'I am interested in this property...'
    },
    
    tenantSnapshot: {
      name: 'Chidi Okonkwo',
      photoUrl: 'https://...',
      phone: '+2348012345678',
      email: 'chidi@test.com',
      verification: { bvn: true, nin: true, employment: true },
      rating: { average: 4.5, count: 2 },
      employmentInfo: {
        status: 'employed',
        employer: 'Tech Corp Nigeria',
        role: 'Software Engineer',
        monthlyIncome: '500k_1m'
      },
      profileCompleteness: 100
    },
    
    timeline: [
      { action: 'submitted', timestamp: new Date('2026-03-10'), actor: 'tenant_001' }
    ],
    
    score: {
      total: 85,
      breakdown: {
        verificationScore: 40,
        employmentScore: 20,
        rentalHistoryScore: 15,
        profileCompletenessScore: 10,
        responseTimeScore: 0
      }
    },
    
    expiresAt: new Date('2026-03-24'),
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-10')
  },
  
  acceptedApplication: {
    id: 'app_002',
    status: 'accepted',
    // ... rest of fields
  }
};

// tests/fixtures/payments.ts

export const MOCK_PAYMENTS = {
  completedPayment: {
    id: 'DR-1710235200000-abc12345',
    tenantId: 'tenant_001',
    landlordId: 'landlord_001',
    propertyId: 'prop_001',
    applicationId: 'app_001',
    
    type: 'initial',
    status: 'completed',
    
    breakdown: {
      annualRent: 650000,
      cautionDeposit: 650000,
      serviceCharge: 50000,
      platformFee: 13000,
      total: 1363000
    },
    
    paystack: {
      reference: 'DR-1710235200000-abc12345',
      channel: 'card',
      transactionId: 'txn_123456'
    },
    
    escrow: {
      status: 'held',
      amount: 650000,
      heldAt: new Date('2026-03-12'),
      releaseDate: new Date('2026-03-19')
    },
    
    paidAt: new Date('2026-03-12'),
    createdAt: new Date('2026-03-12')
  }
};
```

## 6.3 Test Scenarios

### 6.3.1 Authentication Test Cases

```typescript
// tests/auth/phone-auth.test.ts

describe('Phone Authentication', () => {
  describe('sendOTP', () => {
    it('should send OTP for valid Nigerian phone number', async () => {
      const result = await sendOTP({ phone: '08012345678', purpose: 'login' });
      
      expect(result.success).toBe(true);
      expect(result.data.phoneNormalized).toBe('+2348012345678');
      expect(result.data.expiresIn).toBe(300);
    });
    
    it('should reject invalid phone format', async () => {
      await expect(sendOTP({ phone: '12345', purpose: 'login' }))
        .rejects.toMatchObject({
          code: 'INVALID_PHONE'
        });
    });
    
    it('should rate limit after 3 attempts', async () => {
      // First 3 should succeed
      await sendOTP({ phone: '08012345678', purpose: 'login' });
      await sendOTP({ phone: '08012345678', purpose: 'login' });
      await sendOTP({ phone: '08012345678', purpose: 'login' });
      
      // 4th should fail
      await expect(sendOTP({ phone: '08012345678', purpose: 'login' }))
        .rejects.toMatchObject({
          code: 'RATE_LIMITED'
        });
    });
    
    it('should block phone after 5 failed OTP attempts', async () => {
      const confirmation = await auth().signInWithPhoneNumber('+2348012345678');
      
      // 5 wrong OTPs
      for (let i = 0; i < 5; i++) {
        await expect(confirmation.confirm('000000')).rejects.toThrow();
      }
      
      // Should be blocked
      await expect(sendOTP({ phone: '08012345678', purpose: 'login' }))
        .rejects.toMatchObject({
          code: 'PHONE_BLOCKED'
        });
    });
  });
  
  describe('Profile Creation', () => {
    beforeEach(async () => {
      // Sign in with test user
      await signInWithCustomToken(testUserToken);
    });
    
    it('should create tenant profile with valid data', async () => {
      const result = await createUserProfile({
        userType: 'tenant',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.userType).toBe('tenant');
      expect(result.data.profileCompleteness).toBeGreaterThan(0);
    });
    
    it('should reject profile with invalid name', async () => {
      await expect(createUserProfile({
        userType: 'tenant',
        firstName: 'A',  // Too short
        lastName: 'User'
      })).rejects.toMatchObject({
        code: 'VALIDATION_FAILED'
      });
    });
    
    it('should prevent duplicate profile creation', async () => {
      await createUserProfile({
        userType: 'tenant',
        firstName: 'Test',
        lastName: 'User'
      });
      
      await expect(createUserProfile({
        userType: 'tenant',
        firstName: 'Test',
        lastName: 'User'
      })).rejects.toMatchObject({
        code: 'PROFILE_EXISTS'
      });
    });
  });
});
```

### 6.3.2 Property Listing Test Cases

```typescript
// tests/properties/create-listing.test.ts

describe('Create Property Listing', () => {
  beforeEach(async () => {
    await signInAsVerifiedLandlord();
  });
  
  it('should create listing with all required fields', async () => {
    const result = await createListing(VALID_LISTING_DATA);
    
    expect(result.success).toBe(true);
    expect(result.data.propertyId).toBeDefined();
    expect(result.data.status).toBe('active');
    expect(result.data.pricing.platformFee).toBe(
      Math.round(VALID_LISTING_DATA.pricing.annualRent * 0.02)
    );
  });
  
  it('should reject listing with fewer than 5 photos', async () => {
    const invalidData = {
      ...VALID_LISTING_DATA,
      media: {
        photos: VALID_LISTING_DATA.media.photos.slice(0, 3) // Only 3 photos
      }
    };
    
    await expect(createListing(invalidData))
      .rejects.toMatchObject({
        code: 'INSUFFICIENT_PHOTOS'
      });
  });
  
  it('should reject listing outside Lagos coordinates', async () => {
    const invalidData = {
      ...VALID_LISTING_DATA,
      location: {
        ...VALID_LISTING_DATA.location,
        coordinates: { latitude: 9.0, longitude: 7.0 } // Abuja
      }
    };
    
    await expect(createListing(invalidData))
      .rejects.toMatchObject({
        code: 'INVALID_COORDINATES'
      });
  });
  
  it('should enforce listing limit for free plan', async () => {
    // Create 1 listing (free plan limit)
    await createListing(VALID_LISTING_DATA);
    
    // Second should fail
    await expect(createListing(VALID_LISTING_DATA))
      .rejects.toMatchObject({
        code: 'LISTING_LIMIT_REACHED'
      });
  });
  
  it('should calculate market comparison correctly', async () => {
    const result = await createListing(VALID_LISTING_DATA);
    
    expect(result.data.analytics.competitorCount).toBeGreaterThanOrEqual(0);
    expect(['competitive', 'market', 'premium', 'below', 'above'])
      .toContain(result.data.pricing.marketComparison?.recommendation);
  });
});
```

### 6.3.3 Payment Flow Test Cases

```typescript
// tests/payments/payment-flow.test.ts

describe('Payment Flow', () => {
  let applicationId: string;
  
  beforeEach(async () => {
    // Create an accepted application
    const application = await createAcceptedApplication();
    applicationId = application.id;
  });
  
  describe('initializePayment', () => {
    it('should initialize payment for accepted application', async () => {
      await signInAsTenant();
      
      const result = await initializePayment({ applicationId });
      
      expect(result.success).toBe(true);
      expect(result.data.authorizationUrl).toMatch(/^https:\/\/checkout\.paystack\.com/);
      expect(result.data.breakdown.total).toBe(
        result.data.breakdown.annualRent +
        result.data.breakdown.cautionDeposit +
        result.data.breakdown.serviceCharge +
        result.data.breakdown.platformFee
      );
    });
    
    it('should reject payment for non-accepted application', async () => {
      await signInAsTenant();
      
      const pendingApp = await createPendingApplication();
      
      await expect(initializePayment({ applicationId: pendingApp.id }))
        .rejects.toMatchObject({
          code: 'APPLICATION_NOT_ACCEPTED'
        });
    });
    
    it('should return existing pending payment if not expired', async () => {
      await signInAsTenant();
      
      const first = await initializePayment({ applicationId });
      const second = await initializePayment({ applicationId });
      
      expect(second.data.reference).toBe(first.data.reference);
    });
  });
  
  describe('Webhook Processing', () => {
    it('should process charge.success and create lease', async () => {
      // Initialize payment
      const payment = await initializePayment({ applicationId });
      
      // Simulate webhook
      const webhookPayload = createChargeSuccessWebhook(payment.data.reference);
      await sendWebhook('charge.success', webhookPayload);
      
      // Verify payment status
      const paymentDoc = await getPayment(payment.data.reference);
      expect(paymentDoc.status).toBe('completed');
      
      // Verify lease created
      const leases = await getLeasesForApplication(applicationId);
      expect(leases.length).toBe(1);
      expect(leases[0].status).toBe('pending_signature');
      
      // Verify property status
      const property = await getProperty(MOCK_APPLICATIONS.pendingApplication.propertyId);
      expect(property.status.listing).toBe('rented');
    });
    
    it('should hold deposit in escrow', async () => {
      const payment = await initializePayment({ applicationId });
      await sendWebhook('charge.success', createChargeSuccessWebhook(payment.data.reference));
      
      const paymentDoc = await getPayment(payment.data.reference);
      expect(paymentDoc.escrow.status).toBe('held');
      expect(paymentDoc.escrow.amount).toBe(paymentDoc.breakdown.cautionDeposit);
    });
    
    it('should prevent duplicate webhook processing', async () => {
      const payment = await initializePayment({ applicationId });
      const webhook = createChargeSuccessWebhook(payment.data.reference);
      
      // Process twice
      await sendWebhook('charge.success', webhook);
      await sendWebhook('charge.success', webhook);
      
      // Should only create one lease
      const leases = await getLeasesForApplication(applicationId);
      expect(leases.length).toBe(1);
    });
  });
});
```

---

# 7. AGENT TEAM TASK BREAKDOWN

## 7.1 Team Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DIRECTRENT AGENT TEAMS                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                           │
│  │   ARCHITECT     │ ◄─── Project Lead, Technical Decisions                   │
│  │   (Team Lead)   │      Coordinates all teams                                │
│  └────────┬────────┘                                                           │
│           │                                                                     │
│           ├─────────────────────────────────────────────────────────┐          │
│           │                                                         │          │
│  ┌────────▼────────┐  ┌─────────────────┐  ┌─────────────────┐     │          │
│  │ FRONTEND-TENANT │  │FRONTEND-LANDLORD│  │     BACKEND     │     │          │
│  │                 │  │                 │  │                 │     │          │
│  │ • Search UI     │  │ • Dashboard     │  │ • Firestore     │     │          │
│  │ • Property View │  │ • Listings      │  │ • Cloud Funcs   │     │          │
│  │ • Applications  │  │ • Applications  │  │ • Security      │     │          │
│  │ • Messages      │  │ • Messages      │  │ • Notifications │     │          │
│  │ • Profile       │  │ • Analytics     │  │                 │     │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │          │
│                                                                     │          │
│  ┌─────────────────────────────────────────────────────────────────┴───────┐  │
│  │                         SPECIALIZED TEAMS                               │  │
│  ├────────────────────────┬─────────────────────────────────────────────────┤  │
│  │      PAYMENTS          │              VERIFICATION                      │  │
│  │                        │                                                 │  │
│  │ • Paystack Integration │ • VerifyMe BVN/NIN                             │  │
│  │ • Escrow System        │ • Bank Account Verification                    │  │
│  │ • Payout Processing    │ • Document Verification                        │  │
│  │ • Receipt Generation   │ • Audit Logging                                │  │
│  └────────────────────────┴─────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Team-Specific Task Lists

### 7.2.1 ARCHITECT Tasks

| Task ID | Task | Dependencies | Priority | Estimated Hours |
|---------|------|--------------|----------|-----------------|
| ARCH-001 | Set up Expo monorepo structure | None | P0 | 2 |
| ARCH-002 | Configure TypeScript strict mode | ARCH-001 | P0 | 1 |
| ARCH-003 | Set up shared package (@directrent/shared) | ARCH-001 | P0 | 2 |
| ARCH-004 | Configure Firebase project | None | P0 | 1 |
| ARCH-005 | Set up environment variables | ARCH-004 | P0 | 1 |
| ARCH-006 | Create design token system | ARCH-003 | P1 | 3 |
| ARCH-007 | Set up CI/CD pipeline | ARCH-001 | P1 | 4 |
| ARCH-008 | Configure EAS Build profiles | ARCH-007 | P1 | 2 |
| ARCH-009 | Define Firestore indexes | BE-001 | P1 | 2 |
| ARCH-010 | Review and approve PRs | Ongoing | P0 | Ongoing |

### 7.2.2 BACKEND Tasks

| Task ID | Task | Dependencies | Priority | Hours |
|---------|------|--------------|----------|-------|
| BE-001 | Create Firestore collections schema | ARCH-004 | P0 | 3 |
| BE-002 | Implement security rules | BE-001 | P0 | 4 |
| BE-003 | onUserCreate Cloud Function | BE-001 | P0 | 2 |
| BE-004 | sendOTP rate limiting | BE-003 | P0 | 2 |
| BE-005 | createUserProfile function | BE-003 | P0 | 3 |
| BE-006 | verifyBVN function | BE-005, VER-001 | P0 | 4 |
| BE-007 | verifyNIN function | BE-005, VER-001 | P0 | 3 |
| BE-008 | createListing function | BE-002 | P0 | 5 |
| BE-009 | Property photo processing | BE-008 | P0 | 3 |
| BE-010 | searchProperties query optimization | BE-008 | P0 | 4 |
| BE-011 | getMarketRate function | BE-010 | P1 | 3 |
| BE-012 | submitApplication function | BE-010 | P0 | 4 |
| BE-013 | updateApplicationStatus function | BE-012 | P0 | 3 |
| BE-014 | sendMessage function | BE-001 | P0 | 3 |
| BE-015 | Real-time message listeners | BE-014 | P0 | 2 |
| BE-016 | Push notification service | BE-001 | P0 | 4 |
| BE-017 | SMS notification service (Termii) | BE-001 | P1 | 3 |
| BE-018 | Email service (SendGrid) | BE-001 | P1 | 3 |
| BE-019 | generateLeaseDocument function | PAY-005 | P1 | 4 |
| BE-020 | Scheduled functions (expiry, cleanup) | BE-001 | P2 | 3 |

### 7.2.3 FRONTEND-TENANT Tasks

| Task ID | Task | Dependencies | Priority | Hours |
|---------|------|--------------|----------|-------|
| FT-001 | Expo Router navigation setup | ARCH-003 | P0 | 2 |
| FT-002 | Phone number input screen | FT-001 | P0 | 3 |
| FT-003 | OTP verification screen | FT-002 | P0 | 3 |
| FT-004 | Profile setup wizard | FT-003 | P0 | 4 |
| FT-005 | BVN/NIN verification screens | FT-004 | P0 | 4 |
| FT-006 | Home screen (quick filters) | FT-001 | P0 | 4 |
| FT-007 | Search screen with filters | FT-006 | P0 | 6 |
| FT-008 | Filter modal component | FT-007 | P0 | 4 |
| FT-009 | Property card component | ARCH-006 | P0 | 3 |
| FT-010 | Property details screen | FT-009 | P0 | 5 |
| FT-011 | Photo gallery component | FT-010 | P0 | 3 |
| FT-012 | Price breakdown component | FT-010 | P0 | 2 |
| FT-013 | Map view for search | FT-007 | P1 | 4 |
| FT-014 | Application form | FT-010 | P0 | 5 |
| FT-015 | My applications screen | FT-014 | P0 | 4 |
| FT-016 | Application status tracker | FT-015 | P0 | 3 |
| FT-017 | Conversations list screen | BE-014 | P0 | 4 |
| FT-018 | Chat screen | FT-017 | P0 | 6 |
| FT-019 | Message components (text, image, cards) | FT-018 | P0 | 4 |
| FT-020 | Profile screen | FT-004 | P1 | 3 |
| FT-021 | Settings screen | FT-020 | P2 | 2 |
| FT-022 | Saved properties screen | FT-009 | P2 | 3 |
| FT-023 | Payment screen | PAY-001 | P0 | 5 |
| FT-024 | Receipt screen | PAY-005 | P1 | 3 |
| FT-025 | Lease document viewer | BE-019 | P1 | 3 |
| FT-026 | Push notification handling | BE-016 | P0 | 3 |
| FT-027 | Offline support | FT-001 | P2 | 4 |

### 7.2.4 FRONTEND-LANDLORD Tasks

| Task ID | Task | Dependencies | Priority | Hours |
|---------|------|--------------|----------|-------|
| FL-001 | Expo Router navigation setup | ARCH-003 | P0 | 2 |
| FL-002 | Auth flow (shared with tenant) | FT-002, FT-003 | P0 | 1 |
| FL-003 | Landlord profile setup | FL-002 | P0 | 3 |
| FL-004 | Property ownership verification | FL-003 | P0 | 4 |
| FL-005 | Dashboard screen | FL-001 | P0 | 5 |
| FL-006 | Portfolio summary component | FL-005 | P0 | 3 |
| FL-007 | Recent inquiries component | FL-005 | P0 | 3 |
| FL-008 | My properties list screen | FL-005 | P0 | 4 |
| FL-009 | Property card (landlord variant) | FT-009 | P0 | 2 |
| FL-010 | Create listing wizard | BE-008 | P0 | 8 |
| FL-011 | Photo upload & reorder | FL-010 | P0 | 4 |
| FL-012 | Location picker with map | FL-010 | P0 | 4 |
| FL-013 | Price comparison display | BE-011 | P1 | 3 |
| FL-014 | Amenities selector | FL-010 | P0 | 2 |
| FL-015 | Listing preview screen | FL-010 | P0 | 3 |
| FL-016 | Applications inbox | BE-012 | P0 | 5 |
| FL-017 | Application detail screen | FL-016 | P0 | 4 |
| FL-018 | Tenant profile card | FL-017 | P0 | 3 |
| FL-019 | Accept/Reject flow | FL-017 | P0 | 3 |
| FL-020 | Conversations (shared with tenant) | FT-017, FT-018 | P0 | 1 |
| FL-021 | Property analytics screen | BE-010 | P1 | 5 |
| FL-022 | Analytics charts component | FL-021 | P1 | 4 |
| FL-023 | Bank account setup | VER-003 | P0 | 4 |
| FL-024 | Payments received screen | PAY-005 | P1 | 4 |
| FL-025 | Payout history | PAY-006 | P1 | 3 |
| FL-026 | Subscription management | BE-001 | P2 | 4 |
| FL-027 | Push notification handling | BE-016 | P0 | 3 |

### 7.2.5 PAYMENTS Tasks

| Task ID | Task | Dependencies | Priority | Hours |
|---------|------|--------------|----------|-------|
| PAY-001 | Paystack SDK integration | ARCH-004 | P0 | 3 |
| PAY-002 | initializePayment function | BE-012 | P0 | 4 |
| PAY-003 | paystackWebhook handler | PAY-002 | P0 | 5 |
| PAY-004 | handleChargeSuccess (lease creation) | PAY-003 | P0 | 5 |
| PAY-005 | Receipt generation | PAY-004 | P1 | 3 |
| PAY-006 | Escrow hold/release logic | PAY-004 | P0 | 4 |
| PAY-007 | processEscrowRelease scheduled function | PAY-006 | P0 | 3 |
| PAY-008 | initiateTransfer (payout to landlord) | PAY-007, VER-003 | P0 | 4 |
| PAY-009 | handleTransferSuccess/Failed | PAY-008 | P0 | 3 |
| PAY-010 | Dispute handling | PAY-006 | P1 | 4 |
| PAY-011 | Refund processing | PAY-010 | P1 | 3 |
| PAY-012 | Payment analytics | PAY-004 | P2 | 3 |

### 7.2.6 VERIFICATION Tasks

| Task ID | Task | Dependencies | Priority | Hours |
|---------|------|--------------|----------|-------|
| VER-001 | VerifyMe API client | ARCH-004 | P0 | 3 |
| VER-002 | BVN verification endpoint | VER-001 | P0 | 4 |
| VER-003 | Bank account verification (Paystack) | PAY-001 | P0 | 3 |
| VER-004 | NIN verification endpoint | VER-001 | P0 | 3 |
| VER-005 | Name matching algorithm | VER-002 | P0 | 2 |
| VER-006 | Duplicate BVN/NIN detection | VER-002 | P0 | 2 |
| VER-007 | Verification audit logging | VER-002 | P0 | 2 |
| VER-008 | Document upload & verification | BE-001 | P1 | 4 |
| VER-009 | Employment verification | VER-008 | P2 | 4 |

---

# 8. SPRINT PLANNING

## 8.1 Sprint Overview (14 Weeks)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DIRECTRENT SPRINT PLAN                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 1: MVP                                                                  │
│  ═══════════════════════════════════════════════════════════════              │
│  Sprint 1 (Week 1-2)  : Project Setup + Authentication                        │
│  Sprint 2 (Week 3-4)  : Verification + Profile                                │
│  Sprint 3 (Week 5-6)  : Property Listing + Search                             │
│                                                                                 │
│  PHASE 2: CORE                                                                 │
│  ═══════════════════════════════════════════════════════════════              │
│  Sprint 4 (Week 7-8)  : Applications + Messaging                              │
│  Sprint 5 (Week 9-10) : Payments + Escrow                                     │
│                                                                                 │
│  PHASE 3: POLISH                                                               │
│  ═══════════════════════════════════════════════════════════════              │
│  Sprint 6 (Week 11-12): Lease + Reviews + Analytics                           │
│  Sprint 7 (Week 13-14): Testing + Launch Prep                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Detailed Sprint Breakdown

### Sprint 1: Foundation (Week 1-2)

**Goal:** Project structure, authentication flow working end-to-end

| Day | ARCHITECT | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD |
|-----|-----------|---------|-----------------|-------------------|
| 1-2 | ARCH-001, ARCH-002 | - | - | - |
| 3-4 | ARCH-003, ARCH-004 | BE-001 | - | - |
| 5-6 | ARCH-005 | BE-002, BE-003 | FT-001 | FL-001 |
| 7-8 | ARCH-006 | BE-004, BE-005 | FT-002, FT-003 | FL-002 |
| 9-10 | Review | Testing | FT-004 | FL-003 |

**Sprint 1 Deliverables:**
- [x] Monorepo with Expo apps
- [x] Firebase project configured
- [x] Phone OTP authentication working
- [x] Basic profile creation
- [x] Design tokens defined

**Sprint 1 Demo:**
- User can enter phone number → receive OTP → verify → create profile → select tenant/landlord

---

### Sprint 2: Verification + Profile (Week 3-4)

**Goal:** BVN/NIN verification, complete profile flows

| Day | ARCHITECT | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD | VERIFICATION |
|-----|-----------|---------|-----------------|-------------------|--------------|
| 1-2 | ARCH-007 | - | FT-005 | FL-004 | VER-001 |
| 3-4 | - | BE-006 | FT-005 | FL-004 | VER-002, VER-005 |
| 5-6 | - | BE-007 | - | - | VER-004, VER-006 |
| 7-8 | ARCH-008 | BE-016 | FT-026 | FL-027 | VER-007 |
| 9-10 | Review | Testing | Testing | Testing | - |

**Sprint 2 Deliverables:**
- [x] BVN verification working
- [x] NIN verification working
- [x] Push notifications configured
- [x] CI/CD pipeline
- [x] Property ownership verification screen

---

### Sprint 3: Property Listing + Search (Week 5-6)

**Goal:** Landlords can list properties, tenants can search

| Day | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD | ARCHITECT |
|-----|---------|-----------------|-------------------|-----------|
| 1-2 | BE-008, BE-009 | FT-006 | FL-005, FL-006 | ARCH-009 |
| 3-4 | BE-010 | FT-007, FT-008 | FL-010, FL-011 | - |
| 5-6 | BE-011 | FT-009, FT-010 | FL-010, FL-012 | - |
| 7-8 | - | FT-011, FT-012 | FL-013, FL-014 | - |
| 9-10 | Testing | FT-013 | FL-015 | Review |

**Sprint 3 Deliverables:**
- [x] Multi-step listing creation wizard
- [x] Photo upload with ordering
- [x] Property search with filters
- [x] Map view for search results
- [x] Property details screen

---

### Sprint 4: Applications + Messaging (Week 7-8)

**Goal:** End-to-end application flow, real-time messaging

| Day | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD |
|-----|---------|-----------------|-------------------|
| 1-2 | BE-012 | FT-014 | FL-016 |
| 3-4 | BE-013 | FT-015, FT-016 | FL-017, FL-018 |
| 5-6 | BE-014, BE-015 | FT-017 | FL-019 |
| 7-8 | - | FT-018, FT-019 | FL-020 |
| 9-10 | Testing | Testing | Testing |

**Sprint 4 Deliverables:**
- [x] Rental application submission
- [x] Application review for landlords
- [x] Accept/reject flow
- [x] Real-time messaging
- [x] Message notifications

---

### Sprint 5: Payments + Escrow (Week 9-10)

**Goal:** Complete payment flow with escrow

| Day | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD | PAYMENTS | VERIFICATION |
|-----|---------|-----------------|-------------------|----------|--------------|
| 1-2 | - | FT-023 | FL-023 | PAY-001, PAY-002 | VER-003 |
| 3-4 | - | FT-023 | FL-023 | PAY-003, PAY-004 | - |
| 5-6 | BE-017, BE-018 | FT-24 | FL-024 | PAY-005, PAY-006 | - |
| 7-8 | - | - | FL-025 | PAY-007, PAY-008 | - |
| 9-10 | Testing | Testing | Testing | PAY-009 | Testing |

**Sprint 5 Deliverables:**
- [x] Paystack payment integration
- [x] Card, bank transfer, USSD support
- [x] Escrow for security deposits
- [x] Receipt generation
- [x] Bank account verification

---

### Sprint 6: Lease + Reviews + Analytics (Week 11-12)

**Goal:** Digital lease, ratings system, landlord analytics

| Day | BACKEND | FRONTEND-TENANT | FRONTEND-LANDLORD | PAYMENTS |
|-----|---------|-----------------|-------------------|----------|
| 1-2 | BE-019 | FT-25 | FL-021 | PAY-010 |
| 3-4 | Review system | Review system | FL-022 | PAY-011 |
| 5-6 | - | FT-20, FT-21 | FL-026 | - |
| 7-8 | BE-20 | FT-22 | - | PAY-012 |
| 9-10 | Testing | Testing | Testing | Testing |

**Sprint 6 Deliverables:**
- [x] Digital lease generation
- [x] Ratings and reviews
- [x] Property analytics dashboard
- [x] Profile and settings screens
- [x] Saved properties

---

### Sprint 7: Testing + Launch Prep (Week 13-14)

**Goal:** Bug fixes, performance optimization, app store submission

| Day | All Teams |
|-----|-----------|
| 1-2 | E2E testing, bug fixes |
| 3-4 | Performance optimization |
| 5-6 | Security audit |
| 7-8 | App store assets, descriptions |
| 9-10 | Final QA, submission |

**Sprint 7 Deliverables:**
- [x] All critical bugs fixed
- [x] Performance targets met
- [x] Security audit passed
- [x] App store submissions
- [x] Launch documentation

---

## 8.3 Definition of Done

A feature is considered **DONE** when:

- [ ] Code is written and follows style guide
- [ ] Unit tests pass (80% coverage)
- [ ] Integration tests pass (70% coverage)
- [ ] No TypeScript errors
- [ ] UI matches design specifications
- [ ] Works on iOS and Android
- [ ] Works offline where required
- [ ] Error handling is complete
- [ ] Loading states are implemented
- [ ] Accessibility requirements met
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No known critical bugs

---

# 9. APPENDICES

## Appendix A: Lagos Areas Reference

```typescript
export const LAGOS_AREAS = [
  // Priority 1 (Launch)
  { name: 'Yaba', lga: 'Yaba', priority: 1, coordinates: { lat: 6.5158, lng: 3.3747 }, rentRange: [300000, 1500000] },
  { name: 'Surulere', lga: 'Surulere', priority: 1, coordinates: { lat: 6.5010, lng: 3.3513 }, rentRange: [350000, 1800000] },
  
  // Priority 2 (Month 2)
  { name: 'Ikeja', lga: 'Ikeja', priority: 2, coordinates: { lat: 6.6018, lng: 3.3515 }, rentRange: [400000, 2500000] },
  { name: 'Lekki Phase 1', lga: 'Eti-Osa', priority: 2, coordinates: { lat: 6.4478, lng: 3.4723 }, rentRange: [800000, 5000000] },
  { name: 'Ajah', lga: 'Eti-Osa', priority: 2, coordinates: { lat: 6.4698, lng: 3.5852 }, rentRange: [400000, 2000000] },
  
  // Priority 3 (Month 3+)
  { name: 'Victoria Island', lga: 'Eti-Osa', priority: 3, coordinates: { lat: 6.4281, lng: 3.4219 }, rentRange: [1500000, 10000000] },
  { name: 'Ikoyi', lga: 'Eti-Osa', priority: 3, coordinates: { lat: 6.4520, lng: 3.4380 }, rentRange: [2000000, 15000000] },
  { name: 'Maryland', lga: 'Kosofe', priority: 3, coordinates: { lat: 6.5705, lng: 3.3619 }, rentRange: [350000, 1500000] },
  { name: 'Gbagada', lga: 'Kosofe', priority: 3, coordinates: { lat: 6.5533, lng: 3.3904 }, rentRange: [400000, 1800000] },
  { name: 'Magodo', lga: 'Kosofe', priority: 3, coordinates: { lat: 6.6225, lng: 3.3784 }, rentRange: [500000, 2500000] },
  // ... more areas
];
```

## Appendix B: Amenities Reference

```typescript
export const AMENITIES = {
  power: [
    { id: '24hr_electricity', label: '24hr Electricity', icon: '⚡' },
    { id: 'generator_backup', label: 'Generator Backup', icon: '🔌' },
    { id: 'solar_power', label: 'Solar Power', icon: '☀️' },
    { id: 'prepaid_meter', label: 'Prepaid Meter', icon: '📊' }
  ],
  water: [
    { id: 'water_supply', label: 'Running Water', icon: '💧' },
    { id: 'borehole', label: 'Borehole', icon: '🚰' },
    { id: 'water_heater', label: 'Water Heater', icon: '🔥' },
    { id: 'overhead_tank', label: 'Overhead Tank', icon: '🏗️' }
  ],
  security: [
    { id: 'security', label: '24hr Security', icon: '👮' },
    { id: 'cctv', label: 'CCTV', icon: '📹' },
    { id: 'gateman', label: 'Gateman', icon: '🚪' },
    { id: 'fence', label: 'Perimeter Fence', icon: '🧱' },
    { id: 'gated_estate', label: 'Gated Estate', icon: '🏘️' }
  ],
  comfort: [
    { id: 'air_conditioning', label: 'Air Conditioning', icon: '❄️' },
    { id: 'ceiling_fan', label: 'Ceiling Fans', icon: '🌀' },
    { id: 'fitted_kitchen', label: 'Fitted Kitchen', icon: '🍳' },
    { id: 'wardrobe', label: 'Built-in Wardrobe', icon: '🚪' },
    { id: 'pop_ceiling', label: 'POP Ceiling', icon: '✨' }
  ],
  facilities: [
    { id: 'parking', label: 'Parking Space', icon: '🚗' },
    { id: 'garage', label: 'Garage', icon: '🏠' },
    { id: 'gym', label: 'Gym', icon: '🏋️' },
    { id: 'swimming_pool', label: 'Swimming Pool', icon: '🏊' },
    { id: 'garden', label: 'Garden', icon: '🌳' },
    { id: 'balcony', label: 'Balcony', icon: '🌅' },
    { id: 'terrace', label: 'Terrace', icon: '🏡' }
  ],
  connectivity: [
    { id: 'internet_ready', label: 'Internet Ready', icon: '📶' },
    { id: 'cable_ready', label: 'Cable TV Ready', icon: '📺' }
  ]
};
```

---

*End of Master PRD*

**Document Maintained By:** Directrent.ng Development Team  
**Version:** 2.0.0  
**Last Updated:** March 2026
