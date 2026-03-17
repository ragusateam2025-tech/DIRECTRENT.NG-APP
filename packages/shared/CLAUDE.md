# CLAUDE.md — Directrent.ng Shared Modules
## Shared Code for Tenant & Landlord Apps

---

## 📦 Overview

This package contains code shared between the Tenant and Landlord mobile apps:
- Common UI components
- Custom React hooks
- Utility functions
- TypeScript types and interfaces
- API services
- Constants and configuration
- Design tokens

**Package Name:** `@directrent/shared`  
**Import:** `import { Component, useHook, util } from '@directrent/shared'`

---

## 📁 Directory Structure

```
packages/shared/
├── CLAUDE.md                    # This file
├── package.json
├── tsconfig.json
├── index.ts                     # Main exports
│
├── components/                  # Shared UI components
│   ├── index.ts
│   ├── Button/
│   ├── Card/
│   ├── Input/
│   ├── PropertyCard/
│   ├── PriceDisplay/
│   ├── VerificationBadge/
│   ├── RatingStars/
│   ├── Avatar/
│   ├── LoadingSpinner/
│   ├── EmptyState/
│   ├── ErrorBoundary/
│   └── Modal/
│
├── hooks/                       # Custom React hooks
│   ├── index.ts
│   ├── useAuth.ts
│   ├── useFirestore.ts
│   ├── useStorage.ts
│   ├── usePaystack.ts
│   ├── useVerification.ts
│   ├── useNotifications.ts
│   ├── useLocation.ts
│   ├── useOffline.ts
│   └── useAnalytics.ts
│
├── services/                    # API and service modules
│   ├── index.ts
│   ├── firebase.ts
│   ├── auth.service.ts
│   ├── property.service.ts
│   ├── application.service.ts
│   ├── payment.service.ts
│   ├── verification.service.ts
│   ├── notification.service.ts
│   └── analytics.service.ts
│
├── utils/                       # Utility functions
│   ├── index.ts
│   ├── currency.ts
│   ├── phone.ts
│   ├── date.ts
│   ├── validation.ts
│   ├── storage.ts
│   └── helpers.ts
│
├── types/                       # TypeScript types
│   ├── index.ts
│   ├── user.types.ts
│   ├── property.types.ts
│   ├── application.types.ts
│   ├── payment.types.ts
│   ├── conversation.types.ts
│   └── common.types.ts
│
├── constants/                   # App constants
│   ├── index.ts
│   ├── lagos.ts
│   ├── propertyTypes.ts
│   ├── amenities.ts
│   ├── fees.ts
│   └── validation.ts
│
└── theme/                       # Design tokens
    ├── index.ts
    ├── colors.ts
    ├── typography.ts
    ├── spacing.ts
    └── shadows.ts
```

---

## 🎨 Shared Components

### PropertyCard
```typescript
// components/PropertyCard/PropertyCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Property } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { VerificationBadge } from '../VerificationBadge';
import { RatingStars } from '../RatingStars';

interface PropertyCardProps {
  property: Property;
  variant: 'compact' | 'full' | 'horizontal';
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  showLandlord?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  variant = 'full',
  onPress,
  onSave,
  isSaved = false,
  showLandlord = true
}) => {
  return (
    <TouchableOpacity style={styles[variant]} onPress={onPress}>
      {/* Photo section */}
      <View style={styles.photoContainer}>
        <Image 
          source={{ uri: property.media.photos[0]?.url }} 
          style={styles.photo}
        />
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text>{isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
        {property.status.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>
      
      {/* Content section */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {property.title}
          </Text>
          {property.status.verified && (
            <VerificationBadge verified type="property" size="sm" />
          )}
        </View>
        
        <Text style={styles.price}>
          {formatCurrency(property.pricing.annualRent)}/year
        </Text>
        
        <Text style={styles.location} numberOfLines={1}>
          📍 {property.location.address}
        </Text>
        
        <View style={styles.details}>
          <Text style={styles.detail}>🛏️ {property.details.bedrooms}</Text>
          <Text style={styles.detail}>🚿 {property.details.bathrooms}</Text>
          {property.details.sizeSqm && (
            <Text style={styles.detail}>📐 {property.details.sizeSqm}sqm</Text>
          )}
        </View>
        
        {property.amenities.slice(0, 3).map(amenity => (
          <Text key={amenity} style={styles.amenity}>{amenity}</Text>
        ))}
        
        {showLandlord && (
          <View style={styles.landlordRow}>
            <RatingStars rating={property.rating} size="sm" />
            <Text style={styles.reviewCount}>
              ({property.reviewCount} reviews)
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
```

### PriceDisplay
```typescript
// components/PriceDisplay/PriceDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/currency';
import { colors, typography } from '../../theme';

interface PriceDisplayProps {
  amount: number;
  period?: 'year' | 'month' | 'total';
  showSavings?: boolean;
  savingsAmount?: number;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  breakdown?: {
    rent: number;
    deposit: number;
    serviceCharge: number;
    platformFee: number;
  };
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  period = 'year',
  showSavings = false,
  savingsAmount,
  size = 'md',
  showBreakdown = false,
  breakdown
}) => {
  const periodLabel = {
    year: '/year',
    month: '/month',
    total: ' total'
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.amount, styles[`amount_${size}`]]}>
        {formatCurrency(amount)}
        <Text style={styles.period}>{periodLabel[period]}</Text>
      </Text>
      
      {showSavings && savingsAmount && savingsAmount > 0 && (
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsText}>
            💰 Save {formatCurrency(savingsAmount)} vs. using an agent
          </Text>
        </View>
      )}
      
      {showBreakdown && breakdown && (
        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Annual Rent</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown.rent)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Caution Deposit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown.deposit)}</Text>
          </View>
          {breakdown.serviceCharge > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Service Charge</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(breakdown.serviceCharge)}</Text>
            </View>
          )}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (2%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown.platformFee)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(amount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};
```

### VerificationBadge
```typescript
// components/VerificationBadge/VerificationBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface VerificationBadgeProps {
  verified: boolean;
  type: 'landlord' | 'tenant' | 'property';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verified,
  type,
  size = 'md',
  showText = true
}) => {
  if (!verified) return null;
  
  const labels = {
    landlord: 'Verified Landlord',
    tenant: 'Verified Tenant',
    property: 'Verified'
  };
  
  return (
    <View style={[styles.badge, styles[`badge_${size}`]]}>
      <Text style={styles.icon}>✓</Text>
      {showText && (
        <Text style={[styles.text, styles[`text_${size}`]]}>
          {labels[type]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.verified.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  icon: {
    color: colors.verified.badge,
    fontWeight: 'bold',
  },
  text: {
    color: colors.verified.badge,
    marginLeft: 4,
    fontWeight: '600',
  },
  badge_sm: { paddingHorizontal: 6, paddingVertical: 2 },
  badge_md: { paddingHorizontal: 8, paddingVertical: 4 },
  badge_lg: { paddingHorizontal: 12, paddingVertical: 6 },
  text_sm: { fontSize: 10 },
  text_md: { fontSize: 12 },
  text_lg: { fontSize: 14 },
});
```

---

## 🪝 Custom Hooks

### useAuth
```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { User, Tenant, Landlord } from '../types';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  profile: User | null;
  tenantProfile: Tenant | null;
  landlordProfile: Landlord | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    tenantProfile: null,
    landlordProfile: null,
    loading: true,
    error: null,
  });
  
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await firestore()
            .collection('users')
            .doc(user.uid)
            .get();
          
          const profile = userDoc.data() as User;
          
          // Fetch role-specific profile
          let tenantProfile = null;
          let landlordProfile = null;
          
          if (profile?.userType === 'tenant') {
            const tenantDoc = await firestore()
              .collection('tenants')
              .doc(user.uid)
              .get();
            tenantProfile = tenantDoc.data() as Tenant;
          } else if (profile?.userType === 'landlord') {
            const landlordDoc = await firestore()
              .collection('landlords')
              .doc(user.uid)
              .get();
            landlordProfile = landlordDoc.data() as Landlord;
          }
          
          setState({
            user,
            profile,
            tenantProfile,
            landlordProfile,
            loading: false,
            error: null,
          });
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load profile',
          }));
        }
      } else {
        setState({
          user: null,
          profile: null,
          tenantProfile: null,
          landlordProfile: null,
          loading: false,
          error: null,
        });
      }
    });
    
    return unsubscribe;
  }, []);
  
  const signInWithPhone = useCallback(async (phoneNumber: string) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      return confirmation;
    } catch (error) {
      throw error;
    }
  }, []);
  
  const verifyOtp = useCallback(async (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string
  ) => {
    try {
      await confirmation.confirm(code);
    } catch (error) {
      throw error;
    }
  }, []);
  
  const signOut = useCallback(async () => {
    await auth().signOut();
  }, []);
  
  const isVerified = useCallback(() => {
    if (!state.profile) return false;
    return (
      state.profile.verification.bvn.status === 'verified' ||
      state.profile.verification.nin.status === 'verified'
    );
  }, [state.profile]);
  
  return {
    ...state,
    signInWithPhone,
    verifyOtp,
    signOut,
    isVerified,
  };
};
```

### usePaystack
```typescript
// hooks/usePaystack.ts
import { useState, useCallback } from 'react';
import { Paystack, paystackProps } from 'react-native-paystack-webview';
import functions from '@react-native-firebase/functions';

interface PaymentConfig {
  amount: number;           // In Naira
  email: string;
  propertyId: string;
  leaseId?: string;
  type: 'rent' | 'deposit' | 'service_charge';
}

interface PaymentResult {
  success: boolean;
  reference: string;
  transactionId?: string;
  message?: string;
}

export const usePaystack = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initializePayment = useCallback(async (config: PaymentConfig): Promise<{
    accessCode: string;
    reference: string;
  }> => {
    setLoading(true);
    setError(null);
    
    try {
      const initPayment = functions().httpsCallable('initializePayment');
      const result = await initPayment({
        amount: config.amount * 100,  // Paystack uses kobo
        email: config.email,
        propertyId: config.propertyId,
        leaseId: config.leaseId,
        type: config.type,
        metadata: {
          propertyId: config.propertyId,
          type: config.type,
        }
      });
      
      setLoading(false);
      return result.data as { accessCode: string; reference: string };
    } catch (err) {
      setError('Failed to initialize payment');
      setLoading(false);
      throw err;
    }
  }, []);
  
  const verifyPayment = useCallback(async (reference: string): Promise<boolean> => {
    try {
      const verify = functions().httpsCallable('verifyPayment');
      const result = await verify({ reference });
      return result.data.success;
    } catch (err) {
      return false;
    }
  }, []);
  
  const getPaystackConfig = useCallback((
    accessCode: string,
    email: string,
    amount: number
  ): Partial<paystackProps> => {
    return {
      paystackKey: process.env.PAYSTACK_PUBLIC_KEY!,
      billingEmail: email,
      amount: amount * 100,  // Kobo
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer'],
      activityIndicatorColor: '#0066CC',
    };
  }, []);
  
  return {
    loading,
    error,
    initializePayment,
    verifyPayment,
    getPaystackConfig,
  };
};
```

### useVerification
```typescript
// hooks/useVerification.ts
import { useState, useCallback } from 'react';
import functions from '@react-native-firebase/functions';

interface VerificationResult {
  success: boolean;
  message: string;
  data?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
  };
}

export const useVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const verifyBvn = useCallback(async (bvn: string): Promise<VerificationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate BVN format
      if (!/^\d{11}$/.test(bvn)) {
        throw new Error('BVN must be 11 digits');
      }
      
      const verifyBvnFn = functions().httpsCallable('verifyBvn');
      const result = await verifyBvnFn({ bvn });
      
      setLoading(false);
      return result.data as VerificationResult;
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setLoading(false);
      throw err;
    }
  }, []);
  
  const verifyNin = useCallback(async (nin: string): Promise<VerificationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate NIN format
      if (!/^\d{11}$/.test(nin)) {
        throw new Error('NIN must be 11 digits');
      }
      
      const verifyNinFn = functions().httpsCallable('verifyNin');
      const result = await verifyNinFn({ nin });
      
      setLoading(false);
      return result.data as VerificationResult;
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setLoading(false);
      throw err;
    }
  }, []);
  
  const verifyBankAccount = useCallback(async (
    accountNumber: string,
    bankCode: string
  ): Promise<{ accountName: string; verified: boolean }> => {
    setLoading(true);
    setError(null);
    
    try {
      const verifyAccountFn = functions().httpsCallable('verifyBankAccount');
      const result = await verifyAccountFn({ accountNumber, bankCode });
      
      setLoading(false);
      return result.data as { accountName: string; verified: boolean };
    } catch (err: any) {
      setError(err.message || 'Account verification failed');
      setLoading(false);
      throw err;
    }
  }, []);
  
  return {
    loading,
    error,
    verifyBvn,
    verifyNin,
    verifyBankAccount,
  };
};
```

---

## 🛠️ Utility Functions

### Currency Utilities
```typescript
// utils/currency.ts

/**
 * Nigerian Naira currency configuration
 */
export const CURRENCY = {
  code: 'NGN',
  symbol: '₦',
  locale: 'en-NG',
};

/**
 * Format a number as Nigerian Naira currency
 * @param amount - Amount in Naira
 * @returns Formatted string, e.g., "₦500,000"
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Parse a currency string to number
 * @param value - Currency string, e.g., "₦500,000" or "500000"
 * @returns Number value
 */
export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[₦,\s]/g, '');
  return parseInt(cleaned, 10) || 0;
};

/**
 * Calculate platform fee (2% of amount)
 * @param amount - Amount in Naira
 * @returns Platform fee
 */
export const calculatePlatformFee = (amount: number): number => {
  return Math.round(amount * 0.02);
};

/**
 * Calculate agent savings (10% of amount that tenant would pay to agent)
 * @param annualRent - Annual rent in Naira
 * @returns Savings amount
 */
export const calculateAgentSavings = (annualRent: number): number => {
  return Math.round(annualRent * 0.10);  // 10% agency fee saved
};

/**
 * Calculate total upfront payment
 */
export const calculateTotalUpfront = (
  annualRent: number,
  cautionYears: number = 1,
  serviceCharge: number = 0,
  agreementFee: number = 0
): {
  rent: number;
  deposit: number;
  serviceCharge: number;
  agreementFee: number;
  platformFee: number;
  total: number;
  agentSavings: number;
} => {
  const deposit = annualRent * cautionYears;
  const platformFee = calculatePlatformFee(annualRent);
  const total = annualRent + deposit + serviceCharge + agreementFee + platformFee;
  const agentSavings = calculateAgentSavings(annualRent);
  
  return {
    rent: annualRent,
    deposit,
    serviceCharge,
    agreementFee,
    platformFee,
    total,
    agentSavings,
  };
};
```

### Phone Utilities
```typescript
// utils/phone.ts

/**
 * Nigerian phone number regex
 * Matches: 08012345678, +2348012345678, 2348012345678
 */
export const PHONE_REGEX = /^(?:\+234|234|0)[789][01]\d{8}$/;

/**
 * Validate Nigerian phone number
 * @param phone - Phone number string
 * @returns boolean
 */
export const isValidNigerianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s-]/g, '');
  return PHONE_REGEX.test(cleaned);
};

/**
 * Format phone number to international format
 * @param phone - Phone number (any format)
 * @returns Phone in +234 format
 */
export const formatPhoneToInternational = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('+234')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  
  return cleaned;
};

/**
 * Format phone number for display
 * @param phone - Phone in +234 format
 * @returns Formatted: +234 801 234 5678
 */
export const formatPhoneForDisplay = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('+234') && cleaned.length === 14) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
  }
  
  return cleaned;
};

/**
 * Mask phone number for privacy
 * @param phone - Full phone number
 * @returns Masked: +234 *** *** 5678
 */
export const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)} *** *** ${cleaned.slice(-4)}`;
  }
  
  return '*** *** ****';
};
```

### Validation Utilities
```typescript
// utils/validation.ts
import { z } from 'zod';

// Nigerian phone number schema
export const phoneSchema = z
  .string()
  .regex(/^(?:\+234|234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number');

// BVN schema (11 digits)
export const bvnSchema = z
  .string()
  .length(11, 'BVN must be 11 digits')
  .regex(/^\d{11}$/, 'BVN must contain only numbers');

// NIN schema (11 digits)
export const ninSchema = z
  .string()
  .length(11, 'NIN must be 11 digits')
  .regex(/^\d{11}$/, 'NIN must contain only numbers');

// Email schema
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase();

// Property listing schema
export const propertyListingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  propertyType: z.enum([
    'self_contained', 'mini_flat', 'one_bedroom', 'two_bedroom',
    'three_bedroom', 'duplex', 'bungalow', 'boys_quarters'
  ]),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(1).max(10),
  annualRent: z.number().min(100000, 'Minimum rent is ₦100,000').max(50000000),
  address: z.string().min(10),
  area: z.string().min(2),
  photos: z.array(z.string().url()).min(5, 'At least 5 photos required'),
  amenities: z.array(z.string()).min(1),
});

// Application schema
export const applicationSchema = z.object({
  preferredMoveIn: z.date().min(new Date(), 'Move-in date must be in the future'),
  leaseDuration: z.enum(['1_year', '2_years', '3_years']),
  occupants: z.object({
    adults: z.number().min(1).max(10),
    children: z.number().min(0).max(10),
    pets: z.object({
      hasPets: z.boolean(),
      petType: z.string().optional(),
    }),
  }),
  message: z.string().min(20, 'Message must be at least 20 characters').max(1000),
});

// Profile schema
export const profileSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: emailSchema,
  phone: phoneSchema,
});
```

---

## 📝 Type Definitions

### User Types
```typescript
// types/user.types.ts
import { Timestamp } from 'firebase/firestore';

export type UserType = 'tenant' | 'landlord';

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';

export interface VerificationRecord {
  status: VerificationStatus;
  last4?: string;
  verifiedAt?: Timestamp;
  verifyMeRef?: string;
}

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  userType: UserType;
  
  verification: {
    phone: { verified: boolean; verifiedAt?: Timestamp };
    email: { verified: boolean; verifiedAt?: Timestamp };
    bvn: VerificationRecord;
    nin: VerificationRecord;
  };
  
  profileComplete: boolean;
  profileCompleteness: number;
  
  settings: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
      marketing: boolean;
    };
    privacy: {
      showPhone: boolean;
      showEmail: boolean;
    };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  fcmTokens: string[];
}
```

### Property Types
```typescript
// types/property.types.ts
import { Timestamp, GeoPoint } from 'firebase/firestore';

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
  thumbnail: string;
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
  state: 'Lagos';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geohash: string;
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
  
  // Computed fields for display
  rating?: number;
  reviewCount?: number;
}
```

---

## 📋 Constants

### Lagos Areas
```typescript
// constants/lagos.ts

export interface LagosArea {
  name: string;
  lga: string;
  zone: 'mainland' | 'island';
  priority: 1 | 2 | 3;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export const LAGOS_AREAS: LagosArea[] = [
  // Mainland - Priority 1 (Year 1 focus)
  { name: 'Yaba', lga: 'Yaba', zone: 'mainland', priority: 1, coordinates: { latitude: 6.5095, longitude: 3.3711 } },
  { name: 'Surulere', lga: 'Surulere', zone: 'mainland', priority: 1, coordinates: { latitude: 6.5000, longitude: 3.3500 } },
  
  // Mainland - Priority 2
  { name: 'Ikeja', lga: 'Ikeja', zone: 'mainland', priority: 2, coordinates: { latitude: 6.6018, longitude: 3.3515 } },
  { name: 'Ojodu', lga: 'Ojodu', zone: 'mainland', priority: 2, coordinates: { latitude: 6.6321, longitude: 3.3761 } },
  { name: 'Gbagada', lga: 'Kosofe', zone: 'mainland', priority: 2, coordinates: { latitude: 6.5537, longitude: 3.3897 } },
  { name: 'Maryland', lga: 'Kosofe', zone: 'mainland', priority: 2, coordinates: { latitude: 6.5680, longitude: 3.3671 } },
  
  // Mainland - Priority 3
  { name: 'Magodo', lga: 'Kosofe', zone: 'mainland', priority: 3, coordinates: { latitude: 6.6139, longitude: 3.4137 } },
  { name: 'Ogba', lga: 'Ifako-Ijaiye', zone: 'mainland', priority: 3, coordinates: { latitude: 6.6253, longitude: 3.3421 } },
  
  // Island - Priority 2
  { name: 'Lekki', lga: 'Eti-Osa', zone: 'island', priority: 2, coordinates: { latitude: 6.4698, longitude: 3.5852 } },
  { name: 'Ajah', lga: 'Eti-Osa', zone: 'island', priority: 2, coordinates: { latitude: 6.4736, longitude: 3.5796 } },
  
  // Island - Priority 3
  { name: 'Victoria Island', lga: 'Eti-Osa', zone: 'island', priority: 3, coordinates: { latitude: 6.4281, longitude: 3.4219 } },
  { name: 'Ikoyi', lga: 'Eti-Osa', zone: 'island', priority: 3, coordinates: { latitude: 6.4544, longitude: 3.4313 } },
];

export const RENT_RANGES = {
  mainland: { min: 300000, max: 2000000, typical: 700000 },
  island: { min: 900000, max: 4000000, typical: 2000000 },
};

export const getAreasByPriority = (priority: 1 | 2 | 3): LagosArea[] => {
  return LAGOS_AREAS.filter(area => area.priority === priority);
};

export const getAreasByZone = (zone: 'mainland' | 'island'): LagosArea[] => {
  return LAGOS_AREAS.filter(area => area.zone === zone);
};
```

### Amenities
```typescript
// constants/amenities.ts

export interface Amenity {
  id: string;
  label: string;
  icon: string;
  category: 'utilities' | 'security' | 'facilities' | 'access';
}

export const AMENITIES: Amenity[] = [
  // Utilities
  { id: 'power_24hr', label: '24hr Electricity', icon: '⚡', category: 'utilities' },
  { id: 'prepaid_meter', label: 'Prepaid Meter', icon: '📊', category: 'utilities' },
  { id: 'borehole', label: 'Borehole Water', icon: '💧', category: 'utilities' },
  { id: 'generator', label: 'Generator Backup', icon: '🔋', category: 'utilities' },
  
  // Security
  { id: 'security', label: 'Security (Gateman)', icon: '🔒', category: 'security' },
  { id: 'cctv', label: 'CCTV', icon: '📹', category: 'security' },
  { id: 'perimeter_fence', label: 'Perimeter Fence', icon: '🧱', category: 'security' },
  
  // Facilities
  { id: 'parking', label: 'Parking Space', icon: '🚗', category: 'facilities' },
  { id: 'bq', label: 'Boys Quarters', icon: '🏠', category: 'facilities' },
  { id: 'gym', label: 'Gym', icon: '💪', category: 'facilities' },
  { id: 'pool', label: 'Swimming Pool', icon: '🏊', category: 'facilities' },
  
  // Access
  { id: 'tarred_road', label: 'Tarred Road Access', icon: '🛣️', category: 'access' },
  { id: 'street_lights', label: 'Street Lights', icon: '💡', category: 'access' },
  { id: 'brt_proximity', label: 'Proximity to BRT', icon: '🚌', category: 'access' },
  { id: 'waste_disposal', label: 'Waste Disposal', icon: '🗑️', category: 'access' },
];

export const getAmenitiesByCategory = (category: Amenity['category']): Amenity[] => {
  return AMENITIES.filter(amenity => amenity.category === category);
};
```

---

## 🎨 Design Tokens

### Colors
```typescript
// theme/colors.ts

export const colors = {
  // Primary brand colors
  primary: {
    main: '#0066CC',        // Directrent Blue
    light: '#4D94FF',
    dark: '#004C99',
    contrast: '#FFFFFF',
  },
  
  // Secondary (success/positive)
  secondary: {
    main: '#00994D',        // Success Green
    light: '#33B374',
    dark: '#006633',
    contrast: '#FFFFFF',
  },
  
  // Accent (action/CTA)
  accent: {
    main: '#FF6B00',        // Action Orange
    light: '#FF8533',
    dark: '#CC5500',
    contrast: '#FFFFFF',
  },
  
  // Neutral palette
  neutral: {
    white: '#FFFFFF',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#E0E4E8',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    disabled: '#D1D5DB',
  },
  
  // Semantic colors
  semantic: {
    success: '#00994D',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#0066CC',
  },
  
  // Verification badge
  verified: {
    badge: '#00994D',
    background: '#E6F7EE',
    text: '#00663D',
  },
  
  // Status colors
  status: {
    active: '#00994D',
    pending: '#F59E0B',
    expired: '#DC2626',
    occupied: '#0066CC',
    vacant: '#9CA3AF',
  },
  
  // Gradient
  gradient: {
    primary: ['#0066CC', '#004C99'],
    success: ['#00994D', '#006633'],
  },
};
```

### Typography
```typescript
// theme/typography.ts

export const typography = {
  fontFamily: {
    primary: 'Inter',
    secondary: 'Inter',
    mono: 'JetBrains Mono',
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Pre-defined text styles
  styles: {
    h1: { fontSize: 36, fontWeight: '700', lineHeight: 1.2 },
    h2: { fontSize: 30, fontWeight: '700', lineHeight: 1.2 },
    h3: { fontSize: 24, fontWeight: '600', lineHeight: 1.3 },
    h4: { fontSize: 20, fontWeight: '600', lineHeight: 1.4 },
    h5: { fontSize: 18, fontWeight: '600', lineHeight: 1.4 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
    bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 1.4 },
    button: { fontSize: 16, fontWeight: '600', lineHeight: 1 },
    price: { fontSize: 24, fontWeight: '700', lineHeight: 1.2 },
  },
};
```

### Spacing
```typescript
// theme/spacing.ts

export const spacing = {
  // Base spacing unit (4px)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  
  // Specific use cases
  screen: {
    horizontal: 16,
    vertical: 24,
  },
  
  card: {
    padding: 16,
    gap: 12,
  },
  
  input: {
    padding: 12,
    borderRadius: 8,
  },
  
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
};
```

---

## ⚠️ Shared Module Rules

### DO
- Export all public APIs from `index.ts` files
- Use strict TypeScript throughout
- Document all public functions with JSDoc
- Maintain consistent naming conventions
- Test all utility functions
- Use the design tokens, not hardcoded values
- Keep components stateless where possible

### DO NOT
- Never import directly from internal paths (use barrel exports)
- Never use inline styles (use theme tokens)
- Never use `any` type
- Never modify shared code without updating both apps
- Never hardcode Nigerian-specific values (use constants)

---

*Module: Shared Packages*
*Parent: CLAUDE.md (root)*
*Version: 1.0.0*
