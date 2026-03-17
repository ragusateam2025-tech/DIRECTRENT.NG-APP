export const FEES = {
  tenant: {
    platformFee: 0,
    successFee: { min: 0.02, max: 0.03 },
    verificationFee: { min: 2000, max: 5000 },
    leaseAgreement: 3000,
  },
  landlord: {
    freeListings: 1,
    subscriptionBasic: { annual: 20000, monthly: 2000 },
    subscriptionPremium: { annual: 50000, monthly: 5000 },
    featuredListing: 5000,
    transactionFee: 0.01,
  },
  savings: {
    agentFee: 0.10,
    legalFee: 0.05,
    totalSaved: 0.15,
  },
  PLAN_LIMITS: { free: 1, basic: 5, premium: 999 },
} as const;
