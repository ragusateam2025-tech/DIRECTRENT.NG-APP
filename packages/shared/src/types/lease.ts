import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type LeaseStatus = 'pending_signature' | 'active' | 'expired' | 'terminated';

export interface LeaseParties {
  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
}

export interface LeaseTerms {
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  durationMonths: number;
  annualRent: number;
  monthlyRent: number;
  cautionDeposit: number;
  serviceCharge: number;
  noticePeriodDays: number;
  renewalOption: boolean;
}

export interface LeaseProperty {
  address: string;
  propertyType: string;
  bedrooms: number;
  area: string;
}

export interface LeaseSignature {
  signed: boolean;
  signedAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface Lease {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  applicationId: string;
  paymentId: string;
  status: LeaseStatus;
  terms: LeaseTerms;
  parties: LeaseParties;
  property: LeaseProperty;
  signatures: {
    landlord: LeaseSignature;
    tenant: LeaseSignature;
  };
  documentUrl?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}
