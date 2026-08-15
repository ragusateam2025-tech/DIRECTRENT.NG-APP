/**
 * Counting working days, for deciding when a shoot is overdue.
 *
 * Monday to Friday. Nigerian public holidays are deliberately not modelled:
 * the list moves every year, two of the biggest are set by moon sighting and
 * announced days ahead, and a hardcoded table would be quietly wrong within
 * twelve months. Being wrong in the owner's favour by a day is the right way to
 * be wrong — the cost is that we occasionally invite a chase we could have
 * deferred, which is better than telling somebody to keep waiting.
 */

/** Saturday and Sunday. */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Whole working days between two instants.
 *
 * Counts the days that have *passed*, not the calendar squares touched: an
 * approval on Monday afternoon and a look on Tuesday morning is one day, not
 * two. Anything else would let an owner escalate before a single working day
 * had actually gone by.
 *
 * Returns 0 when `to` is before `from`, which happens whenever a device clock
 * is behind the server's. A negative count would compare as less than the
 * threshold anyway, but returning it invites somebody to render "-2 days".
 */
export function businessDaysBetween(from: Date, to: Date): number {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) return 0;
  if (!(to instanceof Date) || Number.isNaN(to.getTime())) return 0;
  if (to <= from) return 0;

  let count = 0;
  // Walks from the day after the start, so a same-day check is zero. The
  // cursor is normalised to midnight to avoid drifting on a clock change.
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count += 1;
  }

  return count;
}

/**
 * How long an approved shoot may go unvisited before the owner may chase.
 *
 * Three working days. Long enough that a Friday approval does not have somebody
 * complaining on Monday morning, short enough that an owner is not left
 * wondering for a fortnight.
 */
export const ESCALATION_DAYS = 3;

/**
 * Whether an approved request has gone unanswered long enough to chase.
 *
 * `now` is passed rather than read so the decision is testable and so a screen
 * can render the same answer twice without it changing underneath.
 */
export function mayEscalate(approvedAt: string | undefined | null, now: Date): boolean {
  if (!approvedAt) return false;

  const approved = new Date(approvedAt);
  if (Number.isNaN(approved.getTime())) return false;

  return businessDaysBetween(approved, now) >= ESCALATION_DAYS;
}

/**
 * Working days remaining before chasing becomes available.
 *
 * Zero once the threshold is reached. Shown to the owner so the wait has a
 * visible end — "we will be in touch" with no number attached is what makes
 * somebody assume they have been forgotten.
 */
export function daysUntilEscalation(
  approvedAt: string | undefined | null,
  now: Date,
): number {
  if (!approvedAt) return ESCALATION_DAYS;

  const approved = new Date(approvedAt);
  if (Number.isNaN(approved.getTime())) return ESCALATION_DAYS;

  return Math.max(0, ESCALATION_DAYS - businessDaysBetween(approved, now));
}
