const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
} = require('firebase/storage');

/**
 * What the Storage rules actually permit.
 *
 * These had no tests at all until now, which is how the same mistake reached
 * production twice: `allow write` covers create, update *and* delete, and the
 * size and content-type checks written beside it read `request.resource`, which
 * is null on a delete. Every deletion was refused, in both firestore.rules and
 * here — and nothing reported it, because `deletePhoto` and `discardDraft` both
 * swallow storage errors by design so a failed cleanup cannot block an owner
 * mid-form. The only visible symptom was a storage bill.
 *
 * So every rule below is tested in both directions, and deletion is tested on
 * every path that has one. A rule that refuses everything passes half of these
 * perfectly.
 */

const PROJECT_ID = 'directrent-storage-test';

const OWNER = 'owner-uid';
const STRANGER = 'stranger-uid';

/** A tiny valid payload. Content type is what the rules actually inspect. */
const BYTES = new Uint8Array([1, 2, 3, 4]);
const IMAGE = { contentType: 'image/jpeg' };

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

/** Puts a file in place with the rules off, so setup cannot be blocked by them. */
async function seed(filePath) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await uploadBytes(ref(context.storage(), filePath), BYTES, IMAGE);
  });
}

describe('listing photographs', () => {
  const MINE = `listings/${OWNER}/l1/photo.jpg`;

  it('lets an owner upload under their own uid', async () => {
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertSucceeds(uploadBytes(ref(storage, MINE), BYTES, IMAGE));
  });

  it('refuses an upload into someone else’s folder', async () => {
    // The whole point of namespacing photos by uid: one account must not be
    // able to overwrite another's property photographs.
    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(uploadBytes(ref(storage, MINE), BYTES, IMAGE));
  });

  it('refuses a file that is not an image', async () => {
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertFails(
      uploadBytes(ref(storage, MINE), BYTES, { contentType: 'application/pdf' }),
    );
  });

  it('refuses a file over the size ceiling', async () => {
    // A backstop against a client that skips compression. The app aims for
    // roughly 300 KB; this is the 2 MB wall behind that.
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertFails(uploadBytes(ref(storage, MINE), big, IMAGE));
  });

  it('lets any signed-in user read a photograph', async () => {
    // Tenants have to see them, and they are not secret.
    await seed(MINE);

    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertSucceeds(getBytes(ref(storage, MINE)));
  });

  it('refuses a signed-out reader', async () => {
    await seed(MINE);

    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(storage, MINE)));
  });

  /**
   * The case this file exists for.
   *
   * Deletion is the operation that silently broke, twice, because it shared a
   * rule with checks that cannot run on a delete.
   */
  it('lets an owner delete their own photograph', async () => {
    await seed(MINE);

    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertSucceeds(deleteObject(ref(storage, MINE)));
  });

  it('refuses a stranger deleting a photograph', async () => {
    await seed(MINE);

    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(deleteObject(ref(storage, MINE)));
  });
});

describe('profile pictures', () => {
  const MINE = `avatars/${OWNER}.jpg`;

  it('lets somebody set their own picture', async () => {
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertSucceeds(uploadBytes(ref(storage, MINE), BYTES, IMAGE));
  });

  it('refuses replacing somebody else’s face', async () => {
    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(uploadBytes(ref(storage, MINE), BYTES, IMAGE));
  });

  it('refuses an avatar that is not an image', async () => {
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertFails(
      uploadBytes(ref(storage, MINE), BYTES, { contentType: 'text/html' }),
    );
  });

  it('refuses an avatar over its tighter ceiling', async () => {
    // An avatar displays at 96px, so anything near a megabyte means the
    // compression step was skipped.
    const big = new Uint8Array(1024 * 1024 + 1);
    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertFails(uploadBytes(ref(storage, MINE), big, IMAGE));
  });

  /**
   * The latent version of the same bug.
   *
   * `allow write` on avatars covers delete and checks `request.resource.size`,
   * which is null on a delete. It works only because a separate `allow delete`
   * sits beneath it and rules are OR'd. That is luck holding it up, not design,
   * and nothing would have told us if the second clause were ever removed.
   */
  it('lets somebody remove their own picture', async () => {
    await seed(MINE);

    const storage = testEnv.authenticatedContext(OWNER).storage();
    await assertSucceeds(deleteObject(ref(storage, MINE)));
  });

  it('refuses a stranger removing somebody’s picture', async () => {
    await seed(MINE);

    const storage = testEnv.authenticatedContext(STRANGER).storage();
    await assertFails(deleteObject(ref(storage, MINE)));
  });
});
