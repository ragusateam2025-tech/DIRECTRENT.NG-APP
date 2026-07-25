# CLAUDE.md — Directrent.ng Mobile App

> **READ THIS ENTIRE FILE BEFORE TAKING ANY ACTION.** This file is the persistent memory for the Directrent mobile app project. It survives across Claude Code sessions and represents the agreed-upon state of the project. If anything in this file conflicts with a user request, ASK before changing it.

---

## 1. PROJECT IDENTITY

- **Project name:** Directrent.ng Mobile App
- **Workspace:** `C:\Projects\directrent.ng-app2`
- **Platform:** React Native + Expo SDK 54 (TypeScript)
- **Workflow:** **Expo Dev Client + native modules** (NOT Expo Go, NOT bare RN)
- **Architecture:** **Single app with role-switching** — one user can be a tenant, a landlord, or both. The user picks/switches roles inside the app.
- **Target devices:** Physical Android device via USB (primary), Android emulator (backup)
- **Host OS:** Windows 10, PowerShell, VS Code
- **Package name:** `ng.directrent.app`
- **Companion website:** https://directrent.ng (already live, do NOT modify)

---

## 2. REFERENCE DOCUMENTS — READ ON DEMAND

The following files live in the project root. Do NOT preload them into context. Read them with the file viewer ONLY when the current task requires their content. They are large; loading them all at once will waste the context window.

### Brand & business logic (read first when in doubt)
- **`DIRECTRENT_MOBILE_HANDOFF.md`** — Source of truth for colors, typography, copy, brand voice, fee model, validation rules, API contracts, and component patterns. **READ WHEN:** generating any UI, writing any user-facing copy, choosing colors/spacing/fonts, validating Nigerian phone numbers, calculating savings, or labeling fees.

### Product requirements (the master plan)
- **`MASTER_PRD.md`** — High-level product spec, user stories, success metrics, sprint plan. **READ WHEN:** planning a new feature or checking whether something is in scope for the current phase.
- **`MASTER_PRD_PART2.md`** — Firestore schemas (TypeScript interfaces), Cloud Function signatures, security rules, error code registry. **READ WHEN:** modeling data, writing Firestore queries, defining types, writing security rules, or handling errors.
- **`MASTER_PRD_PART3.md`** — State machine diagrams, test fixtures, integration details for Paystack/Dojah/Firebase Auth. **READ WHEN:** implementing payment flows, BVN/NIN verification, OTP flows, or writing tests.

### Feature specifications (the detailed how)
- **`FEATURE_SPEC.md`** — Detailed UX flows for tenant features (browse, search, save, message, apply, pay). **READ WHEN:** building any tenant-side screen.
- **`FEATURE_SPEC_PART2.md`** — Detailed UX flows for landlord features (list property, screen tenants, manage payments, generate leases). **READ WHEN:** building any landlord-side screen.
- **`FEATURE_SPEC_PART3.md`** — Cross-cutting features: notifications, settings, profile, support, legal screens, edge cases. **READ WHEN:** working on shared features or non-vertical concerns.

### How to use these documents
1. When the user gives you a task, ask yourself: "Which of the reference docs is most relevant?"
2. Read ONLY that doc (or the relevant section if you can target it).
3. Use what you read to inform the implementation.
4. Do NOT quote large blocks back to the user — they wrote these docs and already know the content. Just apply them silently.
5. If two reference docs disagree, the more specific one wins (FEATURE_SPEC > MASTER_PRD > DIRECTRENT_MOBILE_HANDOFF for implementation details; the reverse for brand/voice).
6. If the user's current request contradicts the reference docs, STOP and ask before proceeding.

---

## 3. THE NON-NEGOTIABLE BRAND RULES

These rules come from `DIRECTRENT_MOBILE_HANDOFF.md`. They are restated here because they are the most-violated rules and must be top-of-mind always.

- **Naira symbol:** Always literal `₦` — NEVER `\u20A6`, `&#x20A6;`, or any escape sequence.
- **Fee labeling:** Always "Traditional Fees (Agent + Legal + Misc)" — NEVER "Agent Fee (32%)". The 32% is a composite of multiple charges.
- **Savings figure:** Always ₦300,000 at ₦1M rent. Always.
- **Forbidden words in any user-visible content:** "MBA", "capstone", "Rome Business School", "academic project", "school project". Directrent presents as a company, period.
- **Allowed framing for the research:** "primary research", "research-validated", "70 Lagos residents surveyed".
- **Colors:** Dark burgundy backgrounds (`#1A0A0A`), gold accents (`#D4A853`), coral CTAs (`#E85A4F`). Full token list in `src/theme/tokens.ts`.
- **Typography:** Outfit for headings/display, Inter for body/UI.
- **The Agent Effect:** Our branded term for the systemic failure of the middleman model. Use it.

---

## 4. HOW WE WORK TOGETHER (The Unified Workflow)

This project follows a unified single-instance workflow. The user has learned the hard way that splitting planning and execution across multiple Claude instances causes regressions and wasted time.

- **Plan first, then execute.** Before writing code, state the plan in 2–4 sentences.
- **Sequential prompts with hard checkpoints.** We work in numbered prompts (Prompt 1, Prompt 2, Prompt 3...). Each prompt has explicit acceptance criteria. The next prompt does not start until the current one passes.
- **No creative scope expansion.** If the prompt says "build the auth screens," do not also build the listing screens because it "feels related." Stay in scope.
- **Fail loudly, do not improvise.** If a step fails, stop and report the exact error. Do NOT invent workarounds, downgrade dependencies on your own, or "try a different approach" without permission.
- **Acceptance criteria are gates, not suggestions.** If a step says "verify the app shows X on the device," do not move on until the user confirms X is visible.
- **Pre-audit existing code before changing it.** Read the file first. Understand what's there. Only then edit.
- **The reference documents are law.** When in doubt about brand, copy, schema, or business logic, read the appropriate reference doc rather than guessing.

---

## 5. WHAT'S BEEN BUILT SO FAR

### ✅ Prompt 1 — Foundation Scaffold (COMPLETE)

- Expo SDK 54 TypeScript project initialized in-place at `C:\Projects\directrent.ng-app2`
- Dependencies installed: `expo-dev-client`, `expo-font`, `@expo-google-fonts/outfit`, `@expo-google-fonts/inter`, `react-native-safe-area-context`, `react-native-screens`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
- `src/theme/tokens.ts` — design tokens (colors, typography, spacing, radius) matching DIRECTRENT_MOBILE_HANDOFF.md
- `src/theme/ThemeProvider.tsx` — theme provider with Outfit + Inter font loading and `useTheme()` hook
- `app.json` — configured for Dev Client (`scheme: directrent`, `android.package: ng.directrent.app`, `userInterfaceStyle: dark`, `plugins: [expo-dev-client, expo-font]`)
- `App.tsx` — Hello Directrent screen with split "Direct" (white) + "rent" (gold) wordmark, tagline, "Foundation Ready" coral pill
- `npx expo prebuild --clean --platform android` ran successfully — `android/` folder generated
- `npx expo run:android` built and installed the Dev Client on the user's physical Samsung device
- Dev Client launcher screen confirmed visible on device
- Foundation Ready screen confirmed visible on device after connecting to Metro

### ⏳ Prompt 2 — Auth + Firebase (NOT STARTED)

Will deliver:
- Firebase project setup (user-provided credentials)
- `@react-native-firebase/app`, `auth`, `firestore` native modules
- Auth context with TypeScript types
- Signup, Login, Phone OTP, Role Selection screens
- Persistent session, logout
- Stub home screen with role-switcher in header

Schemas, error codes, and security rules for this phase live in `MASTER_PRD_PART2.md` — read it before starting Prompt 2.

### ⏳ Prompt 3 — Listings Vertical Slice (NOT STARTED)

Will deliver:
- Firestore listings collection schema (see `MASTER_PRD_PART2.md`)
- Seed data (6 fake Yaba/Surulere properties)
- Listings browse screen with property cards (see `FEATURE_SPEC.md`)
- Listing detail screen
- Savings calculator (₦300,000 at ₦1M rent, "Traditional Fees (Agent + Legal + Misc)" labeling)
- Bottom tab navigation: Browse / Saved / Messages / Profile

### ⏳ Future scope (post-vertical-slice)

Paystack escrow, Dojah BVN/NIN verification, listing creation for landlords, in-app messaging, lease generation, push notifications. All scoped in the MASTER_PRD and FEATURE_SPEC documents.

---

## 6. ENVIRONMENT (As of last verified session)

- **Node:** v22.x LTS via nvm-windows
- **npm:** 10.x (bundled with Node 22)
- **Expo SDK:** 54
- **Java:** JDK 21 (Android Studio bundled JBR at `C:\Program Files\Android\Android Studio\jbr`)
- **JAVA_HOME:** `C:\Program Files\Android\Android Studio\jbr`
- **Android SDK:** `C:\Users\Ololade Olaniran\AppData\Local\Android\Sdk`
- **ANDROID_HOME:** Set to the SDK path above
- **adb:** On PATH via `%LOCALAPPDATA%\Android\Sdk\platform-tools`
- **Claude Code:** Native Windows installer at `C:\Users\Ololade Olaniran\.local\bin\claude.exe`
- **Test device:** Samsung Android phone (USB debugging enabled)
- **Firebase project:** NOT YET CREATED (Step 1 of Prompt 2)

---

## 7. THE DEVELOPMENT LOOP (Daily Workflow)

**Every coding session:**
1. `cd C:\Projects\directrent.ng-app2`
2. `npx expo start --dev-client`
3. Open the Directrent app on the phone
4. Tap "Fetch development servers" → connect to Metro
5. Code → save → Fast Refresh updates the phone in 1–2 seconds

**Slow native rebuild (`npx expo run:android`) is ONLY required when:**
- Adding a new native dependency (e.g. `@react-native-firebase/app`)
- Changing `app.json` plugins
- Changing anything in `android/`

**Never rebuild for pure JS/TS/styling changes — Fast Refresh handles those.**

---

## 8. FILES THAT SHOULD ALWAYS BE IN PROJECT ROOT

- `CLAUDE.md` (this file)
- `DIRECTRENT_MOBILE_HANDOFF.md` (brand + business logic)
- `MASTER_PRD.md`, `MASTER_PRD_PART2.md`, `MASTER_PRD_PART3.md` (product requirements)
- `FEATURE_SPEC.md`, `FEATURE_SPEC_PART2.md`, `FEATURE_SPEC_PART3.md` (feature flows)
- `package.json`
- `app.json`
- `tsconfig.json`
- `App.tsx`
- `google-services.json` (after Firebase setup — NEVER commit to git)

---

## 9. THINGS THAT HAVE BROKEN BEFORE — DO NOT REPEAT

Listed so we don't relearn the same lessons:

1. **Node 25 with Expo SDK 54** → not officially supported, causes cryptic install failures. Stay on Node 22 LTS.
2. **Expo Go with native Firebase** → fundamentally incompatible. Use Dev Client.
3. **Splitting planning and execution across two Claude instances** → causes misalignment. One unified instance only.
4. **Running env var commands before installing the SDK they point to** → variables get set to nonexistent paths. Always install first, set vars second.
5. **Forgetting to fully restart VS Code after PATH changes** → new env vars don't show up in cached terminal sessions.
6. **Installing a second JDK when Android Studio's JBR already exists** → version mismatch hell. Use the bundled JBR via JAVA_HOME.
7. **Module resolution error: "Unable to resolve module ../../App from node_modules/expo/AppEntry.js"** → caused by missing `index.js` or wrong `main` field in `package.json`. The fresh-start scaffold from Prompt 1 avoids this entirely.
8. **Using `\u20A6` instead of literal `₦`** → renders incorrectly on some devices. Always literal.
9. **Preloading large reference docs into every session** → wastes the context window. Read on demand only.

---

## 10. COMMUNICATION STYLE

The user is a non-technical founder. They are intelligent and detail-oriented but do not have a software engineering background. When explaining things:

- Use plain language. Define jargon the first time it appears.
- Explain WHY a step matters, not just WHAT to do.
- When something fails, explain what failed in human terms before showing the fix.
- Lead with the conclusion. ("This is good news — here's what it means...") not the process.
- Never bury the next action under exposition. Every response should end with a clear "do this next."
- The user prefers structured prompts they can copy-paste. Format Claude Code prompts inside fenced code blocks.

---

## 11. SUCCESS DEFINITION FOR PROMPT 1 (For Reference)

**All passed:**
- ✅ App icon visible on physical Android device
- ✅ Dev Client launcher shows "Directrent — Development Build"
- ✅ Metro bundler connects and loads JS
- ✅ Hello Directrent screen renders: dark background, "Direct" white + "rent" gold, tagline, "Foundation Ready" coral pill
- ✅ No red error screens, no font warnings
- ✅ Folder structure matches Prompt 1 spec

**Next gate:** Firebase project created, credentials placed in `google-services.json`, then begin Prompt 2 (Auth flow).

---

*Last updated: April 8, 2026 — End of Prompt 1 session, reference docs added*
