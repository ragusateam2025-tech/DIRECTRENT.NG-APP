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
 * Splits a listing's amenities into the groups it actually has, dropping empty
 * ones so a property with no communal facilities shows no communal heading.
 *
 * Anything unrecognised is kept under "Other" rather than silently discarded:
 * listings created before this catalogue existed carry wording that is no
 * longer in it, and dropping those would quietly delete what an owner wrote.
 */
export function groupAmenities(
  amenities: string[],
): Array<{ label: string; items: string[] }> {
  const grouped = AMENITY_GROUPS.map(group => ({
    label: group.label,
    items: group.items.filter(item => amenities.includes(item)),
  })).filter(group => group.items.length > 0);

  const known = new Set(ALL_AMENITIES);
  const other = amenities.filter(a => !known.has(a));
  if (other.length > 0) grouped.push({ label: 'Other', items: other });

  return grouped;
}
