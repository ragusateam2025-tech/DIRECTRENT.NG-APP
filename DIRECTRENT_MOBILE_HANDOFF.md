# DIRECTRENT_MOBILE_HANDOFF.md
# Directrent.ng — Brand, Technical & Business Handoff for Mobile App Development

> **PURPOSE:** This document is the single source of truth for building the Directrent.ng mobile apps (Tenant app + Landlord app). It captures every brand, design, technical, and business decision made during website development. Upload this file to the Claude Project building the mobile apps so that colors, copy, validation logic, API contracts, and terminology are 100% consistent with the live website at www.directrent.ng.

---

## 1. BRAND IDENTITY

### 1.1 Company Details

| Field | Value |
|-------|-------|
| **Brand name** | Directrent.ng |
| **Legal entity** | Directrent.ng |
| **Tagline** | "Rent Direct. Save More." |
| **Description** | Connect directly with landlords and tenants in Lagos. No middlemen, no stress. |
| **Website** | https://directrent.ng |
| **Email** | hello@directrent.ng |
| **Phone** | +234 800 DIRECT |
| **Location** | Lagos, Nigeria |
| **Social — X (Twitter)** | https://x.com/directrentng |
| **Social — Instagram** | https://instagram.com/directrentng |
| **Social — LinkedIn** | https://linkedin.com/company/directrentng |
| **Social — Facebook** | https://facebook.com/directrentng |

### 1.2 Brand Voice & Tone

- **Confident, not arrogant.** We state facts backed by research, not hype.
- **Direct, not cold.** We use plain language, short sentences, and speak to the user like a knowledgeable friend.
- **Empathetic to Lagos renters.** We understand the frustration of paying 32% in agent fees. We've lived it.
- **Company-first presentation.** Directrent.ng presents as a company, NEVER as a school project, academic exercise, or MBA capstone. All public-facing content references "research" or "primary research" — never "MBA", "capstone", or "Rome Business School."
- **Naira symbol:** Always use the literal `₦` character. Never use `\u20A6`, `&#x20A6;`, or any escape sequence.

---

## 2. COLOR SYSTEM

### 2.1 Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-dark` | `#1A0A0A` | Main backgrounds, app chrome |
| `primary-medium` | `#2D1515` | Cards, elevated surfaces, input backgrounds |
| `primary-light` | `#4A2020` | Hover states on dark surfaces |

### 2.2 Accent Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-gold` | `#D4A853` | Highlights, data values, badges, secondary emphasis |
| `accent-gold-light` | `#E5C47A` | Hover on gold elements |
| `accent-gold-dark` | `#B8923F` | Pressed state |
| `accent-coral` | `#E85A4F` | Primary CTAs, buttons, active states, links |
| `accent-coral-light` | `#F07D74` | Hover on coral elements |
| `accent-coral-dark` | `#D14338` | Pressed state |
| `accent-orange` | `#F5A623` | Secondary CTAs, warnings |

### 2.3 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#10B981` | Success states, positive indicators, "direct" data |
| `success-light` | `#34D399` | Light variant |
| `success-dark` | `#059669` | Dark variant |
| `warning` | `#F59E0B` | Warning states |
| `error` | `#EF4444` | Error states, "traditional agent" data |
| `error-light` | `#F87171` | Light variant |
| `error-dark` | `#DC2626` | Dark variant |
| `info` | `#3B82F6` | Informational, links |

### 2.4 Text Colors (on dark backgrounds)

| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | `#FFFFFF` | Headings, primary body text |
| `text-secondary` | `rgba(255,255,255,0.7)` | Descriptions, secondary content |
| `text-muted` | `rgba(255,255,255,0.5)` | Hints, captions, disabled text |
| `text-disabled` | `rgba(255,255,255,0.3)` | Disabled elements |

### 2.5 Surface & Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#1A0A0A` | App background |
| `background-paper` | `#2D1515` | Cards, sheets, modals |
| `background-elevated` | `#3D2020` | Elevated cards on hover |
| `border` | `rgba(255,255,255,0.1)` | Default borders |
| `border-light` | `rgba(255,255,255,0.2)` | Emphasized borders |
| `border-gold` | `#D4A853` | Active/selected borders |

### 2.6 Gradient Definitions

```
Gold text gradient: linear-gradient(135deg, #D4A853, #F5A623)
Dark background: linear-gradient(180deg, #1A0A0A 0%, #2D1515 100%)
Card surface: linear-gradient(145deg, #2D1515 0%, #3D2020 100%)
```

---

## 3. TYPOGRAPHY

### 3.1 Font Families

| Role | Font | Fallback |
|------|------|----------|
| **Display / Headings** | Outfit | Inter, system-ui, sans-serif |
| **Body / UI** | Inter | system-ui, -apple-system, sans-serif |

Both fonts are on Google Fonts. For React Native, use `@expo-google-fonts/outfit` and `@expo-google-fonts/inter`.

### 3.2 Type Scale

| Size Token | Value | Usage |
|------------|-------|-------|
| xs | 12px | Badges, captions |
| sm | 14px | Helper text, labels |
| base | 16px | Body text (minimum for mobile inputs) |
| lg | 18px | Emphasized body |
| xl | 20px | Subheadings |
| 2xl | 24px | Section headings |
| 3xl | 30px | Page titles (mobile) |
| 4xl | 36px | Page titles (tablet) |
| 5xl | 48px | Hero headings |

### 3.3 Font Weights

- `normal` (400) — body text
- `medium` (500) — labels, nav items
- `semibold` (600) — subheadings, card titles, buttons
- `bold` (700) — headings, data values

---

## 4. LOGO & ICON

### 4.1 Logo SVG (Logo Mark + Wordmark)

The website uses an inline SVG logo component. The logo mark is a minimalist house/door icon:

```svg
<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Rounded square background -->
  <rect width="40" height="40" rx="10" fill="#1A0A0A"/>
  <rect x="1" y="1" width="38" height="38" rx="9" stroke="#D4A853" stroke-width="1.5" stroke-opacity="0.3"/>
  <!-- Door/entrance shape -->
  <path d="M14 32V16.5L20 12l6 4.5V32" stroke="#D4A853" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Door opening -->
  <rect x="17.5" y="22" width="5" height="10" rx="1" fill="#E85A4F" fill-opacity="0.9"/>
  <!-- Keyhole dot -->
  <circle cx="21" cy="27" r="0.8" fill="#1A0A0A"/>
  <!-- Roof accent -->
  <path d="M11 18l9-7 9 7" stroke="#D4A853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Logo mark colors:** Gold roof/frame strokes (`#D4A853`), coral door fill (`#E85A4F`), dark background (`#1A0A0A`).

**Wordmark:** "Direct" in white, "rent" in gold (`#D4A853`), ".ng" in muted (`rgba(255,255,255,0.5)`).

### 4.2 App Icon / Favicon

Same logo mark as above, rendered as a square with rounded corners. For app stores:
- Use the SVG above at 1024×1024 with `rx="200"` (scaled proportionally).
- Background: `#1A0A0A`
- The gold + coral house icon is centered.

### 4.3 Logo Usage Rules

- Always display the logo mark + wordmark in headers/splash screens.
- The logo mark alone can be used for app icons, notification badges, and loading states.
- Minimum size for the logo mark: 24×24dp.
- Never place the logo on a light/white background — it's designed for dark surfaces only.

---

## 5. BUSINESS LOGIC & NUMBERS

### 5.1 Fee Model (CRITICAL — must be consistent everywhere)

| Metric | Value | Label |
|--------|-------|-------|
| Traditional all-in fees | **32%** of annual rent | "Traditional Fees (Agent + Legal + Misc)" |
| Directrent platform fee | **2%** of annual rent | "Directrent.ng Fee (2%)" |
| Tenant savings | **30%** of annual rent | "Your Savings" |
| Average savings at ₦1M rent | **₦300,000** | Use this in all marketing copy |

**NEVER label the traditional fee as "Agent Fee (32%)".** It's a composite of multiple charges: agency fee (~10%), legal/agreement fee (~10%), caution/commission (~7%), inspection/misc (~5%). Always call it "Traditional Fees" or "Agent + Legal + Misc."

### 5.2 Example Calculation (for any calculator UI)

| Line Item | Amount |
|-----------|--------|
| Annual Rent | ₦1,000,000 |
| Traditional Fees (32%) | ₦320,000 |
| Directrent Fee (2%) | ₦20,000 |
| **Your Savings** | **₦300,000** |

### 5.3 Launch Areas

| Area | Status |
|------|--------|
| Yaba | ✅ Launch area |
| Surulere | ✅ Launch area |
| Ikeja | Coming soon |
| Lekki | Coming soon |
| Victoria Island | Coming soon |
| Ikoyi | Coming soon |
| Gbagada | Coming soon |
| Maryland | Coming soon |

### 5.4 User Types

| Type | Value | Description |
|------|-------|-------------|
| Tenant | `tenant` | Looking for a place to rent |
| Landlord | `landlord` | Have a property to rent out |

A single user can be BOTH. The app should support switching between modes.

---

## 6. KEY RESEARCH STATISTICS (for use in UI copy)

These come from primary research (N=70: 50 tenants, 20 landlords) conducted in Lagos. Use them for trust-building UI elements.

| Statistic | Value | Context |
|-----------|-------|---------|
| Cronbach's Alpha (Landlords) | 0.996 | Internal consistency of survey |
| Cronbach's Alpha (Tenants) | 0.976 | Internal consistency of survey |
| Cramer's V (Agent-Payment Delay) | 0.882 | Near-perfect association |
| Agent-managed vacancy | 63.53 days | Average time to fill |
| Direct-managed vacancy | 24.60 days | Average time to fill |
| PSS with agents | 7.40/10 | Psychological Stress Score |
| PSS without agents | 2.44/10 | Psychological Stress Score |
| Cohen's d | 3.36 | Massive effect size |
| Payment delays with agents | 93.3% | Incidence rate |
| Platform adoption intent | 100% | Both landlords and tenants |
| Most desired feature | "Background verification" | Mean = 4.44/5 |
| Second most desired | "Secure escrow" | Mean = 4.44/5 |

---

## 7. VALIDATION RULES (must match website exactly)

### 7.1 Nigerian Phone Number

```
Regex: /^(\+234|234|0)[789][01]\d{8}$/
Accepts: 08012345678, +2348012345678, 2348012345678
Normalization: Always store as +234XXXXXXXXXX
Error message: "Please enter a valid Nigerian phone number"
```

### 7.2 Email

```
Required, must be valid email format
Transform: toLowerCase() + trim()
Error message: "Please enter a valid email address"
```

### 7.3 Name

```
Min: 2 characters
Max: 100 characters
Transform: trim()
Error messages: "Name is required" / "Name must be at least 2 characters"
```

### 7.4 Message (for contact/support)

```
Min: 10 characters
Max: 2,000 characters
Transform: trim()
```

---

## 8. API CONTRACTS

The website has three API routes. The mobile app will need its own backend (Firebase is planned) but the validation schemas and response shapes should match.

### 8.1 POST /api/waitlist

**Request:**
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, valid email)",
  "phone": "string (required, Nigerian format)",
  "userType": "tenant | landlord (required)",
  "area": "yaba | surulere (optional)",
  "referralSource": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully joined the waitlist"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": {
    "fieldName": ["Error message"]
  }
}
```

### 8.2 POST /api/contact

**Request:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "phone": "string (optional, Nigerian format if provided)",
  "subject": "string (required, 3-200 chars)",
  "message": "string (required, 10-2000 chars)",
  "userType": "tenant | landlord (optional)"
}
```

### 8.3 POST /api/newsletter

**Request:**
```json
{
  "email": "string (required, valid email)"
}
```

---

## 9. PLANNED BACKEND ARCHITECTURE (for mobile apps)

| Service | Purpose |
|---------|---------|
| **Firebase Auth** | Authentication (email/password + phone OTP) |
| **Firestore** | Database (users, listings, messages, leases) |
| **Firebase Storage** | Property photos, documents |
| **Firebase Cloud Messaging** | Push notifications |
| **Paystack** | Escrow payments, rent collection |
| **Dojah or similar** | BVN/NIN identity verification |
| **Termii** | SMS OTP delivery |
| **Resend** | Email notifications |

---

## 10. MOBILE APP FEATURES (from website's feature showcase)

### Tenant App Features

1. **Direct Landlord Access** — In-app messaging with verified landlords
2. **Verified Listings** — Browse properties with verified ownership documents
3. **Paystack Escrow Payments** — Secure rent payments released only after move-in confirmation
4. **Savings Calculator** — See exactly how much you save vs traditional agents
5. **Digital Lease Signing** — Sign Lagos State Tenancy Law-compliant leases in-app
6. **Neighborhood Insights** — Safety ratings, amenity data, transport proximity
7. **Saved Searches & Favorites** — Bookmark properties and get alerts
8. **Rent Payment History** — Track payments for credit building

### Landlord App Features

1. **BVN/NIN Verified Tenants** — Only verified tenants can apply
2. **Property Listing** — Free listing with photos, videos, virtual tours
3. **Tenant Screening Dashboard** — Review applications with verified profiles
4. **Automated Rent Collection** — Set up reminders and track payments
5. **Digital Lease Generation** — Auto-generate compliant lease agreements
6. **Property Performance Analytics** — Occupancy, payment history, rental yield
7. **Direct Messaging** — Chat with interested tenants securely
8. **Multi-Property Management** — Single dashboard for all properties

---

## 11. COMPONENT PATTERNS & UI CONVENTIONS

### 11.1 Buttons

| Variant | Background | Text | Usage |
|---------|-----------|------|-------|
| Primary | `#E85A4F` (coral) | White | Main CTAs |
| Secondary | `#D4A853` (gold) | `#1A0A0A` (dark) | Alternative CTAs |
| Outline | Transparent, `#D4A853` border | Gold | Tertiary actions |
| Ghost | Transparent | White | Navigation, subtle actions |

- Minimum height: 48dp (touch target)
- Border radius: 12dp (rounded-lg equivalent)
- Font weight: semibold (600)

### 11.2 Cards

- Background: `#2D1515` (primary-medium)
- Border: `rgba(255,255,255,0.1)`
- Border radius: 16dp (rounded-2xl equivalent)
- Padding: 16dp mobile, 24dp tablet
- Shadow on hover/press: `0 4px 20px rgba(0,0,0,0.3)`

### 11.3 Inputs

- Background: `#2D1515` (primary-medium)
- Border: `rgba(255,255,255,0.1)`, changes to `#E85A4F` on focus
- Border radius: 12dp
- Height: 48dp minimum
- Font size: 16dp minimum (prevents iOS auto-zoom)
- Placeholder color: `rgba(255,255,255,0.5)`

### 11.4 Bottom Sheets / Modals

- Background: `#2D1515` with handle indicator
- Overlay: `rgba(0,0,0,0.5)`
- Border radius (top): 24dp

### 11.5 Navigation

- Tab bar background: `#1A0A0A`
- Active icon: `#E85A4F` (coral)
- Inactive icon: `rgba(255,255,255,0.5)`
- Active indicator: coral dot or pill below icon

---

## 12. LEGAL & REGULATORY CONTEXT

The mobile apps must comply with:

| Regulation | Requirement |
|------------|------------|
| **NDPR 2019 / NDPA 2023** | Privacy policy, data consent, 72-hour breach notification, user data rights (access, rectify, delete, port) |
| **LASRERA** | Registered as technology intermediary, comply with agent fee caps |
| **Lagos State Tenancy Law 2011** | Digital leases must be compliant, escrow process must align |
| **Lagos State Tenancy Bill 2025** | Proactive alignment with proposed 5% agency fee cap |
| **CBN Guidelines** | Payment processing compliance (Paystack handles this) |

---

## 13. CONTENT & COPY RULES

- **Savings claim:** "Save **from** ₦300,000 in rental fees" (not "agency fees" — because the 32% is a composite). Superseded "Save up to ₦300,000" on 27 July 2026: 32% is the research-backed **floor**, not the ceiling. Observed real-world fees reach 65% of annual rent (₦650,000 on a ₦1,000,000 two-bedroom, Lagos Mainland), so "up to" understated the saving. Never phrase the saving as a maximum.
- **Fee comparison:** "2% vs 30%+" or "2% vs ~32%" — never "2% vs 15%"
- **Never say:** "MBA", "capstone", "Rome Business School", "academic project"
- **Always say:** "research", "primary research", "70 Lagos residents surveyed"
- **Naira:** Always literal `₦` character, formatted with commas: `₦1,000,000`
- **"The Agent Effect"** — our branded term for the systemic failure of the middleman model
- **Testimonials must use "₦300,000+"** (not the old ₦200,000)
- **Feature title:** "Save ₦300K+" (not "Save 13%")

---

*Document version: 1.0 — Generated from website codebase review, March 2026*
*Website: https://directrent.ng*
*Git commit reference: See latest on main branch*
