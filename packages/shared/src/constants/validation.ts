/** Nigerian phone number: +234 followed by 7/8/9, then 0/1, then 8 digits */
export const PHONE_REGEX = /^\+234[789][01]\d{8}$/;

/** Bank Verification Number: exactly 11 digits */
export const BVN_REGEX = /^\d{11}$/;

/** National Identification Number: exactly 11 digits */
export const NIN_REGEX = /^\d{11}$/;

export const PHONE_DISPLAY_FORMAT = '+234 XXX XXX XXXX';

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300;
export const MAX_OTP_ATTEMPTS = 5;
