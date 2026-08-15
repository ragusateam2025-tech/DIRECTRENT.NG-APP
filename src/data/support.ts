/**
 * The official line for 360 tour operations.
 *
 * A dedicated company contact, never an individual operator's personal number.
 * An owner chasing a shoot should reach whoever is on duty, and a staff member
 * should not be carrying customer calls on their own phone for a job they may
 * have handed on.
 *
 * Shown to an owner only once a shoot is genuinely overdue — see
 * `src/lib/businessDays.ts` for when that is. Publishing it on every approved
 * request would turn a support line into a general enquiries desk.
 */
export const TOUR_SUPPORT = {
  email: 'tours@directrent.ng',
  /**
   * **Not yet set.** Fill this in with the real operations line, normalised to
   * +234XXXXXXXXXX, and the call button appears on its own.
   *
   * Deliberately empty rather than a plausible-looking placeholder: a made-up
   * Nigerian mobile number is somebody's real number, and an owner who is
   * already annoyed enough to be chasing us is exactly the person who would
   * ring it.
   */
  phone: '' as string,
};

/** Whether there is a number to offer. */
export function hasTourSupportPhone(): boolean {
  return TOUR_SUPPORT.phone.trim().length > 0;
}
