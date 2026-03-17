import { Timestamp } from './common';

export type PropertyType =
  | 'self_contained'
  | 'mini_flat'
  | 'one_bedroom'
  | 'two_bedroom'
  | 'three_bedroom'
  | 'duplex'
  | 'bungalow'
  | 'boys_quarters';

export type FurnishingType = 'unfurnished' | 'semi_furnished' | 'fully_furnished';

export type ListingStatus = 'draft' | 'active' | 'paused' | 'rented' | 'expired';

export type AvailabilityStatus = 'available' | 'pending' | 'rented';

export interface PropertyPhoto {
  url: string;
  thumbnail?: string;
  caption?: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyPricing {
  annualRent: number;
  cautionDeposit: number;
  serviceCharge: number;
  agreementFee: number;
  totalUpfront: number;
  platformFee: number;
  agentSavings: number;
}

export interface PropertyLocation {
  address: string;
  area: string;
  lga: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geohash?: string;
  nearbyLandmarks: string[];
}

export interface Property {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  propertyType: PropertyType;

  details: {
    bedrooms: number;
    bathrooms: number;
    sizeSqm?: number;
    yearBuilt?: number;
    furnishing: FurnishingType;
  };

  location: PropertyLocation;
  pricing: PropertyPricing;

  media: {
    photos: PropertyPhoto[];
    virtualTourUrl?: string;
    videoUrl?: string;
  };

  amenities: string[];

  rules: {
    petPolicy: 'no_pets' | 'small_pets' | 'all_pets';
    maxOccupants: number;
    customRules: string[];
  };

  status: {
    listing: ListingStatus;
    availability: AvailabilityStatus;
    featured: boolean;
    featuredUntil?: Timestamp;
    verified: boolean;
    verifiedAt?: Timestamp;
  };

  analytics: {
    viewCount: number;
    savedCount: number;
    inquiryCount: number;
    applicationCount: number;
    lastViewedAt?: Timestamp;
  };

  currentTenant?: {
    tenantId: string;
    leaseId: string;
    leaseStartDate: Timestamp;
    leaseEndDate: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;

  // Computed/joined fields
  rating?: number;
  reviewCount?: number;
}

export interface SearchFilters {
  areas?: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number[];
  propertyTypes?: PropertyType[];
  amenities?: string[];
  verifiedOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rating';
}

export interface SearchResult {
  properties: Property[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Keep backward compatibility alias
export { SearchFilters as PropertyFilter };
