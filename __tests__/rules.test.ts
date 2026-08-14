import {
  ALTERATION_LABELS,
  ALTERATION_NOTE,
  ALTERATION_OPTIONS,
  AVAILABLE_FROM_LABELS,
  AVAILABLE_FROM_OPTIONS,
  MINIMUM_LEASE_LABELS,
  MINIMUM_LEASE_OPTIONS,
  PET_LABELS,
  PET_OPTIONS,
  SMOKING_LABELS,
  SMOKING_OPTIONS,
} from '../src/data/rules';

/**
 * The labels are typed `Record<Policy, string>`, so a missing label will not
 * compile. What will compile is a policy that has a label and never appears in
 * the options array — the owner is simply never offered it, silently, and the
 * only symptom is a choice nobody can make.
 */
describe('every policy that has a label is offered as a choice', () => {
  const sets = [
    ['pets', PET_OPTIONS, PET_LABELS],
    ['smoking', SMOKING_OPTIONS, SMOKING_LABELS],
    ['alterations', ALTERATION_OPTIONS, ALTERATION_LABELS],
    ['available from', AVAILABLE_FROM_OPTIONS, AVAILABLE_FROM_LABELS],
    ['minimum lease', MINIMUM_LEASE_OPTIONS, MINIMUM_LEASE_LABELS],
  ] as const;

  it.each(sets)('%s offers every option exactly once', (_name, options, labels) => {
    expect([...options].map(String).sort()).toEqual(Object.keys(labels).sort());
  });
});

describe('the alterations rule', () => {
  /**
   * The whole value of this rule is the examples. "No alterations" is a phrase
   * people agree to and breach the same week, because nobody thinks of an air
   * conditioner as an alteration until there is a hole in the wall.
   */
  it('names the things that actually happen, not the abstraction', () => {
    expect(ALTERATION_NOTE).toMatch(/air conditioning/i);
    expect(ALTERATION_NOTE).toMatch(/solar/i);
    expect(ALTERATION_NOTE).toMatch(/tiles/i);
  });

  it('defaults to asking rather than forbidding', () => {
    // A blanket no is the wrong default: tenants do reasonably want air
    // conditioning, and an owner who is asked usually says yes. Forbidding
    // outright is what pushes people to do it without telling anybody.
    expect(ALTERATION_OPTIONS[0]).toBe('ask_first');
  });
});
