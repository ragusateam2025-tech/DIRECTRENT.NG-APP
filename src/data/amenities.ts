// The facilities an owner can advertise, grouped the way a renter reads them.
//
// Previously a flat list of twelve. A flat list makes an owner scan the whole
// set to find one item, and makes a tenant read thirty chips with no shape.
// Grouping answers the questions people actually arrive with — will the power
// hold, is it secure, is there water — rather than listing features
// alphabetically and leaving them to sort it out.
//
// Order within each group is roughly by how often it decides a Lagos rental.
// Power and water lead their groups for that reason.

export interface AmenityGroup {
  id: string;
  label: string;
  items: string[];
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    id: 'power_utilities',
    label: 'Power & Utilities',
    items: [
      '24/7 power supply',
      'Standby generator',
      'Prepaid meter',
      'Solar backup',
      'Inverter',
      'Borehole',
      'Treated water',
      'Water heater',
    ],
  },
  {
    id: 'security_safety',
    label: 'Security & Safety',
    items: [
      'Security gate',
      'Security / gateman',
      'CCTV surveillance',
      'Perimeter fencing',
      'Electric fence',
      'Burglar proof',
      'Fire safety',
      'Intercom',
    ],
  },
  {
    id: 'interior_finishing',
    label: 'Interior & Finishing',
    items: [
      'Fitted kitchen',
      'Built-in wardrobes',
      'En-suite bedrooms',
      'POP ceiling',
      'Tiled floors',
      'Air conditioning',
      'Furnished',
      'Guest toilet',
      'Laundry space',
    ],
  },
  {
    id: 'outdoor_communal',
    label: 'Outdoor & Communal',
    items: [
      'Car park',
      'Balcony',
      'Landscaped garden',
      'Swimming pool',
      'Gym',
      'Clubhouse',
      'Playground',
      'Outdoor lighting',
      'Drop-off point',
      'Jogging track',
      'Multi-purpose hall',
      'Serviced compound',
    ],
  },
];

/** Every amenity, flat — for validation and for listings saved before grouping. */
export const ALL_AMENITIES: string[] = AMENITY_GROUPS.flatMap(g => g.items);

/**
 * Older wording, mapped to the catalogue entry that means the same thing.
 *
 * Listings written before this catalogue say "Backup generator" where it says
 * "Standby generator", and "Parking for two" where it says "Car park". They are
 * the same facility described by a different hand, but a literal comparison
 * calls them unknown — so they fell into "Other", a bucket with no group and no
 * icon, and a renter saw a generator listed as though nobody knew what it was.
 *
 * Aliasing decides two things: which group an item belongs to, and which icon
 * it gets. It deliberately does NOT change the words on screen — the owner's
 * own phrasing is what the tenant reads, because rewriting what someone wrote
 * about their property to match our vocabulary is not ours to do.
 */
export const AMENITY_ALIASES: Record<string, string> = {
  // Power & Utilities
  'Backup generator': 'Standby generator',
  Generator: 'Standby generator',
  'Borehole water': 'Borehole',
  'Water treatment': 'Treated water',
  'Constant power': '24/7 power supply',

  // Security & Safety
  '24-hour security': 'Security / gateman',
  '24 hour security': 'Security / gateman',
  Gateman: 'Security / gateman',
  CCTV: 'CCTV surveillance',

  // Interior & Finishing
  'Fitted wardrobes': 'Built-in wardrobes',
  Wardrobes: 'Built-in wardrobes',
  'En-suite bathroom': 'En-suite bedrooms',
  'Both rooms en-suite': 'En-suite bedrooms',
  'All rooms en-suite': 'En-suite bedrooms',
  'POP ceilings': 'POP ceiling',

  // Outdoor & Communal
  Parking: 'Car park',
  'Parking space': 'Car park',
  'Dedicated parking': 'Car park',
  'Parking for two': 'Car park',
  'Car parking': 'Car park',
};

/** The catalogue name for a facility, whatever wording the listing used. */
export function canonicalAmenity(amenity: string): string {
  return AMENITY_ALIASES[amenity] ?? amenity;
}

/**
 * Splits a listing's amenities into the groups it actually has, dropping empty
 * ones so a property with no communal facilities shows no communal heading.
 *
 * Anything unrecognised is kept under "Other" rather than silently discarded:
 * listings created before this catalogue existed carry wording that is no
 * longer in it, and dropping those would quietly delete what an owner wrote.
 *
 * Entries that are blank or only whitespace are the exception, and they are
 * dropped. There is nothing for a renter to read and nothing for an icon to
 * mean, so a nameless amenity produced a row that was pure noise.
 */
export function groupAmenities(
  amenities: string[],
): Array<{ label: string; items: string[] }> {
  const named = amenities.map(a => a.trim()).filter(a => a.length > 0);

  // The owner's wording is kept for display; the catalogue name it resolves to
  // decides the group and the icon.
  const pairs = named.map(label => ({ label, canonical: canonicalAmenity(label) }));

  const grouped = AMENITY_GROUPS.map(group => ({
    label: group.label,
    // Iterating the catalogue rather than the listing keeps each group in the
    // order the catalogue defines, which is roughly how much the facility
    // decides a Lagos rental.
    items: group.items.flatMap(item =>
      pairs.filter(p => p.canonical === item).map(p => p.label),
    ),
  })).filter(group => group.items.length > 0);

  const known = new Set(ALL_AMENITIES);
  const other = pairs.filter(p => !known.has(p.canonical)).map(p => p.label);
  if (other.length > 0) grouped.push({ label: 'Other', items: other });

  return grouped;
}
