/**
 * Where a listing's photograph is stored.
 *
 * Pure, and in `lib` rather than `services`, so it can be tested: anything
 * importing `services/landlord.ts` drags in the native Firestore module, which
 * cannot load under Jest.
 */

/**
 * A storage path that cannot collide with an existing photo.
 *
 * Photos used to be named by their position in the array — 0.jpg, 1.jpg — which
 * held only until one was removed. Remove the middle of three and the array is
 * two long while the survivor is still 2.jpg; add another and its index is 2,
 * so the upload overwrote a photo the listing was still showing. The owner got
 * the same picture twice and lost the original.
 *
 * Position is a property of the array, not of the file. The array already
 * records order, so the file only needs a name nothing else will ever take.
 */
export function photoStoragePath(ownerId: string, listingId: string): string {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `listings/${ownerId}/${listingId}/${unique}.jpg`;
}
