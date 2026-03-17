# CLAUDE.md — Directrent.ng Tenant App
## Tenant Mobile Application Configuration

---

## 📱 App Overview

**App Name:** Directrent - Find Apartments  
**Bundle ID:** ng.directrent.tenant  
**Target Users:** Apartment seekers in Lagos, Nigeria  
**Core Value:** Find and rent apartments directly from landlords with zero agent fees

### User Problem Statement (From Primary Research, N=50)
Lagos tenants suffer from the "Agent Effect":
- **Unexpected fees:** Mean concern score 4.18/5 (HIGHEST)
- **Losing deposits unfairly:** Mean concern score 4.14/5
- **Hidden property defects:** Mean concern score 4.10/5
- **Legal ownership uncertainty:** Mean concern score 4.04/5
- **Fake agents/fraud risk:** Mean concern score 3.86-4.04/5
- **Unclear agreements:** Mean concern score 3.88/5

### What Tenants Want Most (Feature Priorities)
1. **Secure escrow services:** Mean importance 4.44/5 (HIGHEST)
2. **Background verification of tenants:** Mean importance 4.44/5
3. **Ratings and reviews of landlords:** Mean importance 4.40/5
4. **Verified credentials:** Mean importance 4.38/5
5. **Live chat support:** Mean importance 4.12/5

---

## 🎨 App Screens & User Flows

### 1. Onboarding Flow
```
┌─────────────────────────────────────────────────────────────┐
│                      ONBOARDING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Splash → Welcome Slides → Phone Entry → OTP Verify →      │
│  Profile Setup → BVN/NIN Verify (Optional) → Home          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Screen: Welcome Slides (3 screens)
```typescript
const WELCOME_SLIDES = [
  {
    id: 1,
    title: 'Find Your Perfect Home',
    subtitle: 'Browse verified apartments directly from landlords',
    image: 'onboarding_search',
    backgroundColor: '#0066CC'
  },
  {
    id: 2,
    title: 'No Agent Fees',
    subtitle: 'Save up to ₦100,000 on every rental — no middlemen',
    image: 'onboarding_savings',
    backgroundColor: '#00994D'
  },
  {
    id: 3,
    title: 'Safe & Secure',
    subtitle: 'Verified landlords, secure escrow, protected deposits',
    image: 'onboarding_security',
    backgroundColor: '#663399'
  }
];
```

#### Screen: Phone Authentication
```typescript
interface PhoneAuthScreen {
  // Input
  phoneNumber: string;           // Nigerian format
  
  // Validation
  validation: {
    format: /^0[789][01]\d{8}$/,  // Accepts 08012345678
    transform: (phone) => `+234${phone.slice(1)}`,  // Store as +234...
    errorMessages: {
      invalid: 'Please enter a valid Nigerian phone number',
      notNigerian: 'Only Nigerian phone numbers (+234) are supported'
    }
  };
  
  // UI Elements
  elements: {
    countryCode: '+234',          // Fixed, not changeable
    placeholder: '0801 234 5678',
    keyboardType: 'phone-pad',
    autoFocus: true
  };
}
```

#### Screen: Profile Setup
```typescript
interface ProfileSetupScreen {
  required: {
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto: string;          // Selfie required
  };
  
  optional: {
    employmentStatus: 'employed' | 'self_employed' | 'student' | 'other';
    employer: string;
    monthlyIncome: 'below_200k' | '200k_500k' | '500k_1m' | 'above_1m';
  };
  
  verification: {
    bvn: string;                   // 11 digits
    nin: string;                   // 11 digits
    skipAllowed: true;             // Can skip, but limited features
    skipMessage: 'Verify later to unlock messaging and applications'
  };
}
```

---

### 2. Home Screen (Main Tab)
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Directrent                          🔔 Notifications    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Welcome back, [Name]! 👋                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Search for apartments in Lagos...               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Quick Filters ──────────────────────────────────────    │
│  [Yaba] [Ikeja] [Lekki] [Surulere] [Ajah] [More ▾]         │
│                                                             │
│  ── Featured Properties ────────────────────────────────    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │ [Photo] │ │ [Photo] │ │ [Photo] │                       │
│  │ ₦500K   │ │ ₦800K   │ │ ₦1.2M   │                       │
│  │ 2BR     │ │ 3BR     │ │ 2BR     │                       │
│  │ Yaba    │ │ Ikeja   │ │ Lekki   │                       │
│  │ ⭐ 4.8  │ │ ⭐ 4.5  │ │ ⭐ 4.9  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│  ── Recently Added ─────────────────────────────────────    │
│  [Property Card List...]                                    │
│                                                             │
│  ── Near You ───────────────────────────────────────────    │
│  [Map View with pins]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│  [🏠 Home]  [🔍 Search]  [❤️ Saved]  [💬 Messages]  [👤 Me] │
└─────────────────────────────────────────────────────────────┘
```

#### Home Screen Components
```typescript
interface HomeScreen {
  sections: [
    {
      type: 'greeting',
      data: { userName: string, timeOfDay: 'morning' | 'afternoon' | 'evening' }
    },
    {
      type: 'searchBar',
      placeholder: 'Search for apartments in Lagos...',
      onPress: () => navigateToSearch()
    },
    {
      type: 'quickFilters',
      items: ['Yaba', 'Ikeja', 'Lekki', 'Surulere', 'Ajah'],
      scrollable: true
    },
    {
      type: 'featuredCarousel',
      title: 'Featured Properties',
      query: { featured: true, limit: 10 }
    },
    {
      type: 'recentList',
      title: 'Recently Added',
      query: { orderBy: 'createdAt', limit: 5 }
    },
    {
      type: 'nearbyMap',
      title: 'Near You',
      requiresLocation: true,
      radiusKm: 5
    }
  ];
}
```

---

### 3. Search & Filter Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                Search                    🗺️ Map     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Yaba                                      ✕      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [🏷️ Price ▾] [🛏️ Beds ▾] [🏠 Type ▾] [⚡ Amenities ▾]    │
│                                                             │
│  ── 48 apartments found ────────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [    Photo Gallery    ] [❤️]                        │   │
│  │                                                     │   │
│  │  2 Bedroom Flat in Yaba                  ✓ Verified │   │
│  │  ₦650,000/year                                      │   │
│  │  📍 Herbert Macaulay Way, Yaba                      │   │
│  │                                                     │   │
│  │  🛏️ 2 Beds  🚿 2 Baths  📐 85 sqm                  │   │
│  │                                                     │
│  │  ⚡ 24hr Power  💧 Borehole  🔒 Security            │   │
│  │                                                     │   │
│  │  ⭐ 4.8 (12 reviews)         Listed 3 days ago     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [More results...]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Search Filters Configuration
```typescript
interface SearchFilters {
  location: {
    type: 'autocomplete',
    source: 'lagos_areas',
    multiple: true,
    suggestions: ['Yaba', 'Ikeja', 'Lekki', 'Surulere', 'Ajah', 'Magodo', 'Gbagada']
  };
  
  priceRange: {
    type: 'range_slider',
    min: 100000,
    max: 10000000,
    step: 50000,
    unit: 'per year',
    currency: '₦',
    presets: [
      { label: 'Under ₦500K', range: [0, 500000] },
      { label: '₦500K - ₦1M', range: [500000, 1000000] },
      { label: '₦1M - ₦2M', range: [1000000, 2000000] },
      { label: 'Above ₦2M', range: [2000000, 10000000] }
    ]
  };
  
  bedrooms: {
    type: 'chip_select',
    options: [
      { label: 'Self Contained', value: 0 },
      { label: '1 Bedroom', value: 1 },
      { label: '2 Bedrooms', value: 2 },
      { label: '3 Bedrooms', value: 3 },
      { label: '4+ Bedrooms', value: 4 }
    ],
    multiple: true
  };
  
  propertyType: {
    type: 'chip_select',
    options: [
      'Self Contained',
      'Mini Flat',
      '1 Bedroom Flat',
      '2 Bedroom Flat',
      '3 Bedroom Flat',
      'Duplex',
      'Bungalow',
      'Boys Quarters'
    ],
    multiple: true
  };
  
  amenities: {
    type: 'checkbox_list',
    options: [
      { id: 'power_24hr', label: '24hr Electricity', icon: '⚡' },
      { id: 'prepaid_meter', label: 'Prepaid Meter', icon: '📊' },
      { id: 'borehole', label: 'Borehole Water', icon: '💧' },
      { id: 'security', label: 'Security (Gateman)', icon: '🔒' },
      { id: 'parking', label: 'Parking Space', icon: '🚗' },
      { id: 'generator', label: 'Generator Backup', icon: '🔋' },
      { id: 'cctv', label: 'CCTV', icon: '📹' },
      { id: 'bq', label: 'Boys Quarters', icon: '🏠' }
    ],
    multiple: true
  };
  
  verification: {
    type: 'toggle',
    label: 'Verified Landlords Only',
    default: true,
    description: 'Show only properties from verified landlords'
  };
  
  sortBy: {
    type: 'dropdown',
    options: [
      { label: 'Newest First', value: 'createdAt_desc' },
      { label: 'Price: Low to High', value: 'price_asc' },
      { label: 'Price: High to Low', value: 'price_desc' },
      { label: 'Rating', value: 'rating_desc' },
      { label: 'Distance', value: 'distance_asc', requiresLocation: true }
    ],
    default: 'createdAt_desc'
  };
}
```

---

### 4. Property Details Screen
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                    [❤️] [📤 Share]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [ Photo Gallery Carousel ]             │   │
│  │              1/8  ● ○ ○ ○ ○ ○ ○ ○                  │   │
│  │                                                     │   │
│  │  [🎬 Virtual Tour]                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ₦650,000/year                             ✓ Verified      │
│  2 Bedroom Flat                                             │
│  📍 Herbert Macaulay Way, Yaba, Lagos                      │
│                                                             │
│  ┌─────────┬─────────┬─────────┬─────────┐                 │
│  │ 🛏️ 2   │ 🚿 2    │ 📐 85   │ 🏗️ New │                 │
│  │ Beds   │ Baths   │ sqm     │ Build   │                 │
│  └─────────┴─────────┴─────────┴─────────┘                 │
│                                                             │
│  ── Description ────────────────────────────────────────    │
│  Spacious 2 bedroom flat in a serene environment...        │
│  [Read More]                                                │
│                                                             │
│  ── Amenities ──────────────────────────────────────────    │
│  ⚡ 24hr Power    💧 Borehole    🔒 Security               │
│  🚗 Parking       📊 Prepaid     🔋 Generator              │
│                                                             │
│  ── Costs Breakdown ────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Annual Rent               ₦650,000                  │   │
│  │ Caution Deposit (1 yr)    ₦650,000                  │   │
│  │ Service Charge            ₦50,000                   │   │
│  │ Platform Fee (2%)         ₦13,000                   │   │
│  │ ─────────────────────────────────────               │   │
│  │ TOTAL                     ₦1,363,000                │   │
│  │                                                     │   │
│  │ 💰 You save ₦65,000 vs. using an agent!            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Location ───────────────────────────────────────────    │
│  [Google Map with pin]                                      │
│  Nearby: UNILAG (1.2km), Yaba Market (0.5km)               │
│                                                             │
│  ── Landlord ───────────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Photo] Adeola Johnson          ✓ Verified          │   │
│  │         ⭐ 4.8 (24 reviews)     5 properties        │   │
│  │         Member since 2024       Response: 2 hrs    │   │
│  │                                 [View Profile →]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Reviews ────────────────────────────────────────────    │
│  ⭐ 4.8 average from 12 reviews                            │
│  [Review cards...]                                          │
│                                                             │
│  ── Similar Properties ─────────────────────────────────    │
│  [Horizontal scroll of similar listings]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [💬 Message Landlord]      [📝 Apply Now]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Property Details Data Model
```typescript
interface PropertyDetails {
  id: string;
  title: string;
  description: string;
  
  // Pricing
  pricing: {
    annualRent: number;          // In Naira
    cautionDeposit: number;      // Usually 1-2 years rent
    serviceCharge: number;       // Annual
    agreementFee: number;        // One-time
    platformFee: number;         // 2-3% calculated
    totalUpfront: number;        // Sum of all
    agentSavings: number;        // What they'd pay with agent
  };
  
  // Property details
  details: {
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
    sizeSqm: number;
    yearBuilt: number;
    furnishing: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
  };
  
  // Location
  location: {
    address: string;
    area: string;
    lga: string;
    coordinates: { lat: number; lng: number };
    nearbyPlaces: Array<{ name: string; distance: string }>;
  };
  
  // Media
  media: {
    photos: Array<{ url: string; caption?: string }>;
    virtualTourUrl?: string;
    videoUrl?: string;
  };
  
  // Amenities
  amenities: string[];
  
  // Landlord
  landlord: {
    id: string;
    name: string;
    photoUrl: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    propertyCount: number;
    memberSince: Date;
    responseTime: string;
  };
  
  // Reviews
  reviews: {
    average: number;
    count: number;
    items: Array<Review>;
  };
  
  // Status
  status: {
    isAvailable: boolean;
    listedAt: Date;
    viewCount: number;
    savedCount: number;
    inquiryCount: number;
  };
}
```

---

### 5. Rental Application Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Verification Check                                 │
│  ├── If NOT verified → Prompt BVN/NIN verification         │
│  └── If verified → Continue                                 │
│                                                             │
│  Step 2: Application Form                                   │
│  ├── Move-in date                                          │
│  ├── Lease duration preference                             │
│  ├── Number of occupants                                   │
│  ├── Employment details                                    │
│  ├── Previous landlord reference (optional)                │
│  └── Message to landlord                                   │
│                                                             │
│  Step 3: Document Upload                                    │
│  ├── Government ID (already from verification)             │
│  ├── Employment letter / Business registration             │
│  ├── Bank statement (last 3 months)                        │
│  └── Previous tenancy reference (optional)                 │
│                                                             │
│  Step 4: Payment Intent                                     │
│  ├── Show cost breakdown                                   │
│  ├── Escrow explanation                                    │
│  └── Pre-authorize payment (no charge yet)                 │
│                                                             │
│  Step 5: Submission                                         │
│  └── Application sent to landlord                          │
│                                                             │
│  Step 6: Awaiting Response                                  │
│  ├── Push notification when landlord responds              │
│  └── In-app status tracking                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Messages Screen
```
┌─────────────────────────────────────────────────────────────┐
│                      Messages                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 Search conversations...                                 │
│                                                             │
│  ── Active Applications ────────────────────────────────    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Landlord Photo]                                    │   │
│  │ Adeola Johnson                          2h ago     │   │
│  │ Re: 2BR Flat, Yaba                                  │   │
│  │ "Yes, the property is still available..."  [●]     │   │
│  │ 📋 Application: Pending                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Landlord Photo]                                    │   │
│  │ Chukwuemeka Obi                         Yesterday  │   │
│  │ Re: 3BR Duplex, Lekki                              │   │
│  │ "Thank you for your interest..."                    │   │
│  │ 📋 Application: Accepted ✓                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── All Messages ───────────────────────────────────────    │
│  [More conversation threads...]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Chat Screen (Individual Conversation)
```typescript
interface ChatScreen {
  header: {
    landlordName: string;
    landlordPhoto: string;
    propertyTitle: string;
    propertyPhoto: string;
    applicationStatus: 'none' | 'pending' | 'accepted' | 'rejected';
  };
  
  messageTypes: [
    'text',              // Plain text message
    'image',             // Photo attachment
    'property_card',     // Embedded property link
    'application_update', // Status change notification
    'schedule_viewing',  // Inspection scheduling
    'payment_request',   // Payment link
    'document',          // PDF attachment
    'location'           // Map location
  ];
  
  quickActions: [
    { label: 'Schedule Viewing', action: 'schedule_viewing' },
    { label: 'Ask About', action: 'property_question' },
    { label: 'Send Application', action: 'apply' }
  ];
  
  restrictions: {
    requiresVerification: true,
    maxMessageLength: 2000,
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024 // 5MB
  };
}
```

---

### 7. Profile & Settings Screen
```
┌─────────────────────────────────────────────────────────────┐
│                        Profile                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [Profile Photo]                                │
│              Oluwaseun Adeyemi                             │
│              ✓ Verified Tenant                              │
│              ⭐ 4.9 Tenant Rating                           │
│                                                             │
│  ── Verification Status ────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Phone Verified                                    │   │
│  │ ✓ Email Verified                                    │   │
│  │ ✓ BVN Verified                                      │   │
│  │ ✓ NIN Verified                                      │   │
│  │ ✓ Employment Verified                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Rental History ─────────────────────────────────────    │
│  [List of past rentals with reviews given/received]        │
│                                                             │
│  ── My Documents ───────────────────────────────────────    │
│  [Uploaded documents for reuse in applications]            │
│                                                             │
│  ── Settings ───────────────────────────────────────────    │
│  > Edit Profile                                             │
│  > Notification Preferences                                 │
│  > Payment Methods                                          │
│  > Privacy Settings                                         │
│  > Help & Support                                           │
│  > Terms & Conditions                                       │
│  > Privacy Policy                                           │
│  > Log Out                                                  │
│                                                             │
│  ── Rent Payment History ───────────────────────────────    │
│  💳 Your payment history builds your rental credit score   │
│  [Payment history list]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔔 Push Notifications

### Notification Types
```typescript
const NOTIFICATION_TYPES = {
  // Property alerts
  NEW_LISTING: {
    title: 'New Property in {area}',
    body: 'A {bedrooms}BR {type} just listed for ₦{price}/year',
    action: 'view_property'
  },
  PRICE_DROP: {
    title: 'Price Drop Alert! 📉',
    body: '{property_title} reduced to ₦{new_price}',
    action: 'view_property'
  },
  
  // Application updates
  APPLICATION_VIEWED: {
    title: 'Application Viewed 👀',
    body: '{landlord_name} viewed your application',
    action: 'view_application'
  },
  APPLICATION_ACCEPTED: {
    title: 'Congratulations! 🎉',
    body: 'Your application for {property_title} was accepted',
    action: 'view_application'
  },
  APPLICATION_REJECTED: {
    title: 'Application Update',
    body: 'Your application for {property_title} was not successful',
    action: 'view_application'
  },
  
  // Messages
  NEW_MESSAGE: {
    title: 'New message from {landlord_name}',
    body: '{message_preview}',
    action: 'open_chat'
  },
  
  // Payments
  PAYMENT_REMINDER: {
    title: 'Payment Reminder 💰',
    body: 'Complete your payment for {property_title}',
    action: 'view_payment'
  },
  PAYMENT_SUCCESSFUL: {
    title: 'Payment Confirmed ✓',
    body: '₦{amount} paid successfully for {property_title}',
    action: 'view_receipt'
  },
  
  // System
  VERIFICATION_COMPLETE: {
    title: 'Verification Complete ✓',
    body: 'Your {type} verification is successful',
    action: 'view_profile'
  }
};
```

---

## 📱 Offline Support

### Offline Capabilities
```typescript
const OFFLINE_CONFIG = {
  cachedData: [
    'saved_properties',           // Favorited listings
    'recent_searches',            // Search history
    'viewed_properties',          // Last 50 viewed
    'draft_applications',         // Unsent applications
    'user_profile',               // User data
    'chat_messages'               // Last 100 messages per chat
  ],
  
  offlineActions: [
    'browse_saved',               // View saved properties
    'browse_cached',              // View cached listings
    'read_messages',              // Read cached messages
    'edit_profile',               // Update profile (sync later)
    'save_property',              // Save to favorites (sync later)
    'draft_application'           // Draft application (submit when online)
  ],
  
  requiresOnline: [
    'search_properties',          // Real-time search
    'send_message',               // Send chat messages
    'submit_application',         // Submit rental application
    'make_payment',               // Financial transactions
    'verify_identity'             // BVN/NIN verification
  ],
  
  syncStrategy: {
    onReconnect: true,
    backgroundSync: true,
    syncInterval: 300000          // 5 minutes when online
  }
};
```

---

## 🎨 Design Tokens

### Colors
```typescript
const COLORS = {
  primary: {
    main: '#0066CC',              // Directrent Blue
    light: '#4D94FF',
    dark: '#004C99',
    contrast: '#FFFFFF'
  },
  secondary: {
    main: '#00994D',              // Success Green
    light: '#33B374',
    dark: '#006633'
  },
  accent: {
    main: '#FF6B00',              // Action Orange
    light: '#FF8533',
    dark: '#CC5500'
  },
  neutral: {
    white: '#FFFFFF',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#E0E4E8',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    disabled: '#9CA3AF'
  },
  semantic: {
    success: '#00994D',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#0066CC'
  },
  verified: {
    badge: '#00994D',
    background: '#E6F7EE'
  }
};
```

### Typography
```typescript
const TYPOGRAPHY = {
  fontFamily: {
    primary: 'Inter',
    secondary: 'Inter'
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
};
```

---

## 🧩 Component Library

### Property Card
```typescript
interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    photos: string[];
    price: number;
    area: string;
    bedrooms: number;
    bathrooms: number;
    size: number;
    amenities: string[];
    verified: boolean;
    rating: number;
    reviewCount: number;
    listedAt: Date;
  };
  variant: 'compact' | 'full' | 'horizontal';
  onPress: () => void;
  onSave: () => void;
  isSaved: boolean;
}
```

### Price Display
```typescript
// ALWAYS use this component for prices
interface PriceDisplayProps {
  amount: number;
  period?: 'year' | 'month';
  showSavings?: boolean;
  savingsAmount?: number;
  size?: 'sm' | 'md' | 'lg';
}

// Usage:
// <PriceDisplay amount={650000} period="year" showSavings savingsAmount={65000} />
// Renders: ₦650,000/year  💰 Save ₦65,000
```

### Verification Badge
```typescript
interface VerificationBadgeProps {
  verified: boolean;
  type: 'landlord' | 'property' | 'tenant';
  size?: 'sm' | 'md' | 'lg';
}

// Usage:
// <VerificationBadge verified={true} type="landlord" />
// Renders: ✓ Verified Landlord
```

---

## ⚠️ Tenant App Specific Rules

### DO
- Always show the savings compared to using an agent
- Display verification status prominently
- Show landlord ratings and reviews
- Include all fees in the cost breakdown
- Enable property comparison
- Support search with Nigerian keyboard
- Cache properties for offline viewing
- Track search history for personalization

### DO NOT
- Never show landlord phone before verification
- Never allow payment outside the app
- Never skip escrow for security deposits
- Never hide any fees in the breakdown
- Never show unverified properties by default
- Never store search queries with personal info

---

*Module: Tenant App*
*Parent: CLAUDE.md (root)*
*Version: 1.0.0*
