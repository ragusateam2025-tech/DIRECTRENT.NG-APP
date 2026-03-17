import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type ReviewerType = 'tenant' | 'landlord';

export interface TenantRating {
  overall: number;           // 1-5
  communication: number;     // 1-5
  propertyUpkeep: number;    // 1-5
  paymentTimeliness: number; // 1-5
}

export interface LandlordRating {
  overall: number;          // 1-5
  communication: number;    // 1-5
  propertyCondition: number; // 1-5
  maintenance: number;      // 1-5
  valueForMoney: number;    // 1-5
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  reviewerType: ReviewerType; // type of the person WRITING the review
  propertyId: string;
  leaseId: string;
  tenantRating?: TenantRating;     // set when reviewerType === 'landlord'
  landlordRating?: LandlordRating; // set when reviewerType === 'tenant'
  comment: string;
  response?: string;
  respondedAt?: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}
