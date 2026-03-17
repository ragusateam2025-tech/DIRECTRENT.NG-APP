import { z } from 'zod';

/** Nigerian mobile phone: accepts +234/234/0 prefix then 7/8/9, then 0/1, then 8 digits */
export const phoneSchema = z
  .string()
  .regex(
    /^(?:\+234|234|0)[789][01]\d{8}$/,
    'Enter a valid Nigerian phone number (e.g. 08012345678)'
  );

/** Bank Verification Number — exactly 11 digits */
export const bvnSchema = z
  .string()
  .regex(/^\d{11}$/, 'BVN must be exactly 11 digits');

/** National Identification Number — exactly 11 digits */
export const ninSchema = z
  .string()
  .regex(/^\d{11}$/, 'NIN must be exactly 11 digits');

/** Email address — normalised to lower-case */
export const emailSchema = z
  .string()
  .email('Enter a valid email address')
  .transform(v => v.toLowerCase());

/** OTP — exactly 6 digits */
export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

/** User profile schema */
export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is too short').max(50),
  lastName: z.string().min(2, 'Last name is too short').max(50),
  email: emailSchema,
  phone: phoneSchema,
});

/** Property listing schema */
export const propertyListingSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be at most 100 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be at most 2,000 characters'),
  propertyType: z.enum([
    'self_contained',
    'mini_flat',
    'one_bedroom',
    'two_bedroom',
    'three_bedroom',
    'duplex',
    'bungalow',
    'boys_quarters',
  ]),
  bedrooms: z
    .number()
    .int()
    .min(0, 'Bedrooms cannot be negative')
    .max(10, 'Maximum 10 bedrooms'),
  bathrooms: z
    .number()
    .int()
    .min(1, 'At least 1 bathroom required')
    .max(10, 'Maximum 10 bathrooms'),
  annualRent: z
    .number()
    .min(100_000, 'Minimum rent is ₦100,000')
    .max(50_000_000, 'Maximum rent is ₦50,000,000'),
  address: z.string().min(10, 'Address is too short'),
  area: z.string().min(2, 'Area is required'),
  photos: z
    .array(z.string())
    .min(5, 'At least 5 photos are required'),
  amenities: z
    .array(z.string())
    .min(1, 'Select at least one amenity'),
});

/** Rental application schema */
export const applicationSchema = z.object({
  preferredMoveIn: z
    .date()
    .refine(d => d > new Date(), { message: 'Move-in date must be in the future' }),
  leaseDuration: z.enum(['1_year', '2_years', '3_years']),
  occupants: z.object({
    adults: z.number().int().min(1, 'At least 1 adult required').max(10),
    children: z.number().int().min(0).max(10),
    pets: z.object({
      hasPets: z.boolean(),
      petType: z.string().optional(),
    }),
  }),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(1000, 'Message must be at most 1,000 characters'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PropertyListingFormValues = z.infer<typeof propertyListingSchema>;
export type ApplicationFormValues = z.infer<typeof applicationSchema>;
