# Tenant Vertical Slice — Demo Build

**Date:** 25 July 2026
**Deadline:** Before Monday, 27 July 2026
**Deliverable:** A live demo running on a physical Android phone
**Status:** Approved, ready for implementation planning

---

## 1. Purpose

Deliver one complete, credible tenant journey that a client can hold in their
hand and walk through unaided:

> Open the app → create an account → choose a role → browse Lagos listings →
> open a property → see exactly how much renting directly saves.

This is a **demo build**, not a pilot. No real money moves. No real landlords
are onboarded. Listings are seeded by us. The goal is to make the value
proposition tangible, not to operate a marketplace.

---

## 2. Scope

### 2.1 In scope

Nine screens:

| # | Screen | Purpose |
|---|--------|---------|
| 1 | Splash / auth gate | Load fonts, restore existing session |
| 2 | Welcome | The Agent Effect, the ₦300,000 savings claim |
| 3 | Sign Up | Name, email, password |
| 4 | Log In | Returning users |
| 5 | Role Selection | Tenant / Landlord / Both |
| 6 | Browse (tab) | 6 seeded Yaba and Surulere properties |
| 7 | Listing Detail | Photos, rent, savings breakdown |
| 8 | Saved (tab) | Persisted favourites |
| 9 | Profile (tab) | User details, role switcher, log out |

A **Messages** tab ships as a deliberate empty state rather than being omitted.
A three-tab bar reads as unfinished; a considered empty state reads as roadmap.

### 2.2 Explicitly out of scope

Cut for this build, all of it already scoped in the PRDs for later phases:

- Paystack escrow and any payment flow
- Dojah BVN / NIN identity verification
- Phone OTP authentication
- In-app messaging (tab exists, no conversations)
- Lease generation
- Landlord listing creation
- Push notifications
- Property search and filtering (browse shows all six)

**Scope is fixed.** New feature ideas before Monday go on a list for after
delivery. The failure mode on a deadline this tight is not building too little,
it is starting too much.

---

## 3. Non-negotiable brand rules

Carried from `DIRECTRENT_MOBILE_HANDOFF.md`, restated because they are the
most-violated:

- **Naira:** always the literal `₦` character, comma-formatted — `₦1,000,000`.
  Never an escape sequence.
- **Fee label:** always "Traditional Fees (Agent + Legal + Misc)".
  **Never** "Agent Fee (32%)" — the 32% is a composite of agency, legal,
  caution and inspection charges.
- **Savings:** ₦300,000 at ₦1,000,000 annual rent. Always.
- **Forbidden in any user-visible text:** "MBA", "capstone",
  "Rome Business School", "academic project", "school project".
- **Permitted research framing:** "primary research", "research-validated",
  "70 Lagos residents surveyed".
- **The Agent Effect** is our branded term for the systemic failure of the
  middleman model. Use it.

---

## 4. The savings breakdown

The centrepiece of the demo. Appears on every listing detail screen.

```
Annual Rent                             ₦1,000,000
Traditional Fees (Agent + Legal + Misc)   ₦320,000
Directrent.ng Fee (2%)                     ₦20,000
──────────────────────────────────────────────────
Your Savings                              ₦300,000
```

| Quantity | Rate | At ₦1,000,000 rent |
|----------|------|--------------------|
| Traditional all-in fees | 32% of annual rent | ₦320,000 |
| Directrent.ng fee | 2% of annual rent | ₦20,000 |
| Tenant savings | 30% of annual rent | ₦300,000 |

**Implementation requirement:** one pure function, one module, consumed
everywhere. The savings figure must be structurally incapable of disagreeing
with itself between screens. Currency formatting lives in the same module.

---

## 5. Architecture

### 5.1 Authentication

Firebase email and password. Real account creation, real session persistence
via `onAuthStateChanged`, real log out.

Phone OTP is deliberately **not** used for the demo, and **not built in this
slice** (see 2.2). It depends on an SMS arriving in the room, over venue wifi,
in front of the client. It remains scoped for the real product in a later
phase.

An `AuthContext` exposes the current user, their profile, loading state, and
the sign-up / log-in / log-out actions. Screens read auth state from context
only — never by calling Firebase directly.

### 5.2 Navigation

- A root gate switches between the auth stack and the app stack based on
  session state. Signed-in users never see the Welcome screen again.
- **Auth stack:** Welcome → Sign Up / Log In → Role Selection
- **App stack:** bottom tabs (Browse, Saved, Messages, Profile), with Listing
  Detail pushed on top of the Browse tab.

### 5.3 Data model

A `listings` Firestore collection using a **trimmed subset** of the
`createListing` shape defined in `MASTER_PRD_PART2.md` — identical field names
and nesting, fewer fields. Nothing has to be renamed when the full landlord
listing flow is built later.

Retained groups: `basicInfo`, `location`, `media`, `pricing`, `details`,
plus `status.listing`.

Saved properties are stored per user so they survive app restarts.

A one-off seed script populates the six properties. It is idempotent — running
it twice must not create duplicates.

### 5.4 Demo resilience

Firestore caches documents locally after first load, so once the app has been
opened on the venue network the listings remain visible even if wifi degrades.
Property photos are **bundled into the app**, not fetched, so images never
depend on the network.

---

## 6. Assets

Six real Lagos property photographs, supplied by the founder, to be placed in
`assets/properties/`. Landscape orientation preferred.

**Fallback if photos do not arrive:** branded burgundy and gold gradient cards
carrying the property type and area in type. Screens are built against this
placeholder first and photos swapped in on arrival, so photo delivery never
blocks progress.

---

## 7. Delivery gates

Each gate is verified on the physical device before the next begins.

| Gate | Deliverable | Verified by |
|------|-------------|-------------|
| 0 | Existing app builds and launches | Foundation screen visible on phone |
| 1 | Navigation and authentication | Create an account, close app, reopen, still signed in |
| 2 | Listings, browse, detail, savings | Six properties visible, detail shows ₦300,000 correctly |
| 3 | Saved, Profile, polish | Heart a property, reopen app, it is still saved |
| 4 | Rehearsal | Full journey walked end to end without a crash |

**Gate 0 is the schedule risk.** The Android build has not been touched since
8 April 2026, roughly three and a half months. If it has rotted, recovery could
consume hours. This is known within the first hour, and reported immediately.

**Agreed contingency:** if gate 0 overruns, the Saved tab (gate 3) is cut first
to protect the core browse-and-savings demo.

---

## 8. Acceptance criteria

The build is deliverable when all of the following are true on the physical
device:

1. App launches from the home screen icon with no red error screen.
2. A brand-new account can be created and reaches the Browse tab.
3. Force-quitting and reopening the app returns to Browse still signed in.
4. Browse shows six properties, each with photo, title, area and annual rent.
5. Tapping a property opens its detail screen.
6. The savings breakdown shows the correct arithmetic for that property's rent,
   labelled "Traditional Fees (Agent + Legal + Misc)".
7. Every naira figure uses the literal `₦` and comma formatting.
8. A property can be saved, and remains saved after an app restart.
9. Profile shows the account's name and email, and log out returns to Welcome.
10. No forbidden word appears anywhere in user-visible text.

---

## 9. Known risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Android build rotted over 3½ months | High | Gate 0 runs first, before any feature work |
| No device currently connected (`adb devices` empty) | Blocking | Founder connects phone with USB debugging enabled |
| Firestore security rules may block reads | Medium | Verified during gate 2; rules are console-side |
| Property photos not delivered in time | Low | Branded placeholder fallback already specified |
| Scope creep before Monday | High | Section 2.2 is fixed; new ideas deferred |
| Venue network failure during demo | Medium | Bundled images plus Firestore local cache |

---

## 10. What this is not

This build does not make Directrent.ng operational. It does not onboard
landlords, move money, verify identities, or generate leases. It is an honest,
working demonstration of the core tenant proposition, and it should be
presented as exactly that. Overstating it to a client is a worse outcome than
a smaller demo delivered with confidence.
