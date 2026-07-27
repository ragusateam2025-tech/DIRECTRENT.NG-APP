# Landlord Listing Creation — Pilot

**Date:** 27 July 2026
**Status:** Approved, ready for implementation planning
**Follows:** [Tenant Vertical Slice](2026-07-25-tenant-demo-slice-design.md), delivered and verified on device

---

## 1. Purpose

Let a known, offline-vetted group of Lagos property owners publish real
listings that real tenants can browse — turning the tenant demo into a working
two-sided pilot.

This is the first build intended for **real users and real data**, which
changes the standards. The demo could afford permissive security and seeded
content. This cannot.

---

## 2. Sequencing

Three subsystems, built in this order. Each produces working software on its
own.

| Project | Scope | Status |
|---------|-------|--------|
| **A** | Secure the data model | Prerequisite — blocks B |
| **B** | Landlord listing creation | This spec's main body |
| **C** | 360 virtual tours | **Deferred** — see §9 |

---

## 3. Project A — Secure the data

### 3.1 The problem

The demo shipped with rules that were correct for seeded content and dangerous
for real users:

```
match /listings/{listingId} {
  allow read, write: if request.auth != null;
}
```

Any signed-in user can create, edit, or delete **any** listing, including one
belonging to another landlord.

### 3.2 The model

Every listing carries an `ownerId`. Authority follows ownership.

- A landlord may write only listings where `ownerId` is their own uid.
- A tenant may read only listings where `status.listing == 'active'`.
- A landlord may always read their own listings, whatever the status.
- Nobody may change a listing's `ownerId` after creation.
- Storage paths are namespaced per user; a landlord may write only under
  `listings/{their-uid}/`.

### 3.3 Rules to publish

Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listings/{listingId} {
      allow read: if request.auth != null
                  && (resource.data.status.listing == 'active'
                      || resource.data.ownerId == request.auth.uid);
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.ownerId == request.auth.uid
                            && request.resource.data.ownerId == resource.data.ownerId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /saved/{listingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /listings/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

The 2 MB ceiling is a backstop, not the target — client-side compression aims
for roughly 300 KB (§7).

---

## 4. Rollout model

**Controlled pilot.** Property owners are known to the client and vetted
offline. This deliberately defers:

- Dojah BVN/NIN identity verification (needs CAC registration; weeks of lead
  time)
- Listing moderation tooling and abuse reporting
- Fraud handling

None of these are cancelled. They are prerequisites for open signup, and open
signup is not in this scope.

### 4.1 Publishing flow

A published listing is saved with `status.listing == 'pending'` and does not
appear to tenants. An administrator flips it to `'active'` in the Firebase
console. At pilot volume this is under a minute per listing and needs no code.

The landlord sees an honest "Under review" state, so nothing looks broken.

---

## 5. Data model

Three changes to `Listing`, extending the existing shape rather than replacing
it. Field names continue to follow `createListing` in `MASTER_PRD_PART2.md`.

| Field | Change |
|-------|--------|
| `ownerId: string` | **New.** The landlord's uid. Basis of every rule in §3. |
| `status.listing` | Gains `'pending'`. Now `pending \| active \| rented \| draft`. |
| `media.photos: string[]` | **Replaces** the demo's single bundled `photoKey`. Firebase Storage download URLs, first is primary. |

### 5.1 Retiring the demo listings

The six seeded listings have no `ownerId` and would become unwritable under the
new rules.

**They will be deleted — but the ordering matters.** Deleting them empties the
tenant Browse screen until a real landlord publishes. Therefore:

1. Tuesday 28 July client demo completes — seeded listings untouched
2. Project A and B are built and verified
3. At least one pilot landlord publishes a listing and it is approved
4. **Only then** delete the six seeded listings and remove `seedListings.ts`,
   `scripts/seed.ts`, and the bundled stock photos in `assets/properties/`

Deleting before step 3 leaves the app showing an empty marketplace.

---

## 6. Screens

Four new screens, reached through the existing landlord role. The role switcher
built for the tenant slice already works and needs no change.

| Screen | Purpose |
|--------|---------|
| **My Properties** | The landlord's listings with status badges (Draft / Pending / Active / Rented). Empty state invites the first upload. |
| **Add Property** wizard | Five steps: basic info → location → photos → pricing → details. Progress indicator, back navigation, validation gating each step. |
| **Photo step** | Pick from gallery or camera. Minimum five. Reorder, set primary, delete. Per-photo upload progress. |
| **Listing Preview** | Exactly what a tenant will see, shown before publishing. |

### 6.1 Drafts

A landlord uploading five photos over Lagos mobile data may lose the app,
the connection, or the battery partway through. Losing the form at that point
is the kind of friction that stops a pilot landlord coming back.

**A draft document is created in Firestore as soon as step 1 is valid**, with
`status.listing == 'draft'`. From that moment every step writes through to it,
so progress survives the app being killed.

- Leaving the wizard prompts "Save as draft?" — saving keeps the document,
  discarding deletes it and its uploaded photos.
- My Properties lists drafts first, badged "Draft", with a "Continue" action
  that reopens the wizard at the furthest completed step.
- Publishing validates the whole listing, then flips `status.listing` to
  `'pending'`. A draft can never reach tenants: §3 restricts tenant reads to
  `active`.

This also simplifies photo handling — see §7.

### 6.2 Cut from `FEATURE_SPEC_PART2`

- **Market price comparison.** It displays an area average and comparable
  count. With a pilot's handful of properties those figures would be derived
  from too little data and would mislead. Revisit once there is inventory.
- **Map pin confirmation.** Needs a maps dependency and API key. Typed address
  plus area selection is sufficient for a pilot.

---

## 7. Photo pipeline

The riskiest part of the build, because it meets Lagos mobile data.

**Compress on the device before upload.** Cap the long edge at 1600px and
target roughly 300 KB per image. Five photos then cost about 1.5 MB instead of
25 MB of raw camera output.

The alternative — upload originals and process in a Cloud Function — gives
better quality but requires the Blaze billing plan, adds per-upload server
cost, and still makes the landlord push 25 MB over a weak connection first. For
a pilot, client-side compression wins.

Drafts (§6.1) make this materially safer. The listing's document ID is
generated **before** the wizard starts, so photos have a home from the first
step and upload as they are picked, rather than in one batch at the end.

Rules:

- Photos upload one at a time, with visible per-photo progress
- A failed photo is retryable without restarting the form
- Uploads land in `listings/{ownerId}/{listingId}/{index}.jpg`
- Each successful upload appends its URL to the draft immediately, so a
  killed app loses at most the one photo in flight
- **Publishing** — not saving — is what enforces the five-photo minimum, so a
  draft may legitimately hold fewer
- A published listing therefore never references a missing image, because
  publish validates the photo array before flipping status

---

## 8. Native dependencies

Two new native modules, so **a native rebuild is required**:

- `expo-image-picker` — gallery and camera access
- `@react-native-firebase/storage` — photo upload

**Firebase Storage must be enabled** in the `directrent-prod` console. It is
not currently on.

Budget a full hour for the rebuild step. Every native build on this machine has
found a new failure mode: stale Gradle artifacts, memory exhaustion at 8 GB, a
wedged adb daemon, and Metro workers that could not be terminated. The fixes
are recorded in `metro.config.js` and `android/gradle.properties`, but the
build remains the least predictable part of this project.

---

## 9. Project C — 360 virtual tours (deferred)

An open-source viewer is the straightforward part. [Photo Sphere
Viewer](https://photo-sphere-viewer.js.org/) and Panolens are both MIT-licensed
and render acceptably inside a WebView.

**The blocker is not the viewer — it is the photographs.** These libraries
display *equirectangular* images, which require a 360 camera or a phone app
that stitches a panorama. A landlord uploading ordinary phone photos produces
nothing a 360 viewer can show.

### 9.1 Capture model (decided)

Subject to funding, capture is **centralised, not crowdsourced**: the company
buys a 360 camera and a laptop, and employs a trained operator who visits
listings judged worth the trip and shoots the full apartment. Lagos-only
operation makes this practical.

This is the stronger model, and it simplifies the build considerably:

- One camera, one operator, one process — consistent quality and guaranteed
  equirectangular output
- **No capture UX in the app.** Landlords never shoot, upload, or troubleshoot
  a panorama, so there is nothing to validate or reject
- Tours attach to a listing through an administrator, not the landlord
- Tours become a quality signal on selected inventory rather than a universal
  requirement, so `virtualTourUrl` stays optional and the no-tour path stays
  the default

### 9.2 Open questions before this is scheduled

**Linked tour or single sphere?** "The full apartment" implies one panorama per
room, connected by hotspots so a tenant can walk between them. Photo Sphere
Viewer's virtual-tour plugin supports linked nodes, but this adds a node graph,
hotspot authoring, and an assembly step to the operator's job. A single
sphere per listing is far simpler and may be enough to start.

**Payload size is the hard constraint, and it is a Lagos constraint.** A good
equirectangular frame is 6000×3000 and 3–8 MB; six rooms exceeds 30 MB. That is
the same mobile-data problem that drove listing photos down to ~300 KB (§7),
an order of magnitude worse. Mitigations: cap panoramas at 4096×2048, load
rooms on demand rather than upfront, and show a low-resolution preview first.
The tour will remain the heaviest thing in the app.

**Hosting.** Self-hosting (panoramas in Firebase Storage, rendered by Photo
Sphere Viewer in a WebView) fits a team investing in owning the capability, and
avoids a subscription and an external dependency. Third-party hosts (Kuula,
Momento360) need almost no engineering but put the tours on someone else's
platform. Recommendation: self-host. `virtualTourUrl` accommodates either.

`MASTER_PRD.md` already reserves `virtualTourUrl: string | null` on the listing
schema, so adding this later requires no migration. It also places Virtual Tour
Integration in Phase 3 (P2) — that ordering is correct, and this spec does not
disturb it.

---

## 10. Acceptance criteria

Verified on the physical device, as with the tenant slice:

1. A landlord signs up, selects the landlord role, and reaches My Properties.
2. My Properties shows an empty state before any listing exists.
3. The Add Property wizard advances through all five steps, and each step
   blocks progress until its required fields are valid.
4. Fewer than five photos blocks the photo step with a clear message.
5. Photos compress before upload; a five-photo listing transfers under 2 MB
   total.
6. A failed photo upload can be retried without re-entering the form.
7. Force-quitting the app mid-wizard and reopening it shows the listing in My
   Properties badged "Draft", and "Continue" resumes at the furthest completed
   step with previously uploaded photos intact.
8. Discarding a draft deletes both its document and its uploaded photos.
9. A draft is never visible to a tenant, at any stage.
10. Publishing creates a listing with `status.listing == 'pending'` and
    `ownerId` equal to the landlord's uid.
11. The listing appears in My Properties marked "Under review" and does **not**
    appear in tenant Browse.
12. After an administrator flips status to `active` in the console, the listing
    appears in tenant Browse with its photos.
13. A second landlord account cannot read, edit, or delete the first
    landlord's draft or pending listing.
14. Tenant-side savings arithmetic is correct for the landlord's entered rent.
15. Every naira figure uses the literal `₦` with comma formatting.

Criterion 13 is the one that matters most. It is the difference between a
demo and something real people can trust with their property.

---

## 11. Known risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Native rebuild fails again | High | Budget an hour; fixes already recorded in repo |
| Photo upload fails on poor connection | High | Client-side compression, per-photo retry, each upload appended to the draft immediately |
| Landlord loses form progress mid-upload | Medium | Drafts write through from step 1; at most one in-flight photo is lost |
| Abandoned drafts accumulate in Firestore and Storage | Low | Pilot volume makes this negligible; revisit with a cleanup job if it grows |
| Demo listings deleted too early, app looks empty | Medium | Explicit ordering in §5.1 |
| Storage costs grow unexpectedly | Low | 2 MB rule ceiling; compression targets ~300 KB |
| Pilot expands to open signup without verification | High | §4 is explicit that open signup needs identity verification first |

---

## 12. What this is not

This does not make Directrent.ng open to the public. There is no identity
verification, no listing moderation beyond one administrator's judgement, no
payments, no escrow, and no lease generation.

It is a genuine two-sided pilot with a known set of property owners, and it
should be described to them as exactly that. The escrow and regulatory
questions raised earlier remain unresolved and remain the largest constraint on
going further.
