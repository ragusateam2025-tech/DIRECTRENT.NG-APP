import { DIRECTRENT_FEE_RATE } from './savings';
import type { Listing } from '../types';

/**
 * What a tenant pays, itemised.
 *
 * Four lines, and the order matters: rent first because it is the number
 * everybody already knows, the fee last because it is the one this company has
 * to justify. Nothing is rolled together — a single total is how the middleman
 * model hides what it charges, and hiding it here would make us the thing we
 * are arguing against.
 *
 * The platform fee falls on the tenant. That is the whole pitch: the ~32% they
 * would have paid through an agent becomes 2%, and framing it any other way
 * makes the savings sum meaningless. Property owners pay nothing.
 *
 * Server-side is the authority. The Cloud Function recomputes all of this from
 * the listing before it asks Paystack for anything, because an amount that
 * arrives from a phone is a number somebody can edit.
 */
export interface PaymentBreakdown {
  annualRent: number;
  /** Refundable, and held by the owner rather than by us. */
  cautionDeposit: number;
  serviceCharge: number;
  platformFee: number;
  total: number;
}

export const PAYMENT_LABELS = {
  annualRent: 'Annual rent',
  cautionDeposit: 'Caution deposit',
  serviceCharge: 'Service charge',
  platformFee: 'Directrent.ng Fee (2%)',
  total: 'Total to pay',
} as const;

/**
 * Works out the four lines from a listing.
 *
 * The caution deposit is expressed in months and the rent is annual, so twelve
 * months of deposit is one year's rent. Stored that way because owners think
 * and negotiate in months — "two months' caution" — while rent is advertised
 * by the year.
 *
 * Every line is rounded to whole naira. Kobo do not exist in practice here, and
 * a fractional naira in a total is the kind of thing that makes somebody
 * distrust the whole screen.
 */
export function calculatePayment(listing: Listing): PaymentBreakdown {
  const annualRent = Math.round(listing.pricing.annualRent);
  const months = listing.pricing.cautionDepositMonths ?? 0;
  const cautionDeposit = Math.round((annualRent * months) / 12);
  const serviceCharge = Math.round(listing.pricing.serviceCharge ?? 0);
  const platformFee = Math.round(annualRent * DIRECTRENT_FEE_RATE);

  return {
    annualRent,
    cautionDeposit,
    serviceCharge,
    platformFee,
    total: annualRent + cautionDeposit + serviceCharge + platformFee,
  };
}

/**
 * The total in kobo, which is what Paystack charges in.
 *
 * Paystack takes integer kobo, so a naira amount multiplied by 100. Converted
 * in one named place rather than inline at the call site: a factor of 100 in
 * the wrong direction is a hundredfold under- or over-charge, and it is the
 * single easiest catastrophic mistake to make in this file.
 */
export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}
