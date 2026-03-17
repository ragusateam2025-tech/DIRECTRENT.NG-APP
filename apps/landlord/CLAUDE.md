# CLAUDE.md — Directrent.ng Landlord App
## Landlord Mobile Application Configuration

---

## 📱 App Overview

**App Name:** Directrent for Landlords  
**Bundle ID:** ng.directrent.landlord  
**Target Users:** Property owners in Lagos, Nigeria  
**Core Value:** List and manage properties directly with tenants — no agents, no delays

### Landlord Problem Statement (From Primary Research, N=20)
Lagos landlords suffer from agent-caused friction:
- **Payment delays:** 93.3% of landlords using agents experience this
- **Extended vacancy:** 39 extra days on average with agents
- **Tenant turnover:** 61% higher with agent-managed properties
- **Agent satisfaction:** Only 3.07/5 (LOW)
- **Misrepresentation:** Cronbach's Alpha .996 confirms unified construct of dissatisfaction

### What Landlords Want Most
1. **Tenant verification tools** — Screen applicants with BVN/NIN
2. **Direct payment collection** — No agent holding funds
3. **Property performance analytics** — Track views, inquiries, conversions
4. **Digital lease generation** — Automated, legally compliant agreements
5. **Reduced vacancy** — Platform targets 24.6 days vs. 63.5 with agents

### Financial Incentive
- **Projected savings:** ₦123,150/year per property
- **Zero commission:** No 10% agent cut on rent collection
- **Faster occupancy:** 39 fewer vacancy days = recovered rent

---

## 🎨 App Screens & User Flows

### 1. Onboarding Flow
```
┌─────────────────────────────────────────────────────────────┐
│                   LANDLORD ONBOARDING                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Splash → Welcome Slides → Phone Entry → OTP Verify →      │
│  Profile Setup → Property Ownership Verify → Dashboard      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Screen: Welcome Slides (3 screens)
```typescript
const LANDLORD_WELCOME_SLIDES = [
  {
    id: 1,
    title: 'List Your Properties Free',
    subtitle: 'Reach thousands of verified tenants in Lagos',
    image: 'landlord_onboarding_list',
    backgroundColor: '#0066CC'
  },
  {
    id: 2,
    title: 'No More Agent Delays',
    subtitle: 'Collect rent directly — no commissions, no middlemen',
    image: 'landlord_onboarding_payments',
    backgroundColor: '#00994D',
    stat: '93.3% of landlords report agent-caused payment delays'
  },
  {
    id: 3,
    title: 'Verified Tenants Only',
    subtitle: 'Screen applicants with BVN/NIN verification',
    image: 'landlord_onboarding_verified',
    backgroundColor: '#663399'
  }
];
```

#### Screen: Landlord Verification
```typescript
interface LandlordVerificationScreen {
  steps: [
    {
      step: 1,
      title: 'Identity Verification',
      description: 'Verify your identity with BVN or NIN',
      required: true,
      fields: {
        bvn: { type: 'input', length: 11, pattern: /^\d{11}$/ },
        nin: { type: 'input', length: 11, pattern: /^\d{11}$/ }
      }
    },
    {
      step: 2,
      title: 'Property Ownership',
      description: 'Upload proof of property ownership',
      required: true,
      documents: [
        { type: 'deed_of_assignment', label: 'Deed of Assignment', required: true },
        { type: 'c_of_o', label: 'Certificate of Occupancy', required: false },
        { type: 'governors_consent', label: "Governor's Consent", required: false },
        { type: 'survey_plan', label: 'Survey Plan', required: false },
        { type: 'utility_bill', label: 'Utility Bill (Property Address)', required: true }
      ]
    },
    {
      step: 3,
      title: 'Bank Account',
      description: 'Add your bank account for rent payments',
      required: true,
      fields: {
        bankName: { type: 'select', options: 'nigerian_banks' },
        accountNumber: { type: 'input', length: 10, pattern: /^\d{10}$/ },
        accountName: { type: 'display', source: 'bank_verification' }
      }
    }
  ];
  
  verificationLevels: {
    basic: {
      requirements: ['phone', 'email', 'bvn_or_nin'],
      features: ['list_1_property', 'basic_messaging']
    },
    verified: {
      requirements: ['basic', 'property_documents', 'bank_account'],
      features: ['unlimited_listings', 'featured_badge', 'payment_collection', 'analytics']
    },
    premium: {
      requirements: ['verified', 'subscription'],
      features: ['priority_support', 'featured_listings', 'advanced_analytics']
    }
  };
}
```

---

### 2. Dashboard Screen (Main Tab)
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Directrent for Landlords                    🔔 [●]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Good morning, Adeola! 👋                                   │
│                                                             │
│  ── Portfolio Summary ──────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ₦4,250,000         3/5         12                 │   │
│  │  Expected Annual    Occupied     Active            │   │
│  │  Revenue            Properties   Inquiries         │   │
│  │                                                     │   │
│  │  📈 +15% vs last month                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Pending Actions ────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [!] 3 new tenant applications                       │   │
│  │ [!] 2 unread messages                               │   │
│  │ [!] 1 payment pending confirmation                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Recent Inquiries ───────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Photo] Chidi Okonkwo            2h ago            │   │
│  │         Interested in: 2BR Yaba                     │   │
│  │         ✓ Verified  ⭐ 4.8 rating                  │   │
│  │         [View Application] [Message]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Property Performance ───────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Chart: Views & Inquiries - Last 30 Days]         │   │
│  │                                                     │   │
│  │      📊 Views: 847  |  💬 Inquiries: 23  |  ✓ 3   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Quick Actions ──────────────────────────────────────    │
│  [➕ Add Property]  [📋 View Applications]  [💰 Payments]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│  [🏠 Dashboard]  [🏘️ Properties]  [📋 Inquiries]  [💬]  [👤] │
└─────────────────────────────────────────────────────────────┘
```

#### Dashboard Data Model
```typescript
interface DashboardData {
  summary: {
    totalProperties: number;
    occupiedProperties: number;
    vacantProperties: number;
    expectedRevenue: number;
    revenueChange: number;        // % vs last month
    activeInquiries: number;
    pendingApplications: number;
  };
  
  pendingActions: Array<{
    type: 'application' | 'message' | 'payment' | 'review';
    count: number;
    priority: 'high' | 'medium' | 'low';
    action: string;
  }>;
  
  recentInquiries: Array<{
    tenantId: string;
    tenantName: string;
    tenantPhoto: string;
    tenantVerified: boolean;
    tenantRating: number;
    propertyId: string;
    propertyTitle: string;
    receivedAt: Date;
    status: 'new' | 'viewed' | 'responded';
  }>;
  
  performance: {
    period: '7d' | '30d' | '90d';
    views: number;
    inquiries: number;
    applications: number;
    conversions: number;
    chart: Array<{ date: string; views: number; inquiries: number }>;
  };
}
```

---

### 3. My Properties Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back              My Properties           [➕ Add New]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [All (5)] [Occupied (3)] [Vacant (2)]                     │
│                                                             │
│  ── Vacant Properties ──────────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Photo]                                             │   │
│  │                                                     │   │
│  │  2 Bedroom Flat, Yaba              🟢 Active       │   │
│  │  ₦650,000/year                                      │   │
│  │                                                     │   │
│  │  👁️ 234 views  |  💬 8 inquiries  |  📝 3 apps     │   │
│  │  Listed 12 days ago                                 │   │
│  │                                                     │   │
│  │  [Edit] [Boost 🚀] [Pause] [Analytics]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Photo]                                             │   │
│  │                                                     │   │
│  │  3 Bedroom Duplex, Lekki           🟡 Few Views    │   │
│  │  ₦2,500,000/year                                    │   │
│  │                                                     │   │
│  │  👁️ 45 views   |  💬 2 inquiries  |  📝 0 apps     │   │
│  │  Listed 28 days ago                                 │   │
│  │                                                     │   │
│  │  ⚠️ Low engagement. Consider reducing price or     │   │
│  │     adding more photos.                             │   │
│  │                                                     │   │
│  │  [Edit] [Boost 🚀] [Pause] [Analytics]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Occupied Properties ────────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Photo]                                             │   │
│  │                                                     │   │
│  │  1 Bedroom Flat, Surulere          🔵 Occupied     │   │
│  │  ₦450,000/year                                      │   │
│  │                                                     │   │
│  │  👤 Tenant: Emeka Nwankwo                          │   │
│  │  📅 Lease ends: Dec 2026                            │   │
│  │  💰 Next payment: ₦112,500 due Apr 15              │   │
│  │                                                     │   │
│  │  [View Tenant] [Payment History] [Renew Lease]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Create Property Listing Flow
```
┌─────────────────────────────────────────────────────────────┐
│                  CREATE LISTING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Basic Information                                  │
│  ├── Property type (Self Contained, Mini Flat, etc.)       │
│  ├── Number of bedrooms                                     │
│  ├── Number of bathrooms                                    │
│  ├── Property size (sqm)                                    │
│  ├── Year built                                             │
│  └── Furnishing status                                      │
│                                                             │
│  Step 2: Location                                           │
│  ├── Address (autocomplete)                                 │
│  ├── Area (Yaba, Lekki, etc.)                              │
│  ├── Map pin confirmation                                   │
│  └── Nearby landmarks                                       │
│                                                             │
│  Step 3: Photos & Media                                     │
│  ├── Property photos (min 5, max 20)                       │
│  ├── Photo tips for better engagement                       │
│  ├── Virtual tour link (optional)                          │
│  └── Video walkthrough (optional)                          │
│                                                             │
│  Step 4: Pricing                                            │
│  ├── Annual rent                                            │
│  ├── Caution deposit (years)                               │
│  ├── Service charge                                         │
│  ├── Agreement fee                                          │
│  ├── Market comparison (AI suggestion)                     │
│  └── Total tenant cost preview                             │
│                                                             │
│  Step 5: Amenities & Rules                                  │
│  ├── Available amenities checklist                         │
│  ├── Pets policy                                            │
│  ├── Maximum occupants                                      │
│  └── Special requirements                                   │
│                                                             │
│  Step 6: Review & Publish                                   │
│  ├── Full preview                                           │
│  ├── Terms acceptance                                       │
│  └── Publish / Save as Draft                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Create Listing Form
```typescript
interface CreateListingForm {
  // Step 1: Basic Info
  basicInfo: {
    title: {
      type: 'input',
      maxLength: 100,
      placeholder: 'e.g., Spacious 2 Bedroom Flat in Yaba',
      aiSuggest: true
    };
    propertyType: {
      type: 'select',
      options: PROPERTY_TYPES,
      required: true
    };
    bedrooms: {
      type: 'stepper',
      min: 0,
      max: 10,
      required: true
    };
    bathrooms: {
      type: 'stepper',
      min: 1,
      max: 10,
      required: true
    };
    sizeSqm: {
      type: 'number',
      min: 10,
      max: 1000,
      unit: 'sqm',
      required: false
    };
    yearBuilt: {
      type: 'year_picker',
      min: 1960,
      max: 2026
    };
    furnishing: {
      type: 'select',
      options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
      required: true
    };
  };
  
  // Step 2: Location
  location: {
    address: {
      type: 'autocomplete',
      source: 'google_places',
      restricted: 'Lagos, Nigeria',
      required: true
    };
    area: {
      type: 'select',
      options: LAGOS_AREAS,
      required: true
    };
    coordinates: {
      type: 'map_picker',
      defaultZoom: 15,
      confirmRequired: true
    };
    nearbyLandmarks: {
      type: 'tags',
      maxItems: 5,
      suggestions: ['BRT Stop', 'Market', 'School', 'Hospital', 'Mall']
    };
  };
  
  // Step 3: Photos
  media: {
    photos: {
      type: 'image_upload',
      min: 5,
      max: 20,
      maxSizeMB: 10,
      formats: ['jpg', 'jpeg', 'png'],
      tips: [
        'Include all rooms',
        'Show natural lighting',
        'Capture exterior and compound',
        'Clean and declutter before shooting'
      ],
      required: true
    };
    virtualTour: {
      type: 'url',
      pattern: /^https:\/\/(www\.)?(youtube|vimeo|matterport)/,
      required: false
    };
    video: {
      type: 'video_upload',
      maxDuration: 120,
      maxSizeMB: 100,
      required: false
    };
  };
  
  // Step 4: Pricing
  pricing: {
    annualRent: {
      type: 'currency',
      currency: 'NGN',
      min: 100000,
      max: 50000000,
      required: true,
      marketComparison: {
        show: true,
        source: 'similar_listings'
      }
    };
    cautionDeposit: {
      type: 'select',
      options: [
        { label: '6 months', value: 0.5 },
        { label: '1 year', value: 1 },
        { label: '2 years', value: 2 }
      ],
      default: 1,
      description: 'Multiplier of annual rent'
    };
    serviceCharge: {
      type: 'currency',
      currency: 'NGN',
      required: false,
      hint: 'Annual service charge for estate maintenance'
    };
    agreementFee: {
      type: 'currency',
      currency: 'NGN',
      required: false,
      hint: 'One-time legal/agreement fee'
    };
  };
  
  // Step 5: Amenities & Rules
  details: {
    amenities: {
      type: 'checkbox_grid',
      options: AMENITIES,
      columns: 2
    };
    petPolicy: {
      type: 'select',
      options: ['No pets', 'Small pets allowed', 'All pets allowed']
    };
    maxOccupants: {
      type: 'stepper',
      min: 1,
      max: 10
    };
    description: {
      type: 'textarea',
      maxLength: 2000,
      placeholder: 'Describe your property...',
      aiEnhance: true
    };
    rules: {
      type: 'tags',
      suggestions: ['No smoking', 'No loud music after 10pm', 'Visitors log required']
    };
  };
}
```

---

### 5. Tenant Applications Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back            Tenant Applications                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [All (12)] [Pending (5)] [Accepted (4)] [Rejected (3)]    │
│                                                             │
│  ── Pending Applications ───────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Photo] Chidi Okonkwo                 Applied 2h  │   │
│  │          ✓ Verified (BVN + NIN)                    │   │
│  │          ⭐ 4.8 Tenant Rating (6 reviews)          │   │
│  │                                                     │   │
│  │  For: 2 Bedroom Flat, Yaba                         │   │
│  │  Move-in: April 1, 2026                            │   │
│  │  Occupants: 2 adults                               │   │
│  │                                                     │   │
│  │  ── Verification Status ────────────────────────   │   │
│  │  ✓ Identity: BVN verified                          │   │
│  │  ✓ Employment: Software Engineer at Paystack      │   │
│  │  ✓ Income: ₦800K - ₦1M monthly                    │   │
│  │  ✓ Previous Landlord: 4.9★ reference              │   │
│  │                                                     │   │
│  │  "I'm a young professional looking for a quiet..." │   │
│  │  [Read Full Application]                            │   │
│  │                                                     │   │
│  │  ┌───────────────┬───────────────┬─────────────┐   │   │
│  │  │ ✓ Accept      │ ✕ Decline     │ 💬 Message  │   │   │
│  │  └───────────────┴───────────────┴─────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Photo] Amina Bello                   Applied 1d  │   │
│  │          ✓ Verified (NIN only)                     │   │
│  │          ⭐ New Tenant (No reviews)                │   │
│  │          ⚠️ Income verification pending            │   │
│  │  ...                                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tenant Application Details
```typescript
interface TenantApplication {
  id: string;
  propertyId: string;
  tenantId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  appliedAt: Date;
  
  // Tenant Information
  tenant: {
    name: string;
    photoUrl: string;
    phone: string;           // Visible only after acceptance
    email: string;           // Visible only after acceptance
    
    // Verification
    verification: {
      bvn: { status: VerificationStatus; verifiedAt?: Date };
      nin: { status: VerificationStatus; verifiedAt?: Date };
      employment: { status: VerificationStatus; employer?: string; role?: string };
      income: { status: VerificationStatus; range?: string };
    };
    
    // Rental History
    history: {
      rating: number;
      reviewCount: number;
      previousRentals: number;
      references: Array<{
        landlordName: string;
        rating: number;
        comment: string;
      }>;
    };
  };
  
  // Application Details
  details: {
    preferredMoveIn: Date;
    leaseDuration: '1_year' | '2_years' | '3_years';
    occupants: {
      adults: number;
      children: number;
      pets: { hasPets: boolean; petType?: string };
    };
    employmentDetails: {
      status: 'employed' | 'self_employed' | 'student' | 'other';
      employer?: string;
      role?: string;
      monthlyIncome?: string;
    };
    message: string;
  };
  
  // Documents
  documents: {
    governmentId: { type: string; url: string; verified: boolean };
    employmentLetter?: { url: string; verified: boolean };
    bankStatement?: { url: string; months: number };
    previousLease?: { url: string };
  };
}
```

---

### 6. Property Analytics Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back         Property Analytics                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  2 Bedroom Flat, Yaba                                       │
│  ₦650,000/year                                              │
│                                                             │
│  [7 Days ▾]  [30 Days]  [90 Days]  [All Time]              │
│                                                             │
│  ── Performance Summary ────────────────────────────────    │
│  ┌─────────┬─────────┬─────────┬─────────┐                 │
│  │  👁️     │  💬     │  📝     │  ⏱️     │                 │
│  │  847    │  23     │  8      │  12d    │                 │
│  │  Views  │ Inquiry │  Apps   │  Avg    │                 │
│  │  +15%   │  +8%    │  +20%   │ Response│                 │
│  └─────────┴─────────┴─────────┴─────────┘                 │
│                                                             │
│  ── Views Over Time ────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         📈 Line Chart                               │   │
│  │    Views, Inquiries, Applications                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Visitor Demographics ───────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Age Groups:                                        │   │
│  │  25-30: ████████████ 45%                           │   │
│  │  31-35: ████████ 30%                               │   │
│  │  36-40: █████ 18%                                  │   │
│  │  40+:   ██ 7%                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Conversion Funnel ──────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Views:        847 ─────────────────────────────    │   │
│  │  Saved:        156 ───────────── 18.4%              │   │
│  │  Inquiries:     23 ──── 2.7%                        │   │
│  │  Applications:   8 ── 0.9%                          │   │
│  │  Accepted:       2 ─ 0.2%                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Market Comparison ──────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Your property vs. similar in Yaba:                 │   │
│  │                                                     │   │
│  │  Your Price: ₦650,000    Market Avg: ₦680,000      │   │
│  │  Your Views: 847         Area Avg: 620              │   │
│  │  Your Apps:  8           Area Avg: 5                │   │
│  │                                                     │   │
│  │  💡 Your property is performing 37% above average  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Recommendations ────────────────────────────────────    │
│  • Add 2 more photos to increase engagement by ~20%        │
│  • Respond to inquiries faster (current avg: 12h)          │
│  • Consider adding "24hr Electricity" to amenities         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Payment Management Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back              Payments                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── This Month ─────────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ₦1,212,500                  ₦450,000              │   │
│  │  Total Received              Pending                │   │
│  │                                                     │   │
│  │  [Withdraw to Bank]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Upcoming Payments ──────────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Apr 15  │  ₦112,500  │  Emeka N.  │  1BR Surulere │   │
│  │  Apr 20  │  ₦162,500  │  Chidi O.  │  2BR Yaba    │   │
│  │  May 1   │  ₦625,000  │  Amina B.  │  3BR Lekki   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Payment History ────────────────────────────────────    │
│                                                             │
│  [Filter: All Properties ▾]  [Date: This Year ▾]           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Mar 15  │  ₦112,500  │  Emeka N.  │ ✓ Received   │   │
│  │  Mar 10  │  ₦650,000  │  Chidi O.  │ ✓ Received   │   │
│  │  Feb 15  │  ₦112,500  │  Emeka N.  │ ✓ Received   │   │
│  │  Feb 1   │  ₦450,000  │  Funke A.  │ ✓ Received   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Bank Accounts ──────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ● GTBank  ****4521  Adeola Johnson  [Primary]     │   │
│  │  ○ Access  ****8734  Adeola Johnson                │   │
│  │                                                     │   │
│  │  [+ Add Bank Account]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 8. Digital Lease Agreement
```typescript
interface LeaseAgreement {
  template: {
    sections: [
      {
        title: 'Parties',
        fields: ['landlord_name', 'landlord_address', 'tenant_name', 'tenant_address']
      },
      {
        title: 'Property Details',
        fields: ['property_address', 'property_type', 'property_size']
      },
      {
        title: 'Tenancy Terms',
        fields: ['start_date', 'end_date', 'rent_amount', 'payment_frequency']
      },
      {
        title: 'Deposits & Fees',
        fields: ['caution_deposit', 'service_charge', 'agreement_fee']
      },
      {
        title: 'House Rules',
        fields: ['pets', 'visitors', 'subletting', 'modifications']
      },
      {
        title: 'Termination',
        fields: ['notice_period', 'early_termination', 'renewal_terms']
      }
    ]
  };
  
  generation: {
    format: 'PDF',
    signatures: {
      landlord: { type: 'digital', verifiedBy: 'BVN' },
      tenant: { type: 'digital', verifiedBy: 'BVN' },
      witness: { type: 'optional' }
    },
    watermark: 'DIRECTRENT.NG - VERIFIED AGREEMENT',
    qrCode: true  // Links to verification page
  };
  
  compliance: {
    lagosState: true,
    lasreraReference: true,
    stampDuty: 'calculated'
  };
}
```

---

## 🔔 Landlord Push Notifications

```typescript
const LANDLORD_NOTIFICATIONS = {
  // New activity
  NEW_APPLICATION: {
    title: 'New Application! 📝',
    body: '{tenant_name} applied for {property_title}',
    action: 'view_application',
    priority: 'high'
  },
  NEW_INQUIRY: {
    title: 'New Inquiry 💬',
    body: '{tenant_name} is interested in {property_title}',
    action: 'view_inquiry'
  },
  NEW_MESSAGE: {
    title: 'New message from {tenant_name}',
    body: '{message_preview}',
    action: 'open_chat'
  },
  
  // Payments
  PAYMENT_RECEIVED: {
    title: 'Payment Received! 💰',
    body: '₦{amount} from {tenant_name} for {property_title}',
    action: 'view_payment',
    priority: 'high'
  },
  PAYMENT_DUE: {
    title: 'Payment Due Soon',
    body: '₦{amount} from {tenant_name} due in {days} days',
    action: 'view_payment'
  },
  PAYMENT_OVERDUE: {
    title: 'Payment Overdue ⚠️',
    body: '₦{amount} from {tenant_name} is {days} days overdue',
    action: 'view_payment',
    priority: 'high'
  },
  
  // Property performance
  LOW_ENGAGEMENT: {
    title: 'Low Property Views',
    body: '{property_title} has few views. Consider updating photos.',
    action: 'view_analytics'
  },
  LISTING_EXPIRING: {
    title: 'Listing Expiring Soon',
    body: '{property_title} listing expires in {days} days',
    action: 'renew_listing'
  },
  
  // Lease management
  LEASE_EXPIRING: {
    title: 'Lease Ending Soon',
    body: 'Lease for {property_title} ends in {days} days',
    action: 'view_lease'
  },
  TENANT_REVIEW: {
    title: 'New Review',
    body: '{tenant_name} left a {rating}★ review',
    action: 'view_review'
  }
};
```

---

## 📊 Landlord Analytics Data

```typescript
interface LandlordAnalytics {
  portfolio: {
    totalProperties: number;
    totalValue: number;           // Sum of annual rents
    occupancyRate: number;        // % occupied
    averageVacancyDays: number;
    totalTenants: number;
  };
  
  performance: {
    period: 'week' | 'month' | 'quarter' | 'year';
    views: { total: number; change: number };
    inquiries: { total: number; change: number };
    applications: { total: number; change: number };
    conversions: { total: number; rate: number };
    responseTime: { average: string; benchmark: string };
  };
  
  financial: {
    totalRevenue: number;
    pendingPayments: number;
    overduePayments: number;
    platformFees: number;
    netIncome: number;
    collectionRate: number;       // % paid on time
    projectedAnnual: number;
  };
  
  tenantQuality: {
    averageRating: number;
    verifiedTenants: number;
    paymentHistory: {
      onTime: number;
      late: number;
      missed: number;
    };
  };
  
  marketInsights: {
    areaAverageRent: number;
    pricePosition: 'below' | 'at' | 'above';
    demandTrend: 'increasing' | 'stable' | 'decreasing';
    competitorCount: number;
    recommendedPrice: number;
  };
}
```

---

## ⚠️ Landlord App Specific Rules

### DO
- Prominently display tenant verification status
- Show payment history and reliability scores
- Provide market-rate comparisons for pricing
- Generate legally compliant lease agreements
- Track and display property performance metrics
- Send payment reminders automatically
- Allow bulk property management
- Enable quick response templates

### DO NOT
- Never share tenant contact before payment confirmation
- Never release escrow without landlord approval
- Never auto-accept applications
- Never display unverified tenant information as verified
- Never skip property ownership verification
- Never allow listing without at least 5 photos
- Never process withdrawals to unverified bank accounts

---

*Module: Landlord App*
*Parent: CLAUDE.md (root)*
*Version: 1.0.0*
