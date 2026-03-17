import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type ApplicationStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
export type LeaseDuration = '1_year' | '2_years' | '3_years';

export interface ApplicationDetails {
  preferredMoveIn: string; // ISO date string
  leaseDuration: LeaseDuration;
  occupants: {
    adults: number;
    children: number;
    pets: { hasPets: boolean; petType?: string };
  };
  message: string;
}

export interface TenantSnapshot {
  name: string;
  photoUrl: string;
  phone: string;
  email: string;
  verification: { bvn: boolean; nin: boolean; employment: boolean };
  rating: { average: number; count: number };
  employmentInfo: {
    status: string;
    employer?: string | null;
    role?: string | null;
    monthlyIncome?: string | null;
  } | null;
  profileCompleteness: number;
}

export interface ApplicationTimeline {
  action: 'submitted' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn' | 'messaged';
  timestamp: FirebaseFirestoreTypes.Timestamp;
  actor: string;
  note?: string | null;
}

export interface Application {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: ApplicationStatus;
  details: ApplicationDetails;
  tenantSnapshot: TenantSnapshot;
  timeline: ApplicationTimeline[];
  expiresAt: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}
