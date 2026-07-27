import type { Listing } from '../types';

/**
 * Bundled property images, keyed by Listing.media.photoKey.
 *
 * require() paths must be static — React Native resolves them at build time,
 * so these cannot be built from a variable.
 *
 * Sources: Pexels, licensed for commercial use with no attribution required.
 * These are placeholders for real Lagos property photography — swap the files
 * in assets/properties/ and the keys below stay the same.
 *
 * Bundling rather than fetching means images never depend on the network,
 * so a demo cannot be undone by bad venue wifi. If a value is undefined,
 * PropertyCard and ListingDetailScreen fall back to a branded placeholder.
 */
export const PROPERTY_IMAGES: Record<string, number | undefined> = {
  'property-1': require('../../assets/properties/property-1.jpg'),
  'property-2': require('../../assets/properties/property-2.jpg'),
  'property-3': require('../../assets/properties/property-3.jpg'),
  'property-4': require('../../assets/properties/property-4.jpg'),
  'property-5': require('../../assets/properties/property-5.jpg'),
  'property-6': require('../../assets/properties/property-6.jpg'),
};

export const SEED_LISTINGS: Listing[] = [
  {
    id: 'yaba-selfcon-01',
    basicInfo: {
      title: 'Bright self-contained near Yaba College',
      propertyType: 'self_contained',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'unfurnished',
    },
    location: { address: '12 Alagomeji Street, Yaba', area: 'Yaba', lga: 'Lagos Mainland' },
    media: { photoKey: 'property-1' },
    pricing: { annualRent: 450000, cautionDepositMonths: 6, serviceCharge: 25000 },
    details: {
      description:
        'A clean, well-lit self-contained apartment a short walk from Yaba College of Technology. Tiled throughout, with a private bathroom and kitchenette. Prepaid meter installed, and the compound has a borehole so water is steady.',
      amenities: ['Prepaid meter', 'Borehole water', 'Tiled floors', 'Security gate'],
      maxOccupants: 2,
    },
    status: { listing: 'active' },
  },
  {
    id: 'yaba-minif-02',
    basicInfo: {
      title: 'Mini flat with balcony, Sabo Yaba',
      propertyType: 'mini_flat',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'semi_furnished',
    },
    location: { address: '5 Akinwunmi Street, Sabo, Yaba', area: 'Yaba', lga: 'Lagos Mainland' },
    media: { photoKey: 'property-2' },
    pricing: { annualRent: 750000, cautionDepositMonths: 12, serviceCharge: 40000 },
    details: {
      description:
        'Mini flat on the first floor with a private balcony overlooking a quiet street. Comes with fitted wardrobes and kitchen cabinets. Ten minutes from the Yaba bus stop and walking distance to the market.',
      amenities: ['Balcony', 'Fitted wardrobes', 'Prepaid meter', 'Parking space'],
      maxOccupants: 3,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-1bed-03',
    basicInfo: {
      title: 'One bedroom apartment off Adeniran Ogunsanya',
      propertyType: 'one_bedroom',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'unfurnished',
    },
    location: { address: '28 Ogunlana Drive, Surulere', area: 'Surulere', lga: 'Surulere' },
    media: { photoKey: 'property-3' },
    pricing: { annualRent: 900000, cautionDepositMonths: 12, serviceCharge: 50000 },
    details: {
      description:
        'Spacious one bedroom in a well-maintained block just off Adeniran Ogunsanya. Separate living area, en-suite bathroom, and a dedicated kitchen. The estate has a generator for common areas and 24-hour security.',
      amenities: ['24-hour security', 'Backup generator', 'En-suite bathroom', 'Water treatment'],
      maxOccupants: 3,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-2bed-04',
    basicInfo: {
      title: 'Two bedroom flat, quiet Surulere street',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: { address: '14 Shitta Street, Surulere', area: 'Surulere', lga: 'Surulere' },
    media: { photoKey: 'property-4' },
    pricing: { annualRent: 1000000, cautionDepositMonths: 12, serviceCharge: 60000 },
    details: {
      description:
        'Two bedroom flat with both rooms en-suite, on a quiet residential street. Recently repainted with new plumbing throughout. Close to National Stadium and easy access to Ojuelegba.',
      amenities: ['Both rooms en-suite', 'Prepaid meter', 'Parking', 'Security gate'],
      maxOccupants: 4,
    },
    status: { listing: 'active' },
  },
  {
    id: 'yaba-2bed-05',
    basicInfo: {
      title: 'Two bedroom, newly built, Herbert Macaulay',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'semi_furnished',
    },
    location: { address: '90 Herbert Macaulay Way, Yaba', area: 'Yaba', lga: 'Lagos Mainland' },
    media: { photoKey: 'property-5' },
    pricing: { annualRent: 1400000, cautionDepositMonths: 12, serviceCharge: 80000 },
    details: {
      description:
        'Newly built two bedroom on Herbert Macaulay Way, finished to a high standard with POP ceilings and fitted kitchen. Serviced compound with a shared generator and dedicated parking. Ideal for a young family or professionals sharing.',
      amenities: ['Serviced compound', 'POP ceilings', 'Fitted kitchen', 'Dedicated parking'],
      maxOccupants: 4,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-3bed-06',
    basicInfo: {
      title: 'Three bedroom family flat, Bode Thomas',
      propertyType: 'three_bedroom',
      bedrooms: 3,
      bathrooms: 3,
      furnishing: 'unfurnished',
    },
    location: { address: '7 Bode Thomas Street, Surulere', area: 'Surulere', lga: 'Surulere' },
    media: { photoKey: 'property-6' },
    pricing: { annualRent: 1800000, cautionDepositMonths: 12, serviceCharge: 100000 },
    details: {
      description:
        'Generous three bedroom flat on Bode Thomas, suited to a family. All rooms en-suite, large living and dining area, and a separate laundry space. Secure compound with parking for two cars.',
      amenities: ['All rooms en-suite', 'Laundry space', 'Parking for two', '24-hour security'],
      maxOccupants: 6,
    },
    status: { listing: 'active' },
  },
];
