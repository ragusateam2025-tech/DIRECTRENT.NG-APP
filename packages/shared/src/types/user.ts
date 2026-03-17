import { VerificationStatus, Timestamp } from './common';

export type UserRole = 'tenant' | 'landlord';

export interface UserProfile {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // +234 format
  photoUrl?: string;
  verification: {
    bvn: VerificationStatus;
    nin: VerificationStatus;
    email: VerificationStatus;
    phone: VerificationStatus;
  };
  rating: {
    average: number;
    count: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TenantProfile extends UserProfile {
  role: 'tenant';
  preferences: {
    areas: string[];
    propertyTypes: string[];
    budgetMin: number;
    budgetMax: number;
  };
  savedProperties: string[];
}

export interface LandlordProfile extends UserProfile {
  role: 'landlord';
  propertyCount: number;
  subscription: {
    plan: 'free' | 'basic' | 'premium';
    expiresAt?: Timestamp;
  };
}
