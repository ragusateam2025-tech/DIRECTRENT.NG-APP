import {
  businessDaysBetween,
  daysUntilEscalation,
  ESCALATION_DAYS,
  mayEscalate,
} from '../src/lib/businessDays';

/** Local-time dates, because that is what the app compares against. */
function at(iso: string): Date {
  return new Date(iso);
}

// 2026-08-14 is a Friday. Everything below is anchored to it so the weekday
// arithmetic can be read without a calendar.
const FRIDAY = '2026-08-14T10:00:00';
const SATURDAY = '2026-08-15T10:00:00';
const SUNDAY = '2026-08-16T10:00:00';
const MONDAY = '2026-08-17T10:00:00';
const TUESDAY = '2026-08-18T10:00:00';
const WEDNESDAY = '2026-08-19T10:00:00';

describe('counting working days', () => {
  it('counts nothing on the same day', () => {
    // An approval at nine and a look at five is not a day of waiting.
    expect(businessDaysBetween(at(FRIDAY), at('2026-08-14T17:00:00'))).toBe(0);
  });

  it('skips the weekend', () => {
    // Friday to Monday is one working day, not three. This is the case that
    // makes a naive day-count tell a Friday approval it is late on Monday.
    expect(businessDaysBetween(at(FRIDAY), at(MONDAY))).toBe(1);
  });

  it('counts a weekend as zero on its own', () => {
    expect(businessDaysBetween(at(SATURDAY), at(SUNDAY))).toBe(0);
  });

  it('counts consecutive weekdays one at a time', () => {
    expect(businessDaysBetween(at(MONDAY), at(TUESDAY))).toBe(1);
    expect(businessDaysBetween(at(MONDAY), at(WEDNESDAY))).toBe(2);
  });

  it('counts a full week as five', () => {
    expect(businessDaysBetween(at(MONDAY), at('2026-08-24T10:00:00'))).toBe(5);
  });

  it('returns zero when the clock runs backwards', () => {
    // A device clock behind the server's. A negative count would compare as
    // under the threshold anyway, but it would also render as "-2 days".
    expect(businessDaysBetween(at(MONDAY), at(FRIDAY))).toBe(0);
  });

  it('survives a date it cannot parse', () => {
    expect(businessDaysBetween(new Date('nonsense'), at(MONDAY))).toBe(0);
  });
});

describe('when an owner may chase a shoot', () => {
  it('refuses before three working days have passed', () => {
    expect(mayEscalate(FRIDAY, at(MONDAY))).toBe(false);
    expect(mayEscalate(FRIDAY, at(TUESDAY))).toBe(false);
  });

  it('allows once three working days have passed', () => {
    // Friday approval, Wednesday chase: Mon, Tue, Wed.
    expect(mayEscalate(FRIDAY, at(WEDNESDAY))).toBe(true);
  });

  it('does not let a weekend bring the day forward', () => {
    // The whole reason for counting working days. Approved Friday, and by
    // Monday a plain calendar count would already say three.
    expect(businessDaysBetween(at(FRIDAY), at(MONDAY))).toBeLessThan(ESCALATION_DAYS);
    expect(mayEscalate(FRIDAY, at(MONDAY))).toBe(false);
  });

  it('refuses when nothing was ever approved', () => {
    expect(mayEscalate(null, at(WEDNESDAY))).toBe(false);
    expect(mayEscalate(undefined, at(WEDNESDAY))).toBe(false);
  });

  it('refuses on an unparseable approval date rather than throwing', () => {
    // A malformed timestamp must not hand somebody an escalation button, and
    // must not crash the screen either.
    expect(mayEscalate('not a date', at(WEDNESDAY))).toBe(false);
  });
});

describe('the countdown shown to the owner', () => {
  it('starts at the full threshold', () => {
    expect(daysUntilEscalation(FRIDAY, at(FRIDAY))).toBe(ESCALATION_DAYS);
  });

  it('falls as working days pass', () => {
    expect(daysUntilEscalation(FRIDAY, at(MONDAY))).toBe(2);
    expect(daysUntilEscalation(FRIDAY, at(TUESDAY))).toBe(1);
  });

  it('never goes below zero', () => {
    expect(daysUntilEscalation(FRIDAY, at('2026-09-30T10:00:00'))).toBe(0);
  });
});
