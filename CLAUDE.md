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

### ✅ Built 3–10 August

- **Facilities** — grouped by how a renter reads them (`src/data/amenities.ts`),
  36 drawn icons, each animating once on arrival. `AMENITY_ALIASES` maps older
  wording onto the catalogue, so "Backup generator" gets the generator icon and
  the right group. Aliasing decides grouping and iconography only — it never
  rewrites what the owner typed.
- **Owner occupancy** — "Owner lives here", compulsory before publishing, and
  filterable Yes/No/Any. First-order question for Nigerian renters.
- **360 tours, end to end** — provider-agnostic model (`tour.embedUrl`, so the
  host is replaceable), a WebView tour screen pinned to the tour's own host,
  screenshot blocking while it is open, an owner request checkbox in the photos
  step, and a staff queue at `src/screens/staff/TourQueueScreen.tsx`. **No tour
  content exists yet** — needs a Kuula account and a link pasted into the queue.
- **Enquiries merged into Messages** — an enquiry now opens a conversation and
  posts its answers as the first message; accept/decline live in the thread.
  The Enquiries tab and screen are gone. Four tabs, not five.
- **Email checks** — format plus a disposable-domain list (`src/lib/email.ts`),
  and Firebase email verification gating enquiries and publishing.
- **Auto-cycling photos** — Browse cards and the detail gallery cross-fade
  through every uploaded photo.
- **Security-rules tests** — 29 cases against the Firestore emulator,
  `npm run test:rules`. See §9.17.

### ✅ Built 14–15 August

- **House rules & availability** — pets, smoking, alterations, free text, plus
  availability and minimum lease reusing the tenant's own `MoveInTiming` /
  `LeaseDuration` vocabulary. Alterations is its own field (AC pipes, solar,
  tiles) and defaults to "ask first".
- **NERC power band** A–E, optional, shown as "Band B / 16+ hrs a day".
- **Major road & landmark** — optional, in the Location step.
- **Text normalisation** (`src/lib/text.ts`) — case and spacing only, never
  grammar. Applied at step boundaries, never as somebody types. Chat gets a
  lighter touch: a short shout stays shouted.
- **Spell-check underlines restored.** `TextField` hardcoded
  `autoCorrect={false}`, which sets Android's no-suggestions flag — nothing in
  this app had ever been spell-checked. On by default; off for email, phone,
  tour link, passwords.
- **Wizard remembers in-progress work** — steps report as you type, buffered in
  a ref, debounced 2s, flushed on background. `wizardStep` is stored, not
  inferred. Editing a published listing still does NOT autosave, deliberately.
- **Photo reordering** — drag and drop (the user replaced an earlier menu).
- **Tour approve / decline / reopen**, four-tab staff queue, decline requires a
  reason, decline categorised as `fixable` or `area_not_covered`. Only fixable
  ones can be resent by the owner.
- **Tour escalation** — 3 working days (`src/lib/businessDays.ts`, Mon–Fri, no
  public holidays modelled). The tours line is a company contact in
  `src/data/support.ts` and appears only when overdue AND staff have not marked
  contact. **`TOUR_SUPPORT.phone` is deliberately empty — fill it in.**
- **Tenancy agreement** — `src/lib/tenancyAgreement.ts` (pure, 19 tests) plus
  `src/services/agreement.ts` using expo-print. Reached from a conversation once
  the enquiry is accepted. **The clauses are not lawyer-settled and the document
  says so on its first page.**
- **AI writing assistant** — `functions/refineText.js`, Google AI Studio free
  tier, dual prompts on `role`. Owner copy is replaced; a tenant's message is
  *suggested* with Use this / Keep mine, because an owner reads how somebody
  writes and the tenant has to meet them.
- **Payments, end to end and verified against live Paystack test mode.**
  `src/screens/PaymentScreen.tsx` and `src/services/payments.ts`, reached from
  an accepted conversation, tenant side only. Three stages kept apart: review,
  Paystack's checkout in a WebView pinned to paystack.com, then a wait.
  **The app never decides a payment succeeded** — anybody can navigate to a
  success URL, so it watches the payment document and waits for the webhook.
  The listener attaches *before* the checkout opens, because the webhook can
  arrive while the tenant is still on Paystack's page. Confirmed working on a
  device on 15 August: `{"amount":3030000,"reference":"ih5a36z6KIqq1U0PySvJ",
  "message":"Payment confirmed"}` — signature verified, amount matched.
  While an enquiry is still pending the tenant sees the Pay button **disabled
  with the reason**, because a missing control is indistinguishable from a
  broken app. That was found by somebody trying to pay, not by a test.
- **The enquiry no longer asks how long a tenant wants to rent for.** Housing in
  Lagos is not taken on lightly and left. `leaseMonths` stays on the model at 12
  because the agreement and the minimum-lease filter read it.
- **Security pass** — email verification now enforced in rules (on listing
  *create* only), tour URLs restricted to an allowlist, storage rules tested for
  the first time (17 tests), Paystack webhook signature compared in constant
  time.

### ⏳ Known gaps — read before promising anything

- **All five functions are deployed and the AI assistant works.** `MODEL` is
  `gemini-3.7-flash`; `gemini-2.0-flash` was retired days after being written
  and returned 404. When it happens again the symptom is "assistant
  unavailable" on the phone plus a 404 in the logs naming the dead id, and the
  fix is that one constant.
- **`PAYSTACK_SECRET_KEY` now holds a real test key.** It briefly held the
  string `placeholder`, because the CLI validates *every* declared param before
  deploying anything — an unset secret in `payments.js` blocks a deploy of an
  unrelated function.
- **Paystack is in TEST MODE and the profile is under review.** Test keys take
  test cards only; no real tenant can pay. Do not invite real users to transact.
- **There is no payout path.** Money lands in the Paystack balance and nothing
  releases rent to the owner. This is the most serious gap in the money story
  and it is a build, not a setting. Going live also needs a new secret version,
  a redeploy, **and the webhook URL registered separately on the live side** —
  test and live webhooks are configured independently.
- **The payment confirmation screen has never been seen.** The webhook was
  confirmed in the logs, but the `waiting → done` transition was lost because a
  Fast Refresh remounted the navigator mid-checkout. Needs an accepted enquiry
  to reach again.
- **The tenancy agreement clauses are not lawyer-settled.** Nobody should sign
  one until a Nigerian lawyer has read it.
- **The tenancy agreement screen has never run.** No accepted enquiry exists on
  the test account, so the screen and the PDF are unverified on hardware.
- **Tour contact / escalation UI has never rendered** for the same reason.
- **No 360 tour content.** One placeholder `https://kuula.co` link is attached
  to a test listing.
- **In-app voice is half-built.** Signalling only; needs react-native-webrtc, a
  call screen, a rebuild and a TURN relay. Do not start before the 29th.
- **No BVN/NIN.** No ratings, no receipts, no escrow release, no lease revenue
  flow beyond the document itself.
- **Listing review was removed.** Publishing goes straight to `active`.

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
- **Firebase CLI:** signed in as `ololade.joseph1@gmail.com` since 10 August.
  Deploy rules with `npx firebase deploy --only firestore:rules`, which compiles
  them first. **Verify afterwards by reading the live rules back** — see §9.21.
- **Rules:** `firestore.rules` and `storage.rules` live in the repo root and are
  the source of truth. `firestore.rules` was last deployed 10 August. **Note
  `storage.rules` is still console-published by hand** — nothing deploys it.
- **Git remote:** `https://github.com/ragusateam2025-tech/DIRECTRENT.NG-APP`
- **Native modules added 15 August:** `expo-print`, `expo-sharing`,
  `@react-native-firebase/functions@24.0.0` (pinned — every other Firebase
  package peers on `app@24.0.0` exactly; `expo install` picks a version that
  will not resolve).
- **Secrets:** `GOOGLE_AI_API_KEY` set (v2). `PAYSTACK_SECRET_KEY` still unset.
- **Rules deploy:** both sets go through the CLI now —
  `npx firebase deploy --only firestore:rules,storage`. `firebase.json` already
  had the storage entry; the old note saying nothing deployed it was wrong.
- **Tests:**
  - `npm test` — Jest under jest-expo, in `__tests__/` at the repo root
  - `npm run test:rules` — Firestore **and Storage** rules against the
    emulators; starts and stops them itself, needs no account and no network
  - Current counts: **217 app tests, 93 rules tests**

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
16. **Writing rules with a wildcard glued to text** — `match /{side}Candidates/{id}` → does not parse. A path segment is either a literal or a whole wildcard. **Superseded by 17:** rules are now validated and deployed by the CLI, which compiles them before uploading.
17. **Publishing rules by pasting into the console** → nothing validated them, so a syntax error reached the user as the first check. Now: `npx firebase deploy --only firestore:rules`, which compiles first, and `npm run test:rules` for what they actually permit. `firestore.rules` in the repo is the source of truth.
18. **A sudden power cut corrupts caches, not just files** → on 3 August the laptop died mid-build and left two *build caches* zero-filled: Gradle's `android/app/.cxx/**/android_gradle_build.json` (4,361 bytes of nothing → `MalformedJsonException ... line 1 column 1`) and Metro's file map (`Unable to deserialize cloned data`, then `TypeError: dependencies is not iterable` at 99% of a bundle). Windows had recorded each file's new size before the data reached the disk. **Neither error names the cause.** Delete the cache and rebuild: `android/app/.cxx/Debug` for Gradle, and `expo start --clear` plus `%TEMP%\metro-cache` for Metro.
19. **The ReadOnly-directory problem is not confined to `android/`** → on 10 August `npm install` failed with `EPERM: operation not permitted, rmdir` because **911 directories under `node_modules\@firebase` carried the ReadOnly attribute**. Same fix, wider net: `attrib -R "<dir>\*" /S /D`. Also stop Metro first — it holds handles in `node_modules` and each breaks the other.
20. **Clearing ReadOnly *before* a Gradle build is not enough** → the flag reappears on directories Gradle creates *during* the build, so it can still fail partway through (`:app:generateDebugResValues`). Clear it again and re-run; the build resumes incrementally.
22. **Trusting an exit code** → `npx expo run:android` returned **exit 0 while
    building nothing**, because no device was connected. `npm run test:rules`
    passing means nothing until you break the rule and watch the right test
    fail — that is how the avatar delete bug and the missing staff read were
    both confirmed real.
23. **Enforcing a rule in two places** → the photo minimum lived in the photos
    step *and* the publish gate. Lifting it for 360 requests changed only one,
    so the wizard let an owner past step three and refused them on the last
    screen. Rules that appear twice drift; `src/lib/publishChecks.ts` exists
    because of it.
24. **`--no-bundler` then wondering why the phone will not connect** → that flag
    skips starting Metro. The app is not broken; nothing is serving it.
25. **A client-side check is not a rule** → email verification, the disposable
    domain list and the 3-day escalation threshold were all app-only. Two are
    now in firestore.rules; the third is knowingly a product rule, not a
    boundary. "No screen offers it" is not the same as "nobody can do it".
21. **Trusting a deploy tool's "success"** → the Firebase MCP `firebase_deploy` returned `{"status":"success"}` while the live rules were unchanged. Only reading the rules back caught it. Verify the deployed state, not the report.

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

### The deadline
**Investor meeting 29 August 2026.** Scope should be frozen well before it, and
nothing new should land after 26 August. A demo that crashes costs more than a
missing feature.

### The listings backfill is DONE
Completed 10 August. All 8 listing documents now carry `ownerId`,
`location.marketId`, `location.state` and `ownerOccupied`. The legacy fallback
in `src/services/listings.ts` and the temporary rule that allowed it have both
been removed. Browse does one read per load again.

The collection holds 6 seeded listings (owner `demo`) and 2 created through the
app by test accounts. **All accounts in `users` are test accounts** — there is
no account for the founder's own email.

### Verified on the device (15 August)

Browse and the new hero, the listing wizard end to end including publishing with
zero photos when a 360 is requested, in-progress work surviving Back **and a
hard kill**, resuming at the right step, the four-tab tour queue, approve,
decline with a reason, the decline validation, the declined pile, attaching a
tour, and the URL validator rejecting a link with no https.

### Built but NOT verified on a device

The tenancy agreement screen and PDF, the tour contact/escalation UI, the
resend-a-decline button, both AI buttons, the power band and house rules on a
published listing. §9.15 still applies.

### The catalogue was emptied on 15 August

Every listing document and its subcollections were deleted with
`firestore:delete listings --recursive`, ahead of a three-account test run.
**Two things that delete did not touch:** the photographs in Storage under
`listings/{uid}/...`, which are now orphaned and still billed, and the
conversations, applications and the one test payment, which now point at
listings that no longer exist and will read as broken threads.

### Test data that must be cleaned before the 29th

- A ₦9,000,000/year listing whose photos are selfies.
- A draft titled "SPACIOUS TWO BEDROOM FLAT IN YABA" whose photos are
  screenshots of PropertyGuru.
- `users/demo` holds an old FCM token.
- The Kuula link attached to 27 Herbert Macaulay Way is `https://kuula.co`, not
  a tour.

### Recommended next work, in order
1. **The three-account walkthrough** — staff, landlord, tenant. Everything
   still unverified is blocked behind one missing thing: no conversation exists
   where the test account is the *owner*, so acceptance has never been
   exercised, and acceptance gates payment, the agreement and the confirmation
   screen. Order matters: verify the landlord's email before listing, and
   enquire through the form rather than sending a plain message.
2. **Demo data.** Real photographs on the seeded listings and the junk deleted.
   The biggest visible gap and it needs no engineering.
3. **One real 360 tour**, shot and attached, so the differentiator is shown
   rather than described.
4. **Verify on hardware** what is listed as unverified above.
5. **Paystack** — set the secret, deploy the two functions, build the screen.
6. **WebRTC** — not before the 29th.

---

*Last updated: August 15, 2026 — house rules, availability, power bands, road
and landmark, text normalisation, wizard persistence, photo reordering, tour
approve/decline/escalate/resend, the tenancy agreement generator, and a
dual-role AI writing assistant all built. A security pass moved email
verification and tour host restriction into the rules and gave Storage its
first tests. 217 app tests, 93 rules tests. `refineText` is built but NOT
deployed; investor meeting 29 August, scope freeze 26 August.*
