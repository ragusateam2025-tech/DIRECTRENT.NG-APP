import {
  AMENITY_ALIASES,
  ALL_AMENITIES,
  canonicalAmenity,
  groupAmenities,
} from '../src/data/amenities';

describe('canonicalAmenity', () => {
  it('leaves catalogue wording alone', () => {
    expect(canonicalAmenity('Standby generator')).toBe('Standby generator');
  });

  it('resolves older wording to the facility it means', () => {
    expect(canonicalAmenity('Backup generator')).toBe('Standby generator');
    expect(canonicalAmenity('Parking for two')).toBe('Car park');
    expect(canonicalAmenity('Borehole water')).toBe('Borehole');
  });

  it('leaves genuinely unknown wording untouched', () => {
    expect(canonicalAmenity('Rooftop helipad')).toBe('Rooftop helipad');
  });

  it('points every alias at something the catalogue actually contains', () => {
    // An alias aimed at a name that no longer exists would silently send the
    // facility back to "Other" — the exact bucket aliasing exists to empty.
    for (const target of Object.values(AMENITY_ALIASES)) {
      expect(ALL_AMENITIES).toContain(target);
    }
  });

  it('never aliases a catalogue name to something else', () => {
    for (const name of Object.keys(AMENITY_ALIASES)) {
      expect(ALL_AMENITIES).not.toContain(name);
    }
  });
});

describe('groupAmenities', () => {
  it('puts catalogue facilities under their own group', () => {
    const groups = groupAmenities(['Standby generator', 'Security gate']);

    expect(groups.map(g => g.label)).toEqual(['Power & Utilities', 'Security & Safety']);
    expect(groups[0].items).toEqual(['Standby generator']);
  });

  it('drops groups with nothing in them', () => {
    const groups = groupAmenities(['Balcony']);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Outdoor & Communal');
  });

  it('files older wording under the right group', () => {
    const groups = groupAmenities(['Backup generator', '24-hour security', 'Parking space']);

    expect(groups.map(g => g.label)).toEqual([
      'Power & Utilities',
      'Security & Safety',
      'Outdoor & Communal',
    ]);
    expect(groups.some(g => g.label === 'Other')).toBe(false);
  });

  it('shows the owner’s own words, not the catalogue’s', () => {
    // Aliasing decides grouping and iconography. Rewriting what an owner wrote
    // about their property to match our vocabulary is not ours to do.
    const groups = groupAmenities(['Backup generator']);
    expect(groups[0].items).toEqual(['Backup generator']);
  });

  it('keeps unrecognised wording rather than discarding it', () => {
    const groups = groupAmenities(['Rooftop helipad']);
    expect(groups).toEqual([{ label: 'Other', items: ['Rooftop helipad'] }]);
  });

  it('drops entries that are blank or only whitespace', () => {
    expect(groupAmenities(['', '   ', '\t'])).toEqual([]);
  });

  it('trims wording before matching, so padding does not create an "Other"', () => {
    const groups = groupAmenities(['  Standby generator  ']);
    expect(groups[0].label).toBe('Power & Utilities');
    expect(groups.some(g => g.label === 'Other')).toBe(false);
  });

  it('orders a group by the catalogue, not by the listing', () => {
    // Power leads its group because it decides more Lagos rentals than a
    // water heater does, whatever order the owner happened to tick them in.
    const groups = groupAmenities(['Water heater', '24/7 power supply']);
    expect(groups[0].items).toEqual(['24/7 power supply', 'Water heater']);
  });

  it('handles the wording the seeded listings actually use', () => {
    // These six are what is in Firestore today. Every one of them used to land
    // in "Other" and show the same generic mark.
    const groups = groupAmenities([
      'Borehole water',
      'Water treatment',
      'Fitted wardrobes',
      'Both rooms en-suite',
      'Dedicated parking',
      'POP ceilings',
    ]);

    expect(groups.some(g => g.label === 'Other')).toBe(false);
  });
});
