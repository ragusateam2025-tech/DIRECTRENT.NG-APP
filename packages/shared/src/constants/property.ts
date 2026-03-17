export const PROPERTY_TYPES = [
  { id: 'self_contained', label: 'Self Contained', description: 'Single room with private bathroom' },
  { id: 'mini_flat', label: 'Mini Flat', description: '1 bedroom apartment' },
  { id: 'one_bedroom', label: '1 Bedroom Flat', description: 'Standard 1BR apartment' },
  { id: 'two_bedroom', label: '2 Bedroom Flat', description: 'Standard 2BR apartment' },
  { id: 'three_bedroom', label: '3 Bedroom Flat', description: 'Standard 3BR apartment' },
  { id: 'duplex', label: 'Duplex', description: 'Multi-level house' },
  { id: 'bungalow', label: 'Bungalow', description: 'Single-story house' },
  { id: 'boys_quarters', label: 'Boys Quarters (BQ)', description: 'Detached service apartment' },
] as const;

export const AMENITIES = [
  '24hr Electricity (Estate Power)',
  'Prepaid Meter',
  'Borehole Water',
  'Security (Gateman)',
  'CCTV',
  'Parking Space',
  'Boys Quarters',
  'Generator Backup',
  'Tarred Road Access',
  'Street Lights',
  'Waste Disposal',
  'Proximity to BRT',
] as const;
