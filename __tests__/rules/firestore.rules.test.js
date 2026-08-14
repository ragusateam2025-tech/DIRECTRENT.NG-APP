const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} = require('firebase/firestore');

/**
 * What the rules actually permit, checked against the emulator.
 *
 * Nothing else in this repo tests these. `tsc` does not see them and the app
 * cannot tell a rules rejection from a network failure, so until now the first
 * thing to validate a rules change was production. Every bug found on 30-31
 * July lived in code that talks to Firestore.
 *
 * The cases below are written as pairs wherever possible: the thing that should
 * work, and the thing that should not. A rule that allows everything passes the
 * first half of every pair perfectly.
 */

const PROJECT_ID = 'directrent-rules-test';

/** Two ordinary people and a member of staff. */
const OWNER = 'owner-uid';
const TENANT = 'tenant-uid';
const STRANGER = 'stranger-uid';
const STAFF = 'staff-uid';

let testEnv;

/** A listing as the app writes one. */
function listing(overrides = {}) {
  return {
    ownerId: OWNER,
    ownerName: 'A Property Owner',
    basicInfo: {
      title: 'Two bedroom flat',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: {
      address: '1 Somewhere Street',
      area: 'Yaba',
      lga: 'Lagos Mainland',
      marketId: 'lagos',
      state: 'Lagos',
    },
    media: { photos: [] },
    pricing: { annualRent: 1000000, cautionDepositMonths: 12, serviceCharge: 0 },
    details: { description: 'x', amenities: [], maxOccupants: 4 },
    status: { listing: 'active' },
    ownerOccupied: false,
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seeds documents with the rules switched off, so setup cannot be blocked by them. */
async function seed(writer) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await writer(context.firestore());
  });
}

describe('listings', () => {
  it('lets a signed-in tenant read an active listing', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(getDoc(doc(db, 'listings/l1')));
  });

  it('hides a draft listing from everyone but its owner', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing({ status: { listing: 'draft' } })));

    const tenantDb = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(getDoc(doc(tenantDb, 'listings/l1')));

    const ownerDb = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'listings/l1')));
  });

  it('refuses a signed-out reader', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'listings/l1')));
  });

  it('lets an owner create a listing in their own name', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(setDoc(doc(db, 'listings/new'), listing()));
  });

  it('refuses a listing attributed to someone else', async () => {
    // Without this check anyone could publish a property in another person's
    // name, and the owner would never know it existed.
    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(setDoc(doc(db, 'listings/new'), listing({ ownerId: OWNER })));
  });

  it('lets the owner change their own listing', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'listings/l1'), { 'pricing.annualRent': 1200000 }));
  });

  it('refuses a stranger changing a listing', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(updateDoc(doc(db, 'listings/l1'), { 'pricing.annualRent': 1 }));
  });

  it('refuses reassigning a listing to another account', async () => {
    // Ownership is immutable. Without this an owner could hand their listing
    // away, or take one over.
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, 'listings/l1'), { ownerId: STRANGER }));
  });

  it('lets the owner delete their own listing', async () => {
    // The other half of the pair below. Owners can now delete from the app, and
    // a rule that only ever refuses would pass every test while making the
    // feature impossible.
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'listings/l1')));
  });

  it('refuses a stranger deleting a listing', async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(deleteDoc(doc(db, 'listings/l1')));
  });
});

describe('listings — staff attaching tours', () => {
  async function seedStaffAndListing() {
    await seed(async db => {
      await setDoc(doc(db, 'listings/l1'), listing());
      await setDoc(doc(db, `users/${STAFF}`), {
        uid: STAFF,
        fullName: 'Operator',
        email: 'ops@directrent.ng',
        role: 'tenant',
        roleChosen: true,
        createdAt: 1,
        staff: true,
      });
      await setDoc(doc(db, `users/${STRANGER}`), {
        uid: STRANGER,
        fullName: 'Nobody',
        email: 'nobody@example.com',
        role: 'tenant',
        roleChosen: true,
        createdAt: 1,
      });
    });
  }

  it('lets staff attach a tour to a listing they do not own', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'listings/l1'), {
        tour: { provider: 'kuula', embedUrl: 'https://kuula.co/share/x' },
      }),
    );
  });

  it('refuses staff changing anything except the tour', async () => {
    // The whole point of the narrow clause: an operator's phone must not be a
    // master key to the catalogue.
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertFails(updateDoc(doc(db, 'listings/l1'), { 'pricing.annualRent': 1 }));
  });

  it('refuses staff smuggling a price change alongside a tour', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertFails(
      updateDoc(doc(db, 'listings/l1'), {
        tour: { provider: 'kuula', embedUrl: 'https://kuula.co/share/x' },
        'pricing.annualRent': 1,
      }),
    );
  });

  it('refuses a non-staff account attaching a tour', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(
      updateDoc(doc(db, 'listings/l1'), {
        tour: { provider: 'kuula', embedUrl: 'https://kuula.co/share/x' },
      }),
    );
  });

  /**
   * The queue has to be readable, not only writable.
   *
   * These are the cases the original tests missed. Staff could attach a tour to
   * a listing they had no permission to read, so the queue screen failed with
   * permission-denied on the device while every rules test passed — the tests
   * asserted the write and never the read that has to come first.
   *
   * The draft matters specifically. An owner ticks the tour box during the
   * wizard, before the listing is published, and Firestore fails an entire
   * query the moment one document in the result would fail. A single unowned
   * draft is enough to deny the whole screen.
   */
  async function seedQueue() {
    await seedStaffAndListing();
    await seed(db =>
      setDoc(
        doc(db, 'listings/l2'),
        listing({ tourRequested: true, status: { listing: 'draft' } }),
      ),
    );
  }

  it('lets staff list the queue, including drafts they do not own', async () => {
    await seedQueue();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertSucceeds(
      getDocs(query(collection(db, 'listings'), where('tourRequested', '==', true))),
    );
  });

  it('lets staff read a single unowned draft', async () => {
    await seedQueue();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertSucceeds(getDoc(doc(db, 'listings/l2')));
  });

  it('still refuses an ordinary account the same queue query', async () => {
    // The read had to be widened for staff without widening it for everybody,
    // which is the half of this that could quietly go wrong.
    await seedQueue();

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(
      getDocs(query(collection(db, 'listings'), where('tourRequested', '==', true))),
    );
  });

  it('still refuses an ordinary account a single unowned draft', async () => {
    await seedQueue();

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'listings/l2')));
  });

  it('lets staff approve and decline a request', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'listings/l1'), {
        tourReview: { status: 'approved', by: STAFF, at: '2026-08-14T00:00:00.000Z' },
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'listings/l1'), {
        tourReview: {
          status: 'declined',
          reason: 'We do not cover Ikorodu yet.',
          by: STAFF,
          at: '2026-08-14T00:00:00.000Z',
        },
      }),
    );
  });

  it('lets staff attach a tour and its approval in one write', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'listings/l1'), {
        tour: { provider: 'kuula', embedUrl: 'https://kuula.co/share/x' },
        tourReview: { status: 'approved', by: STAFF, at: '2026-08-14T00:00:00.000Z' },
      }),
    );
  });

  /**
   * The decision belongs to operations, not to the person being decided about.
   *
   * An owner who can write tourReview can approve their own shoot, or erase a
   * decline and go on appearing to wait — which makes the whole step theatre.
   * An owner who can write `tour` can point it at any address on the internet,
   * and that URL is loaded in a WebView inside our app.
   *
   * These are the cases the owner-update rule got wrong until the carve-out: it
   * allowed any field at all so long as ownerId did not change.
   */
  it('refuses an owner approving their own shoot', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, 'listings/l1'), {
        tourReview: { status: 'approved', by: OWNER, at: '2026-08-14T00:00:00.000Z' },
      }),
    );
  });

  it('refuses an owner erasing a decline', async () => {
    await seedStaffAndListing();
    await seed(db =>
      updateDoc(doc(db, 'listings/l1'), {
        tourReview: { status: 'declined', reason: 'Not yet', by: STAFF, at: '1' },
      }),
    );

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, 'listings/l1'), { tourReview: null }));
  });

  it('refuses an owner pointing the tour at their own address', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, 'listings/l1'), {
        tour: { provider: 'kuula', embedUrl: 'https://not-a-tour.example.com' },
      }),
    );
  });

  it('refuses an owner smuggling a decision alongside a real edit', async () => {
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, 'listings/l1'), {
        'details.description': 'A genuinely updated description',
        tourReview: { status: 'approved', by: OWNER, at: '2026-08-14T00:00:00.000Z' },
      }),
    );
  });

  it('still lets an owner make an ordinary edit', async () => {
    // The carve-out must not cost an owner the edits they are entitled to.
    await seedStaffAndListing();

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'listings/l1'), {
        'details.description': 'A genuinely updated description',
      }),
    );
  });
});

describe('users', () => {
  const profile = {
    uid: TENANT,
    fullName: 'A Tenant',
    email: 'tenant@example.com',
    role: 'tenant',
    roleChosen: false,
    createdAt: 1,
  };

  it('lets someone create and read their own profile', async () => {
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(setDoc(doc(db, `users/${TENANT}`), profile));
    await assertSucceeds(getDoc(doc(db, `users/${TENANT}`)));
  });

  it('refuses reading somebody else’s profile', async () => {
    await seed(db => setDoc(doc(db, `users/${TENANT}`), profile));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `users/${TENANT}`)));
  });

  it('lets someone edit their own name', async () => {
    await seed(db => setDoc(doc(db, `users/${TENANT}`), profile));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(updateDoc(doc(db, `users/${TENANT}`), { fullName: 'New Name' }));
  });

  it('refuses granting yourself staff at signup', async () => {
    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(
      setDoc(doc(db, `users/${STRANGER}`), { ...profile, uid: STRANGER, staff: true }),
    );
  });

  it('refuses granting yourself staff later', async () => {
    // This is the hole that existed until 10 August: `allow write` covered
    // every field, so anyone could promote themselves with a direct SDK call.
    await seed(db => setDoc(doc(db, `users/${STRANGER}`), { ...profile, uid: STRANGER }));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(updateDoc(doc(db, `users/${STRANGER}`), { staff: true }));
  });

  it('refuses removing the staff flag from your own account', async () => {
    // Same clause, other direction — the field is simply not the user's to
    // touch, so it cannot be edited in either direction.
    await seed(db => setDoc(doc(db, `users/${STAFF}`), { ...profile, uid: STAFF, staff: true }));

    const db = testEnv.authenticatedContext(STAFF).firestore();
    await assertFails(updateDoc(doc(db, `users/${STAFF}`), { staff: false }));
  });
});

describe('conversations', () => {
  const conversation = {
    id: 'c1',
    listingId: 'l1',
    landlordId: OWNER,
    tenantId: TENANT,
    participants: [OWNER, TENANT],
    landlordName: 'Owner',
    tenantName: 'Tenant',
    listingTitle: 'Two bedroom flat',
    listingArea: 'Yaba',
    lastMessage: '',
    lastMessageAt: 1,
    lastSenderId: '',
    unread: { [OWNER]: 0, [TENANT]: 0 },
    createdAt: 1,
  };

  it('lets a participant read the thread', async () => {
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(getDoc(doc(db, 'conversations/c1')));
  });

  it('lets a signed-in user read a conversation that does not exist yet', async () => {
    // Opening a conversation starts by asking whether one already exists. On a
    // missing document `resource` is null, so a rule reading
    // resource.data.participants throws — and a throw denies. This check sits
    // in front of the first message, so failing it meant an enquiry could never
    // complete. Seeded nothing on purpose.
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(getDoc(doc(db, 'conversations/does-not-exist')));
  });

  it('still refuses a stranger reading one that does exist', async () => {
    // The other half: tolerating a missing document must not soften the rule
    // for a real one.
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'conversations/c1')));
  });

  it('refuses anyone else reading it', async () => {
    // It carries both names and what they said to each other.
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'conversations/c1')));
  });

  it('refuses a thread that does not include its creator', async () => {
    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(setDoc(doc(db, 'conversations/c2'), { ...conversation, id: 'c2' }));
  });

  it('refuses changing who is in a conversation', async () => {
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(
      updateDoc(doc(db, 'conversations/c1'), { participants: [TENANT, STRANGER] }),
    );
  });

  it('lets participants update the thread summary as messages are sent', async () => {
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'conversations/c1'), {
        lastMessage: 'Hello',
        lastMessageAt: 2,
        lastSenderId: TENANT,
      }),
    );
  });

  it('lets the owner mirror an enquiry decision onto the thread', async () => {
    // This write was denied until 10 August, so the decision never reached the
    // conversation and the tenant was never told.
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'conversations/c1'), { applicationStatus: 'accepted' }),
    );
  });

  it('refuses a tenant setting the enquiry decision on the thread', async () => {
    // Matching the applications rule. A copy that can disagree with the record
    // it copies is worse than no copy, because the copy is what people read.
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(
      updateDoc(doc(db, 'conversations/c1'), { applicationStatus: 'accepted' }),
    );
  });

  it('refuses smuggling other fields alongside a decision', async () => {
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, 'conversations/c1'), {
        applicationStatus: 'accepted',
        tenantName: 'Someone else',
      }),
    );
  });

  it('refuses deleting a thread', async () => {
    await seed(db => setDoc(doc(db, 'conversations/c1'), conversation));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(deleteDoc(doc(db, 'conversations/c1')));
  });
});

describe('listing interest counters', () => {
  beforeEach(async () => {
    await seed(db => setDoc(doc(db, 'listings/l1'), listing()));
  });

  it('lets someone record their own view', async () => {
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(setDoc(doc(db, `listings/l1/views/${TENANT}`), { at: 1 }));
  });

  it('refuses recording a view as somebody else', async () => {
    // The whole reason these are documents rather than a counter: a counter
    // has to be writable by every viewer, and a number anyone can set is a
    // number nobody should believe.
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(setDoc(doc(db, `listings/l1/views/${STRANGER}`), { at: 1 }));
  });

  it('lets the owner read the interest in their property', async () => {
    await seed(db => setDoc(doc(db, `listings/l1/views/${TENANT}`), { at: 1 }));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `listings/l1/views/${TENANT}`)));
  });

  it('refuses a stranger reading who looked at a property', async () => {
    // Who is looking at which flat is nobody else's business.
    await seed(db => setDoc(doc(db, `listings/l1/views/${TENANT}`), { at: 1 }));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `listings/l1/views/${TENANT}`)));
  });

  it('refuses deleting a view, so interest cannot be erased', async () => {
    await seed(db => setDoc(doc(db, `listings/l1/views/${TENANT}`), { at: 1 }));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(deleteDoc(doc(db, `listings/l1/views/${TENANT}`)));
  });

  it('lets someone unsave, which removes their row', async () => {
    // The one counter that may go down, because unsaving is a real action.
    await seed(db => setDoc(doc(db, `listings/l1/savedBy/${TENANT}`), { at: 1 }));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(deleteDoc(doc(db, `listings/l1/savedBy/${TENANT}`)));
  });

  it('refuses removing somebody else’s save', async () => {
    await seed(db => setDoc(doc(db, `listings/l1/savedBy/${TENANT}`), { at: 1 }));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(deleteDoc(doc(db, `listings/l1/savedBy/${TENANT}`)));
  });

  it('records an enquiry once per person', async () => {
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(setDoc(doc(db, `listings/l1/enquiries/${TENANT}`), { at: 1 }));
    // Enquiring again rewrites the same document rather than adding another.
    await assertSucceeds(setDoc(doc(db, `listings/l1/enquiries/${TENANT}`), { at: 2 }));
  });
});

describe('payments', () => {
  const payment = {
    id: 'p1',
    listingId: 'l1',
    listingTitle: 'Two bedroom flat',
    tenantId: TENANT,
    ownerId: OWNER,
    amount: 2020000,
    currency: 'NGN',
    status: 'pending',
    createdAt: 1,
  };

  it('lets the tenant read their own payment', async () => {
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(getDoc(doc(db, 'payments/p1')));
  });

  it('lets the owner read a payment against their property', async () => {
    // Being told you have been paid is the point.
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, 'payments/p1')));
  });

  it('refuses anyone else reading it', async () => {
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'payments/p1')));
  });

  it('refuses a tenant creating their own payment record', async () => {
    // Amounts are decided server-side, from the listing. A client-written
    // payment is a client-chosen price.
    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(setDoc(doc(db, 'payments/p2'), { ...payment, id: 'p2' }));
  });

  it('refuses a tenant marking their own rent paid', async () => {
    // The single most valuable write to forge in the whole database.
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(updateDoc(doc(db, 'payments/p1'), { status: 'paid' }));
  });

  it('refuses the owner editing the amount', async () => {
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, 'payments/p1'), { amount: 99 }));
  });

  it('refuses deletion, so a receipt cannot be made to disappear', async () => {
    await seed(db => setDoc(doc(db, 'payments/p1'), payment));

    for (const uid of [TENANT, OWNER]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertFails(deleteDoc(doc(db, 'payments/p1')));
    }
  });
});

describe('applications', () => {
  const application = {
    id: 'a1',
    listingId: 'l1',
    landlordId: OWNER,
    tenantId: TENANT,
    tenantName: 'Tenant',
    tenantEmail: 'tenant@example.com',
    listingTitle: 'Two bedroom flat',
    listingArea: 'Yaba',
    annualRent: 1000000,
    moveIn: 'immediately',
    leaseMonths: 12,
    occupants: 2,
    message: 'Hello',
    status: 'pending',
    createdAt: 1,
  };

  it('lets both parties read it', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    for (const uid of [OWNER, TENANT]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'applications/a1')));
    }
  });

  it('refuses anyone else reading it, because it carries the tenant’s details', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'applications/a1')));
  });

  it('lets the owner accept or decline', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'applications/a1'), { status: 'accepted' }));
  });

  it('refuses the owner editing what the tenant wrote', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, 'applications/a1'), { message: 'Something else' }));
  });

  it('refuses a tenant accepting their own enquiry', async () => {
    // No access is gained by this, but the status is a record both sides rely
    // on, and a tenant marking their own enquiry accepted turns it into a lie.
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertFails(updateDoc(doc(db, 'applications/a1'), { status: 'accepted' }));
  });

  it('lets a tenant withdraw', async () => {
    // The one status that is theirs: they are taking back their own request.
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(updateDoc(doc(db, 'applications/a1'), { status: 'withdrawn' }));
  });

  it('lets a tenant correct what they wrote', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    const db = testEnv.authenticatedContext(TENANT).firestore();
    await assertSucceeds(updateDoc(doc(db, 'applications/a1'), { message: 'Rewritten' }));
  });

  it('refuses deletion by either side', async () => {
    await seed(db => setDoc(doc(db, 'applications/a1'), application));

    for (const uid of [OWNER, TENANT]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertFails(deleteDoc(doc(db, 'applications/a1')));
    }
  });
});
