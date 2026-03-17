# CLAUDE.md — Directrent.ng Mobile Application
## Master Project Configuration for Claude Code Agent Teams

---

## 🎯 Project Overview

**Project Name:** Directrent.ng Mobile Application  
**Domain:** www.directrent.ng  
**Project Type:** Two-Sided PropTech Marketplace (Tenant App + Landlord App)  
**Target Market:** Lagos, Nigeria (Hyperlocal Focus)  
**Business Model:** Disintermediation Platform — eliminating rental agents

### Mission Statement
Build a mobile platform that directly connects Lagos property owners with potential tenants, eliminating agent fees and reducing rental transaction costs by 70-85%.

### The Problem We Solve (Data-Validated)
The Lagos rental market suffers from the **"Agent Effect"** — a systemic market failure where:
- Tenants pay 15% of annual rent in agency + legal fees (₦75,000-₦100,000 on ₦500,000 rent)
- Financial Friction Index is **3.5x higher** with agents vs. direct transactions
- 28.5% of tenant relocation costs go to non-housing fees
- Psychological Stress Score: **7.40/10** (agent) vs. **2.44/10** (direct)
- 93.3% of landlords using agents experience delayed payments
- Agent-managed properties average **63.5 days vacancy** vs. **24.6 days** direct-managed

### The Solution
A verified, transparent, secure direct-link mobile platform that removes the unpredictable human intermediary while digitizing trust through:
- BVN/NIN identity verification
- Secure escrow for deposits
- Two-way rating systems
- Direct messaging (no agent middlemen)

---

## 🛠️ Technology Stack

### Frontend (Mobile Apps)
```
Framework:        React Native with Expo (SDK 52+)
Language:         TypeScript (strict mode)
State Management: Redux Toolkit + RTK Query
Navigation:       Expo Router (file-based routing)
UI Components:    React Native Paper + Custom Design System
Forms:            React Hook Form + Zod validation
Maps:             react-native-maps (Google Maps API)
```

### Backend Services (Firebase)
```
Authentication:   Firebase Auth (Phone + Email)
Database:         Cloud Firestore
Storage:          Firebase Storage (property images)
Functions:        Cloud Functions (Node.js 18)
Messaging:        Firebase Cloud Messaging (push notifications)
Analytics:        Firebase Analytics + Crashlytics
```

### Third-Party Integrations
```
Payments:         Paystack (Nigerian payment gateway)
Identity:         VerifyMe API (BVN/NIN verification)
SMS:              Termii (Nigerian SMS gateway)
Email:            SendGrid (transactional emails)
Maps:             Google Maps Platform (Places, Geocoding)
```

### Development Tools
```
Package Manager:  npm or yarn
Linting:          ESLint + Prettier
Testing:          Jest + React Native Testing Library
CI/CD:            EAS Build + EAS Submit
Versioning:       Git with Conventional Commits
```

---

## 📁 Project Structure

```
directrent/
├── CLAUDE.md                          # This file (root config)
├── package.json
├── app.json                           # Expo configuration
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── apps/
│   ├── tenant/                        # Tenant mobile app
│   │   ├── CLAUDE.md                  # Tenant-specific instructions
│   │   ├── app/                       # Expo Router pages
│   │   │   ├── (tabs)/                # Tab navigation
│   │   │   │   ├── index.tsx          # Home/Explore
│   │   │   │   ├── search.tsx         # Property Search
│   │   │   │   ├── saved.tsx          # Saved Properties
│   │   │   │   ├── messages.tsx       # Direct Messages
│   │   │   │   └── profile.tsx        # User Profile
│   │   │   ├── property/
│   │   │   │   └── [id].tsx           # Property Details
│   │   │   ├── landlord/
│   │   │   │   └── [id].tsx           # Landlord Profile
│   │   │   ├── application/
│   │   │   │   └── [id].tsx           # Rental Application
│   │   │   └── _layout.tsx            # Root layout
│   │   └── components/                # Tenant-specific components
│   │
│   └── landlord/                      # Landlord mobile app
│       ├── CLAUDE.md                  # Landlord-specific instructions
│       ├── app/                       # Expo Router pages
│       │   ├── (tabs)/
│       │   │   ├── index.tsx          # Dashboard
│       │   │   ├── properties.tsx     # My Properties
│       │   │   ├── inquiries.tsx      # Tenant Inquiries
│       │   │   ├── messages.tsx       # Direct Messages
│       │   │   └── profile.tsx        # Landlord Profile
│       │   ├── property/
│       │   │   ├── create.tsx         # Create Listing
│       │   │   ├── [id]/
│       │   │   │   ├── edit.tsx       # Edit Property
│       │   │   │   ├── analytics.tsx  # Property Analytics
│       │   │   │   └── applicants.tsx # View Applicants
│       │   └── _layout.tsx
│       └── components/
│
├── packages/
│   ├── shared/                        # Shared code
│   │   ├── CLAUDE.md                  # Shared module instructions
│   │   ├── components/                # Shared UI components
│   │   ├── hooks/                     # Custom hooks
│   │   ├── utils/                     # Utility functions
│   │   ├── types/                     # TypeScript types/interfaces
│   │   ├── constants/                 # App constants
│   │   └── services/                  # API services
│   │
│   └── design-system/                 # Design tokens & base components
│       ├── tokens/                    # Colors, typography, spacing
│       ├── components/                # Base UI components
│       └── icons/                     # Custom icons
│
├── firebase/
│   ├── CLAUDE.md                      # Firebase/backend instructions
│   ├── firestore.rules
│   ├── storage.rules
│   └── functions/
│       ├── src/
│       │   ├── auth/                  # Auth triggers
│       │   ├── properties/            # Property functions
│       │   ├── payments/              # Paystack integration
│       │   ├── verification/          # BVN/NIN verification
│       │   ├── notifications/         # Push notifications
│       │   └── analytics/             # Analytics functions
│       └── package.json
│
└── docs/
    ├── API.md                         # API documentation
    ├── DEPLOYMENT.md                  # Deployment guide
    └── TESTING.md                     # Testing guide
```

---

## 🇳🇬 Nigerian Context Requirements

### Currency & Formatting
```typescript
// CRITICAL: All monetary values in Nigerian Naira
const CURRENCY = {
  code: 'NGN',
  symbol: '₦',
  locale: 'en-NG',
  formatter: new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
};

// Example: ₦500,000 NOT N500,000 or 500000
formatCurrency(500000) // Returns "₦500,000"
```

### Phone Number Format
```typescript
// Nigerian phone numbers: +234 XXX XXX XXXX
const PHONE_REGEX = /^\+234[789][01]\d{8}$/;
const PHONE_DISPLAY = '+234 XXX XXX XXXX';

// Accept formats: 08012345678, +2348012345678, 2348012345678
// Always store as: +2348012345678
```

### Identity Verification (CRITICAL FOR TRUST)
```typescript
// Bank Verification Number (BVN) - 11 digits
const BVN_REGEX = /^\d{11}$/;

// National Identification Number (NIN) - 11 digits
const NIN_REGEX = /^\d{11}$/;

// Verification status enum
enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired'
}
```

### Lagos Locations (Hyperlocal Focus)
```typescript
// Primary target areas (Year 1 rollout)
const LAGOS_AREAS = {
  mainland: [
    { name: 'Yaba', lga: 'Yaba', priority: 1 },      // Tech-savvy, entry market
    { name: 'Surulere', lga: 'Surulere', priority: 1 },
    { name: 'Ikeja', lga: 'Ikeja', priority: 2 },
    { name: 'Ojodu', lga: 'Ojodu', priority: 2 },
    { name: 'Magodo', lga: 'Kosofe', priority: 3 },
    { name: 'Gbagada', lga: 'Kosofe', priority: 3 },
    { name: 'Maryland', lga: 'Kosofe', priority: 3 }
  ],
  island: [
    { name: 'Lekki', lga: 'Eti-Osa', priority: 2 },
    { name: 'Ajah', lga: 'Eti-Osa', priority: 2 },
    { name: 'Victoria Island', lga: 'Eti-Osa', priority: 3 },
    { name: 'Ikoyi', lga: 'Eti-Osa', priority: 3 }
  ]
};

// Rent ranges by area (Primary Research Data)
const RENT_RANGES = {
  mainland: { min: 300000, max: 2000000, typical: 700000 },  // Per annum
  island: { min: 900000, max: 4000000, typical: 2000000 }
};
```

### Property Types (Lagos Market)
```typescript
const PROPERTY_TYPES = [
  { id: 'self_contained', label: 'Self Contained', description: 'Single room with private bathroom' },
  { id: 'mini_flat', label: 'Mini Flat', description: '1 bedroom apartment' },
  { id: 'one_bedroom', label: '1 Bedroom Flat', description: 'Standard 1BR apartment' },
  { id: 'two_bedroom', label: '2 Bedroom Flat', description: 'Standard 2BR apartment' },
  { id: 'three_bedroom', label: '3 Bedroom Flat', description: 'Standard 3BR apartment' },
  { id: 'duplex', label: 'Duplex', description: 'Multi-level house' },
  { id: 'bungalow', label: 'Bungalow', description: 'Single-story house' },
  { id: 'boys_quarters', label: 'Boys Quarters (BQ)', description: 'Detached service apartment' }
];

// Lagos-specific amenities
const AMENITIES = [
  '24hr Electricity (Estate Power)',
  'Prepaid Meter',
  'Borehole Water',
  'Security (Gateman)',
  'CCTV',
  'Parking Space',
  'Boys Quarters',
  'Generator Backup',
  'Tarred Road Access',
  'Street Lights',
  'Waste Disposal',
  'Proximity to BRT'
];
```

---

## 💰 Revenue Model Implementation

### Fee Structure (Per Primary Research)
```typescript
const FEES = {
  // For Tenants (FREE to use, pay only on success)
  tenant: {
    platformFee: 0,                    // Free access
    successFee: { min: 0.02, max: 0.03 }, // 2-3% on successful rental
    verificationFee: { min: 2000, max: 5000 }, // Optional premium verification
    leaseAgreement: 3000               // Digital lease document
  },
  
  // For Landlords (Freemium model)
  landlord: {
    freeListings: 1,                   // 1 free listing
    subscriptionBasic: { annual: 20000, monthly: 2000 },
    subscriptionPremium: { annual: 50000, monthly: 5000 },
    featuredListing: 5000,             // Per listing, per month
    transactionFee: 0.01               // 1% payment processing
  },
  
  // Value Proposition (vs Traditional Agent)
  savings: {
    agentFee: 0.10,                    // Traditional: 10% of annual rent
    legalFee: 0.05,                    // Traditional: 5% of annual rent
    totalSaved: 0.15                   // Platform saves tenants 15%
  }
};
```

### Payment Integration (Paystack)
```typescript
// Paystack configuration for Nigerian payments
const PAYSTACK_CONFIG = {
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  channels: ['card', 'bank', 'ussd', 'bank_transfer'],
  currency: 'NGN',
  
  // Escrow flow for security deposits
  escrow: {
    holdPeriod: 7,                     // Days to hold before release
    releaseOnInspection: true,
    disputeWindow: 48                  // Hours to raise dispute
  }
};
```

---

## 👥 User Personas (From Primary Research)

### Tenant Segments
```typescript
const TENANT_SEGMENTS = {
  primary: {
    name: 'Young Professionals',
    ageRange: [25, 40],
    description: 'Tech-savvy workers seeking 1-2BR in Magodo, Ajah, Lekki',
    rentBudget: { min: 900000, max: 4000000 },
    painPoints: [
      'Unexpected fees (Mean: 4.18/5)',
      'Losing deposits unfairly (Mean: 4.14/5)',
      'Hidden property defects (Mean: 4.10/5)',
      'Fraud risk with fake agents (Mean: 3.86/5)'
    ],
    desiredFeatures: [
      'Secure escrow (Mean: 4.44/5)',
      'Tenant verification (Mean: 4.44/5)',
      'Landlord ratings (Mean: 4.40/5)',
      'Verified credentials (Mean: 4.38/5)'
    ],
    priceWillingness: { min: 1000, max: 5000 }
  },
  secondary: {
    name: 'Small Families',
    ageRange: [30, 45],
    description: 'Families in Yaba, Surulere, Ojodu, Ikeja',
    rentBudget: { min: 700000, max: 2000000 },
    priceWillingness: { min: 5000, max: 10000 }
  },
  tertiary: {
    name: 'Students & Relocators',
    description: 'Students near UNILAG/LASU, relocating workers',
    rentBudget: { min: 300000, max: 700000 },
    priceWillingness: { min: 1000, max: 2000 }
  }
};
```

### Landlord Segments
```typescript
const LANDLORD_SEGMENTS = {
  primary: {
    name: 'Individual Property Owners',
    propertyCount: [1, 3],
    painPoints: [
      'Agent misrepresentation (Cronbach α: .996)',
      'Delayed payments (93.3% experience this)',
      'Extended vacancy (39 extra days with agents)',
      'High tenant turnover (61% increase with agents)'
    ],
    desiredFeatures: [
      'Tenant verification tools',
      'Direct payment collection',
      'Property performance analytics',
      'Digital lease generation'
    ],
    satisfactionWithAgents: 3.07  // Out of 5 (LOW)
  },
  secondary: {
    name: 'Small Portfolio Landlords',
    propertyCount: [4, 10],
    description: 'Multiple properties across Lagos'
  }
};
```

---

## 🔐 Security & Compliance

### Data Protection (NDPR Compliance)
```typescript
// Nigeria Data Protection Regulation requirements
const NDPR_COMPLIANCE = {
  consentRequired: true,
  dataMinimization: true,
  purposeLimitation: true,
  storageLocation: 'Nigeria or approved jurisdictions',
  retentionPeriod: {
    activeUsers: 'indefinite',
    inactiveUsers: '2 years',
    transactions: '7 years',
    verificationData: '5 years'
  },
  userRights: [
    'Right to access',
    'Right to rectification',
    'Right to erasure',
    'Right to data portability'
  ]
};
```

### Authentication Security
```typescript
const AUTH_CONFIG = {
  phoneAuth: {
    required: true,
    otpLength: 6,
    otpExpiry: 300,              // 5 minutes
    maxAttempts: 5,
    cooldownPeriod: 3600         // 1 hour lockout
  },
  session: {
    accessTokenExpiry: 3600,     // 1 hour
    refreshTokenExpiry: 2592000, // 30 days
    maxConcurrentSessions: 3
  },
  sensitiveOperations: {
    requireReauth: ['payment', 'withdrawal', 'account_deletion'],
    reauthExpiry: 300            // 5 minutes
  }
};
```

---

## 📊 Analytics & Metrics

### Key Performance Indicators
```typescript
const KPIs = {
  acquisition: [
    'App downloads (PlayStore + AppStore)',
    'Registration completion rate',
    'Verification completion rate',
    'Time to first listing view'
  ],
  engagement: [
    'DAU/MAU ratio',
    'Listings viewed per session',
    'Messages sent per user',
    'Search-to-save ratio'
  ],
  conversion: [
    'Listing-to-inquiry rate',
    'Inquiry-to-application rate',
    'Application-to-rental rate',
    'Time to successful rental'
  ],
  retention: [
    'Day 1/7/30 retention',
    'Repeat rental rate',
    'Landlord listing renewal rate',
    'Net Promoter Score (NPS)'
  ],
  financial: [
    'Revenue per user',
    'Average transaction value',
    'Commission collected',
    'Paystack processing success rate'
  ]
};
```

---

## 🧪 Testing Requirements

### Test Coverage Targets
```typescript
const TESTING = {
  unit: {
    coverage: 80,
    critical: ['payments', 'verification', 'auth']
  },
  integration: {
    coverage: 70,
    critical: ['Paystack flow', 'Firebase sync', 'VerifyMe API']
  },
  e2e: {
    coverage: 50,
    critical: [
      'Tenant: Browse → Save → Apply → Pay',
      'Landlord: List → Receive Inquiry → Accept → Collect Payment'
    ]
  }
};
```

---

## 📜 Commands Reference

### Development
```bash
# Install dependencies
npm install

# Start Expo dev server (tenant app)
npm run start:tenant

# Start Expo dev server (landlord app)
npm run start:landlord

# Run on iOS simulator
npm run ios:tenant
npm run ios:landlord

# Run on Android emulator
npm run android:tenant
npm run android:landlord

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Firebase
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Emulator for local development
firebase emulators:start
```

### Build & Deploy
```bash
# Build for production (EAS)
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## ⚠️ Critical Rules for Claude Code

### DO
- Use TypeScript strict mode everywhere
- Format all currency with ₦ symbol (Naira)
- Store phone numbers in +234 format
- Implement BVN/NIN verification on all sensitive operations
- Use Firestore security rules for all database access
- Add loading states and error handling to all async operations
- Support offline mode for property browsing
- Log all financial transactions for auditing
- Use Expo's secure store for sensitive data

### DO NOT
- Never store raw BVN/NIN numbers (only verification status + partial)
- Never allow messaging before identity verification
- Never process payments outside Paystack escrow for deposits
- Never use `any` type in TypeScript
- Never hardcode API keys or secrets
- Never skip validation on user inputs
- Never allow property listing without landlord verification
- Never display full phone numbers to unverified users

### Commit Message Format
```
type(scope): description

# Types: feat, fix, docs, style, refactor, test, chore
# Scopes: tenant, landlord, shared, firebase, config

# Examples:
feat(tenant): add property search filters for Lagos areas
fix(landlord): resolve payment delay notification issue
docs(shared): update Nigerian phone number validation
```

---

## 🚀 Agent Team Structure

When using Claude Code Agent Teams for this project:

### Recommended Team Configuration
```
Team Lead: Project Architect
├── Teammate "frontend-tenant": Tenant app UI/UX implementation
├── Teammate "frontend-landlord": Landlord app UI/UX implementation
├── Teammate "backend": Firebase functions and database
├── Teammate "payments": Paystack integration and escrow
└── Teammate "verification": BVN/NIN identity verification
```

### Team Coordination Rules
1. All teammates must read this CLAUDE.md and their respective module CLAUDE.md
2. Shared code goes in `packages/shared/` — coordinate before changes
3. All API contracts must be agreed before implementation
4. Nigerian context rules apply to ALL code
5. Test coverage must meet targets before merge

---

*Last Updated: March 2026*
*Version: 1.0.0*
*Domain: www.directrent.ng*
