# CLAUDE.md — Directrent.ng Mobile App

> **READ THIS ENTIRE FILE BEFORE TAKING ANY ACTION.** This file is the persistent memory for the Directrent mobile app project. It survives across Claude Code sessions and represents the agreed-upon state of the project. If anything in this file conflicts with a user request, ASK before changing it.

---

## 1. PROJECT IDENTITY

- **Project name:** Directrent.ng Mobile App
- **Workspace:** `C:\Projects\directrent.ng-app2`
- **Platform:** React Native + Expo SDK 54 (TypeScript)
- **Workflow:** **Expo Dev Client + native modules** (NOT Expo Go, NOT bare RN)
- **Architecture:** **Single app with role-switching** — one user can be a tenant, a property owner, or both. The user picks/switches roles inside the app.
- **Say "property owner", never "landlord", in anything a user reads.** The stored
  role value is still the string `landlord` and the Firestore field is still
  `landlordId` — those are data and must not be renamed without a migration.
  Only the labels changed. The website has not had this pass yet.
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
- **Savings framing:** Say "Save **from** ₦300,000" — never "up to". The 32% is the research-backed floor; real fees observed as high as 65% of annual rent. Phrasing the saving as a maximum understates the problem. Itemised breakdowns still show exact figures derived from 32%; only headline claims carry "from".
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
- `app.json` — configured for Dev Client (`scheme: directrent`, `android.package: ng.directrent.app`, `userInterfaceStyle: dark`)
- `npx expo prebuild --clean --platform android` ran successfully — `android/` folder generated
- Dev Client built and installed on the physical Samsung device

The placeholder "Foundation Ready" screen this prompt produced is long gone —
`App.tsx` now mounts the auth and navigation tree.

### ✅ Prompt 2 — Auth + Firebase (COMPLETE)

Firebase project `directrent-prod` exists. `@react-native-firebase/app`, `auth`,
`firestore` and `storage` are installed and linked. Auth context in
`src/context/AuthContext.tsx` covers signup, login, logout, persistent session,
role selection and role switching. Phone OTP was **not** built — accounts are
email and password.

### ✅ Prompt 3 — Listings Vertical Slice (COMPLETE)

Browse with search and filters, listing detail with the savings breakdown,
saved properties, and the five-tab navigation. Six seeded Yaba/Surulere
listings live in Firestore (not in code — `SEED_LISTINGS` is imported nowhere).

### ✅ Built after Prompt 3

- **Owner listing flow** — five-step wizard, photo upload with compression, publish
- **Enquiries** — send, receive, accept, decline
- **Direct messaging** — threaded chat on Firestore snapshots, conversation list
- **Profile** — edit name and phone, profile picture, change password
- **Icon set** — 15 drawn icons, no emoji anywhere (`src/components/icons/Icon.tsx`)
- **Market registry** — `src/data/markets.ts`; opening a new city is a data change
- **Call signalling** — Firestore-based, WebRTC-ready (`src/services/calls.ts`)
- **Out-of-app calling** — opens the phone dialler, gated on owner consent

### ⏳ Known gaps — read before promising anything

- **Editing a published listing is impossible.** Only drafts reopen in the
  wizard. Routing published listings there is NOT a one-line fix: the wizard's
  exit dialog calls `discardDraft`, which deletes the document and every photo.
- **In-app voice is half-built.** Signalling is done; `react-native-webrtc`, a
  call screen, a native rebuild and a TURN relay are not. Without TURN, a
  large share of Nigerian mobile-to-mobile calls connect to silence.
- **Live tour** is a "coming soon" banner only.
- **No push notifications.** Messaging works but nobody is told a message arrived.
- **No BVN/NIN verification, no Paystack.** Both need credentials.
- **Listing review was removed.** Publishing goes straight to `active` because
  the admin panel in MASTER_PRD does not exist. `pending` remains in the model.

### ⏳ Future scope

Paystack escrow, Dojah verification, lease generation, ratings, analytics. All
scoped in the MASTER_PRD and FEATURE_SPEC documents.

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
- **Test device:** Samsung SM-A4260, 720x1600 (USB debugging enabled)
- **Firebase project:** `directrent-prod` — Firestore and Storage both enabled
- **Rules:** `firestore.rules` and `storage.rules` live in the repo root and are
  published. They are NOT deployed by any tooling — publishing means pasting
  them into the console by hand, so a change here is not live until someone does.
- **Git remote:** `https://github.com/ragusateam2025-tech/DIRECTRENT.NG-APP`
- **Tests:** `npm test` — Jest, in `__tests__/` at the repo root (not in `src/`)

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
10. **Gradle on Windows failing with AccessDeniedException or "Unable to delete directory"** → directories under `android/` carry the ReadOnly attribute. On Windows that flag does not block *writing into* a folder but does block *deleting* it, and Gradle deletes these every build. Clear it recursively, do not delete `android/` and rebuild for 47 minutes.
11. **Trusting Fast Refresh after a Firestore rules change** → a `useEffect` whose dependencies have not changed keeps the OLD listener, so the screen still shows the old failure. Force-stop the app.
12. **`onSnapshot` with no error callback** → the success path never runs and the screen spins forever, looking like a hang. Every listener takes an error handler.
13. **Writing `undefined` to Firestore** → rejected outright as "Unsupported field value". Strip undefined keys, or write an explicit `null` when the intent is to clear a field.
14. **Assuming a document has the fields its TypeScript type promises** → the seeded listings had no `ownerId` at all, which surfaced only when the first write needed it. Firestore does not validate shape; the type is a hope, not a guarantee.
15. **Verifying only with `tsc` and `npm test`** → every real bug found on 30–31 July lived in code that talks to Firestore, and the tests touch none of it. Run the app on the device before claiming anything works.
16. **Writing rules with a wildcard glued to text** — `match /{side}Candidates/{id}` → does not parse. A path segment is either a literal or a whole wildcard. Nothing in the repo validates rules; the console is the first checker.

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

## 11. WHERE THINGS STAND

### Verified on the device
Browse, filters, listing detail with the photo gallery, saved properties, the
icon set, the live tour banner, profile editing, and profile picture upload.

### Built but never seen working end to end
**Sending a message.** Enquiry → conversation → chat has never once completed,
because the six seeded listings are missing `ownerId`. The Message and Call
buttons hide themselves when it is absent, so the symptom is silent.

### The blocking task
In the Firebase console, on each of the six documents in `listings`:

| Field | Where | Value |
|---|---|---|
| `ownerId` | top level | `demo` |
| `marketId` | inside `location` | `lagos` |
| `state` | inside `location` | `Lagos` |

Then force-stop the app. Once `marketId` is on every document, delete the
legacy fallback in `src/services/listings.ts` — it is marked for removal.

### Recommended next work, in order
1. **Emulator-backed tests for the Firestore write paths.** Every bug found on
   30–31 July lived there, and nothing in the suite covers it.
2. **Editing a published listing** — see the warning in section 5.
3. **Push notifications** — messaging is weak without them.
4. **WebRTC native layer** — last, and only after the write paths are trusted.

---

*Last updated: July 31, 2026 — messaging, calling, profiles and the market registry built; blocked on the listings backfill*
