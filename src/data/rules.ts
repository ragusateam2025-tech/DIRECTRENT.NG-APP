import type {
  AlterationPolicy,
  LeaseDuration,
  MoveInTiming,
  PetPolicy,
  SmokingPolicy,
} from '../types';

/**
 * The words used for house rules and availability, in one place.
 *
 * Written as a renter would say them rather than as a form would. "No pets" is
 * what somebody with a dog is scanning for; "Pet policy: NONE" makes them read
 * twice to learn the same thing.
 */

export const PET_LABELS: Record<PetPolicy, string> = {
  no_pets: 'No pets',
  cats_only: 'Cats only',
  small_pets: 'Small pets allowed',
  all_pets: 'Pets welcome',
};

export const SMOKING_LABELS: Record<SmokingPolicy, string> = {
  no_smoking: 'No smoking indoors',
  outdoor_only: 'Smoking outside only',
  allowed: 'Smoking allowed',
};

export const ALTERATION_LABELS: Record<AlterationPolicy, string> = {
  ask_first: 'Ask the owner before altering anything',
  no_alterations: 'No alterations to the property',
  allowed: 'Alterations allowed',
};

/**
 * The examples, spelled out where a tenant reads them.
 *
 * "Alterations" is a word people agree to and then breach the same week,
 * because nobody thinks of an air conditioner as an alteration until there is a
 * hole in the wall. Naming the four things that actually happen is what makes
 * the rule mean anything.
 */
export const ALTERATION_NOTE =
  'Cutting a wall for air conditioning pipes, going onto the roof for solar panels, lifting floor tiles — anything structural is agreed with the owner first.';

/**
 * Availability, in the same words the enquiry form offers a tenant.
 *
 * Phrased from the property's side — "Available now" rather than "As soon as
 * possible" — because the same underlying value means something different
 * depending on who is answering.
 */
export const AVAILABLE_FROM_LABELS: Record<MoveInTiming, string> = {
  asap: 'Available now',
  within_month: 'Available within a month',
  one_to_three_months: 'Available in one to three months',
  flexible: 'Available date is flexible',
};

export const MINIMUM_LEASE_LABELS: Record<LeaseDuration, string> = {
  6: '6 months minimum',
  12: '1 year minimum',
  24: '2 years minimum',
};

/** The order they are offered in, most permissive last. */
export const PET_OPTIONS: PetPolicy[] = ['no_pets', 'cats_only', 'small_pets', 'all_pets'];
export const SMOKING_OPTIONS: SmokingPolicy[] = ['no_smoking', 'outdoor_only', 'allowed'];
export const ALTERATION_OPTIONS: AlterationPolicy[] = [
  'ask_first',
  'no_alterations',
  'allowed',
];
export const AVAILABLE_FROM_OPTIONS: MoveInTiming[] = [
  'asap',
  'within_month',
  'one_to_three_months',
  'flexible',
];
export const MINIMUM_LEASE_OPTIONS: LeaseDuration[] = [6, 12, 24];
