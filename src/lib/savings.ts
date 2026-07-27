// Fee model — source of truth: DIRECTRENT_MOBILE_HANDOFF.md §5.1.
// These numbers appear in front of clients. Do not change them without
// changing the handoff document first.

/** Traditional all-in fees: agency (~10%) + legal (~10%) + caution (~7%) + misc (~5%). */
export const TRADITIONAL_FEE_RATE = 0.32;

/** What Directrent.ng charges. */
export const DIRECTRENT_FEE_RATE = 0.02;

/**
 * Never label this "Agent Fee (32%)" — the 32% is a composite of several
 * separate charges, and calling it an agent fee is inaccurate. CLAUDE.md §3.
 */
export const TRADITIONAL_FEE_LABEL = 'Traditional Fees (Agent + Legal + Misc)';
export const DIRECTRENT_FEE_LABEL = 'Directrent.ng Fee (2%)';
export const SAVINGS_LABEL = 'Your Savings';

export interface SavingsBreakdown {
  annualRent: number;
  traditionalFees: number;
  directrentFee: number;
  savings: number;
}

/**
 * Calculates what a tenant saves by renting directly instead of through the
 * traditional middleman chain. At ₦1,000,000 annual rent this yields ₦300,000.
 */
export function calculateSavings(annualRent: number): SavingsBreakdown {
  const traditionalFees = Math.round(annualRent * TRADITIONAL_FEE_RATE);
  const directrentFee = Math.round(annualRent * DIRECTRENT_FEE_RATE);

  return {
    annualRent,
    traditionalFees,
    directrentFee,
    savings: traditionalFees - directrentFee,
  };
}
