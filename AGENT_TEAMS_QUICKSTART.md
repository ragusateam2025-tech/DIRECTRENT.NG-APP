# Agent Teams Quick Start Guide
## Building Directrent.ng with Claude Code

---

## 📋 Pre-Build Checklist

Before starting development, ensure you have:

- [ ] Claude Pro or Claude Max subscription
- [ ] Claude Code installed (`claude --version`)
- [ ] Node.js v22 LTS installed
- [ ] Git configured
- [ ] Firebase project created (directrent-ng)
- [ ] Paystack account with API keys
- [ ] VerifyMe account with API keys
- [ ] Expo account created

---

## 🚀 Project Initialization

### Step 1: Create Project Directory

```bash
mkdir directrent && cd directrent
```

### Step 2: Copy CLAUDE.md Files

Copy all CLAUDE.md files to their respective locations:

```
directrent/
├── CLAUDE.md                    # Root configuration
├── FEATURE_SPEC.md              # Full feature specifications
├── FEATURE_SPEC_PART2.md
├── FEATURE_SPEC_PART3.md
├── apps/
│   ├── tenant/
│   │   └── CLAUDE.md            # Tenant app config
│   └── landlord/
│       └── CLAUDE.md            # Landlord app config
├── packages/
│   └── shared/
│       └── CLAUDE.md            # Shared modules config
└── firebase/
    └── CLAUDE.md                # Backend config
```

### Step 3: Initialize Claude Code

```bash
claude

# Claude Code will read CLAUDE.md and understand the project
```

---

## 🤖 Agent Teams Configuration

### Enabling Agent Teams

```bash
# Option 1: Environment variable
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
claude

# Option 2: Add to settings.json
# Location: ~/.config/claude-code/settings.json
{
  "experimental": {
    "agentTeams": true
  }
}
```

### Recommended Team Structure

When starting a complex task, create teammates:

```
/teammate create architect "You are the project architect. Read CLAUDE.md and FEATURE_SPEC.md. Design the overall app structure, folder organization, and navigation flow. Coordinate between frontend and backend teams."

/teammate create frontend-tenant "You build the Tenant mobile app. Read apps/tenant/CLAUDE.md. Implement screens: Home, Search, Property Details, Messages, Profile. Use React Native with Expo Router."

/teammate create frontend-landlord "You build the Landlord mobile app. Read apps/landlord/CLAUDE.md. Implement screens: Dashboard, Properties, Applications, Analytics, Messages."

/teammate create backend "You handle Firebase backend. Read firebase/CLAUDE.md. Implement Firestore schemas, security rules, and Cloud Functions for auth, verification, and notifications."

/teammate create payments "You integrate Paystack payments. Read FEATURE_SPEC_PART3.md Section 9. Implement payment initialization, webhooks, escrow, and transfers."

/teammate create verification "You handle identity verification. Read FEATURE_SPEC.md Section 4. Integrate VerifyMe API for BVN/NIN verification."
```

---

## 📅 Phased Development Plan

### Phase 1: Foundation (Week 1)

**Day 1-2: Project Setup**
```
Prompt to architect:
"Set up the monorepo structure with Expo workspaces. Create:
- apps/tenant (Expo app)
- apps/landlord (Expo app)  
- packages/shared (shared code)
- firebase (backend)

Install dependencies: expo, react-native, firebase, react-hook-form, zod, 
react-native-paper. Configure TypeScript strict mode."
```

**Day 3-4: Authentication**
```
Prompt to backend:
"Implement phone authentication following FEATURE_SPEC.md Section 3.1.
Create:
- Firebase Auth phone sign-in
- onUserCreate Cloud Function
- User document schema in Firestore
- Security rules for users collection"

Prompt to frontend-tenant:
"Build the authentication flow for tenant app:
- Phone number input screen (Nigerian format)
- OTP verification screen
- Profile setup screen
- Navigation flow with Expo Router"
```

**Day 5: Verification**
```
Prompt to verification:
"Implement BVN verification following FEATURE_SPEC.md Section 4.1.
Create:
- verifyBvn Cloud Function
- VerifyMe API integration
- Name matching logic
- Secure BVN hashing (never store raw)"

Prompt to frontend-tenant:
"Build BVN verification screen:
- 11-digit BVN input
- Loading state during verification
- Success/error handling
- Skip option with feature limitation warning"
```

### Phase 2: Core Features (Week 2-3)

**Property Listing (Landlord)**
```
Prompt to frontend-landlord:
"Build the property listing creation flow following FEATURE_SPEC_PART2.md Section 5.
Implement multi-step form:
1. Basic Info (type, bedrooms, bathrooms)
2. Location (address with Google Places autocomplete)
3. Photos (drag-to-reorder, min 5 photos)
4. Pricing (with market comparison)
5. Amenities & Rules
6. Preview & Publish

Use react-hook-form with zod validation."

Prompt to backend:
"Create property listing Cloud Functions:
- createListing (validated property creation)
- saveListingDraft (auto-save drafts)
- getMarketRate (price comparison data)

Implement Firestore indexes for search queries."
```

**Property Search (Tenant)**
```
Prompt to frontend-tenant:
"Build property search following FEATURE_SPEC_PART2.md Section 6.
Create:
- Search bar with area autocomplete
- Filter modal (price, bedrooms, amenities)
- Results list with PropertyCard component
- Map view with property pins
- Infinite scroll pagination

Use react-query for data fetching."

Prompt to backend:
"Implement search query optimization:
- Geohash-based location queries
- Composite indexes for filters
- Pagination with cursors"
```

### Phase 3: Transactions (Week 4-5)

**Applications**
```
Prompt to frontend-tenant:
"Build rental application flow following FEATURE_SPEC_PART2.md Section 7.
Create:
- Application form (move-in date, occupants, message)
- Pre-filled verification status
- Cost breakdown display
- Submission confirmation"

Prompt to frontend-landlord:
"Build application review screens:
- Applications list with status filters
- Detailed application view
- Tenant verification badges
- Accept/Decline actions
- Message tenant option"
```

**Payments**
```
Prompt to payments:
"Implement Paystack integration following FEATURE_SPEC_PART3.md Section 9.
Create:
- initializePayment Cloud Function
- paystackWebhook handler
- Escrow hold/release logic
- Transfer to landlord function

Handle all payment channels: card, bank transfer, USSD."

Prompt to frontend-tenant:
"Build payment screen:
- Cost breakdown card
- Payment method selection
- Paystack WebView integration
- Success/failure handling
- Receipt view"
```

### Phase 4: Communication (Week 6)

**Messaging**
```
Prompt to backend:
"Implement real-time messaging following FEATURE_SPEC_PART3.md Section 8.
Create:
- Conversation document schema
- Messages subcollection
- sendMessage Cloud Function
- Real-time Firestore listeners
- Push notification on new message"

Prompt to frontend-tenant AND frontend-landlord:
"Build chat interface:
- Conversations list
- Real-time chat screen
- Message types (text, image, property card)
- Read receipts
- Quick actions (schedule viewing)"
```

---

## 💬 Effective Prompts for Each Agent

### Architecture Prompts
```
"Review the CLAUDE.md and propose folder structure for [feature]"
"Design the data flow between tenant app and Firebase for [process]"
"What's the best approach to share [code/types] between apps?"
```

### Frontend Prompts
```
"Build [ScreenName] screen following the wireframe in CLAUDE.md"
"Create [ComponentName] component with these props: [list]"
"Implement form validation using zod for [form fields]"
"Add error handling and loading states to [feature]"
```

### Backend Prompts
```
"Create Firestore schema for [collection] with security rules"
"Implement [FunctionName] Cloud Function with input validation"
"Add composite index for query: [describe query]"
"Create webhook handler for [service] events"
```

### Payment Prompts
```
"Initialize Paystack transaction with escrow for deposits"
"Handle charge.success webhook and create lease"
"Implement automatic escrow release after 7 days"
"Create transfer to landlord with error handling"
```

---

## 🔍 Quality Checkpoints

After each phase, verify:

### Code Quality
```bash
# Run linting
npm run lint

# Type checking
npm run typecheck

# Run tests
npm test
```

### Nigerian Context
- [ ] All prices display with ₦ symbol
- [ ] Phone numbers accept Nigerian format (0801...)
- [ ] Lagos areas correctly listed
- [ ] BVN/NIN validation (11 digits)

### Security
- [ ] No raw BVN/NIN stored
- [ ] Firestore rules protect sensitive data
- [ ] API keys in environment variables
- [ ] Phone numbers masked for unverified users

### User Experience
- [ ] Loading states on all async operations
- [ ] Error messages are user-friendly
- [ ] Offline indicators where needed
- [ ] Push notifications working

---

## 🐛 Common Issues & Solutions

### Issue: Expo build fails
```bash
# Clear cache and rebuild
npx expo start --clear
```

### Issue: Firebase connection errors
```bash
# Check Firebase config
cat firebase.json
# Verify environment variables
echo $FIREBASE_PROJECT_ID
```

### Issue: Paystack webhook not receiving
```bash
# Test with ngrok for local development
ngrok http 5001
# Update webhook URL in Paystack dashboard
```

### Issue: TypeScript errors in shared package
```bash
# Rebuild shared package
cd packages/shared && npm run build
# Restart Metro bundler
npx expo start --clear
```

---

## 📊 Progress Tracking

Use this checklist to track development:

### MVP Features
- [ ] Phone authentication
- [ ] Profile creation
- [ ] BVN/NIN verification
- [ ] Property listing (landlord)
- [ ] Property search (tenant)
- [ ] Property details view
- [ ] Rental applications
- [ ] Direct messaging
- [ ] Push notifications

### Core Features
- [ ] Paystack payments
- [ ] Security deposit escrow
- [ ] Digital lease generation
- [ ] Bank account verification
- [ ] Property analytics
- [ ] Ratings & reviews

### Enhancement Features
- [ ] Saved properties & alerts
- [ ] Offline mode
- [ ] Landlord subscriptions
- [ ] Featured listings
- [ ] Virtual tours

---

## 🚢 Deployment

### Build for Testing
```bash
# Development build
eas build --profile development --platform all
```

### Build for Production
```bash
# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Firebase Deployment
```bash
# Deploy all Firebase services
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## 📞 Support

If you encounter issues:

1. Check CLAUDE.md files for context
2. Review FEATURE_SPEC.md for requirements
3. Verify Nigerian context rules are followed
4. Ensure security rules are properly configured

---

*Happy Building! 🏗️*  
*Directrent.ng - Eliminating the Mandatory Middleman*
