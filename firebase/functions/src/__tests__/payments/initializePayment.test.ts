/**
 * Unit tests for initializePayment Cloud Function.
 * Covers: auth guard, input validation, ownership check,
 * status check, existing-payment de-duplication, cost breakdown,
 * Paystack API error handling, and success persistence.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockDocGet = jest.fn();
const mockDocRef = jest.fn(() => ({ get: mockDocGet, set: mockDocSet }));

const mockCollectionGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();

mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });
mockLimit.mockReturnValue({ get: mockCollectionGet });

const mockCollection = jest.fn(() => ({
  doc: mockDocRef,
  where: mockWhere,
}));

const mockNow = { toDate: () => new Date(), toMillis: () => Date.now() };
const mockTimestamp = {
  now: jest.fn(() => mockNow),
  fromMillis: jest.fn((ms: number) => ({ toDate: () => new Date(ms), toMillis: () => ms })),
};

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    jest.fn(() => ({ collection: mockCollection })),
    {
      Timestamp: {
        now: jest.fn(() => mockNow),
        fromMillis: jest.fn((ms: number) => ({
          toDate: () => new Date(ms),
          toMillis: () => ms,
        })),
      },
    }
  ),
  initializeApp: jest.fn(),
  apps: [{}],
}));

const mockInitializeTransaction = jest.fn();
jest.mock('../../payments/paystack.client', () => ({
  PaystackClient: { initializeTransaction: mockInitializeTransaction },
}));

jest.mock('../../utils/currency', () => ({
  addDays: jest.fn((d: Date, n: number) => new Date(d.getTime() + n * 86400000)),
  randomString: jest.fn(() => 'RAND1234'),
  formatCurrency: jest.fn((n: number) => `₦${n.toLocaleString()}`),
}));

import { initializePayment } from '../../payments/initializePayment';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_UID = 'tenant-uid-abc';
const LANDLORD_UID = 'landlord-uid-xyz';
const PROPERTY_ID = 'prop-001';
const APP_ID = 'app-001';

const APPLICATION_DOC = {
  tenantId: TENANT_UID,
  landlordId: LANDLORD_UID,
  propertyId: PROPERTY_ID,
  status: 'accepted',
};

const PROPERTY_DOC = {
  title: '2BR Flat, Yaba',
  pricing: {
    annualRent: 650000,
    cautionDeposit: 650000,
    serviceCharge: 50000,
  },
  location: { address: 'Herbert Macaulay Way, Yaba' },
};

const USER_DOC = { email: 'tenant@example.com' };

const PAYSTACK_RESPONSE = {
  authorization_url: 'https://checkout.paystack.com/xxx',
  access_code: 'access_code_abc',
  reference: `DR-${Date.now()}-RAND1234`,
};

function makeRequest(data: object, uid: string | null = TENANT_UID) {
  return { auth: uid ? { uid } : null, data };
}

/** Set up the sequence of Firestore .doc().get() calls */
function setupDocGetSequence(docs: Array<{ exists: boolean; data: () => object }>) {
  docs.forEach((doc) => {
    mockDocGet.mockResolvedValueOnce(doc);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('initializePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing pending payment
    mockCollectionGet.mockResolvedValue({ empty: true, docs: [] });
    // Default: Paystack succeeds
    mockInitializeTransaction.mockResolvedValue(PAYSTACK_RESPONSE);
    // Default doc sequence: application → property → user
    setupDocGetSequence([
      { exists: true, data: () => APPLICATION_DOC },
      { exists: true, data: () => PROPERTY_DOC },
      { exists: true, data: () => USER_DOC },
    ]);
    mockDocRef.mockReturnValue({ get: mockDocGet, set: mockDocSet });
    mockCollection.mockReturnValue({ doc: mockDocRef, where: mockWhere });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });
    mockLimit.mockReturnValue({ get: mockCollectionGet });
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    it('throws unauthenticated when called without auth', async () => {
      const handler = initializePayment as Function;
      await expect(
        handler(makeRequest({ applicationId: APP_ID }, null))
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });
  });

  // ── Input validation ───────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws invalid-argument when applicationId is missing', async () => {
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({}))).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });

    it('throws invalid-argument when applicationId is not a string', async () => {
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: 123 }))).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });
  });

  // ── Application checks ────────────────────────────────────────────────────

  describe('application checks', () => {
    it('throws not-found when application does not exist', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false, data: () => null });
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: APP_ID }))).rejects.toMatchObject({
        code: 'not-found',
      });
    });

    it('throws permission-denied when application belongs to another tenant', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ...APPLICATION_DOC, tenantId: 'other-tenant' }),
      });
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: APP_ID }))).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('throws failed-precondition when application is not accepted', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ...APPLICATION_DOC, status: 'pending' }),
      });
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: APP_ID }))).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    });
  });

  // ── Existing payment de-dup ────────────────────────────────────────────────

  describe('existing pending payment', () => {
    it('returns the existing payment if not yet expired', async () => {
      const futureExpiry = { toMillis: () => Date.now() + 1000 * 60 * 25 };
      const existingPayment = {
        id: 'DR-existing-ref',
        paystack: {
          authorizationUrl: 'https://checkout.paystack.com/existing',
          accessCode: 'existing_access',
        },
        breakdown: {
          annualRent: 650000,
          cautionDeposit: 650000,
          serviceCharge: 50000,
          platformFee: 13000,
          total: 1363000,
        },
        expiresAt: futureExpiry,
      };

      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => existingPayment }],
      });

      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));

      expect(result).toMatchObject({
        success: true,
        data: { authorizationUrl: existingPayment.paystack.authorizationUrl },
      });
      expect(mockInitializeTransaction).not.toHaveBeenCalled();
    });
  });

  // ── Cost breakdown ────────────────────────────────────────────────────────

  describe('cost breakdown calculation', () => {
    it('calculates platform fee as 2% of annual rent', async () => {
      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      // 2% of 650000 = 13000
      expect(result.data.breakdown.platformFee).toBe(13000);
    });

    it('calculates total as sum of all components', async () => {
      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      const { annualRent, cautionDeposit, serviceCharge, platformFee, total } =
        result.data.breakdown;
      expect(total).toBe(annualRent + cautionDeposit + serviceCharge + platformFee);
    });

    it('defaults serviceCharge to 0 when not provided', async () => {
      // Property without serviceCharge
      mockDocGet
        .mockResolvedValueOnce({ exists: true, data: () => APPLICATION_DOC })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            title: '1BR Flat',
            pricing: { annualRent: 400000, cautionDeposit: 400000 },
            location: { address: 'Somewhere' },
          }),
        })
        .mockResolvedValueOnce({ exists: true, data: () => USER_DOC });

      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      expect(result.data.breakdown.serviceCharge).toBe(0);
    });
  });

  // ── Paystack channel handling ─────────────────────────────────────────────

  describe('Paystack channel configuration', () => {
    it('passes all channels when paymentMethod is not specified', async () => {
      const handler = initializePayment as Function;
      await handler(makeRequest({ applicationId: APP_ID }));
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: expect.arrayContaining(['card', 'bank', 'ussd', 'bank_transfer']),
        })
      );
    });

    it('passes only card channel when paymentMethod is card', async () => {
      setupDocGetSequence([
        { exists: true, data: () => APPLICATION_DOC },
        { exists: true, data: () => PROPERTY_DOC },
        { exists: true, data: () => USER_DOC },
      ]);
      const handler = initializePayment as Function;
      await handler(makeRequest({ applicationId: APP_ID, paymentMethod: 'card' }));
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ channels: ['card'] })
      );
    });

    it('passes amount in kobo (×100)', async () => {
      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ amount: result.data.breakdown.total * 100 })
      );
    });
  });

  // ── Paystack error handling ───────────────────────────────────────────────

  describe('Paystack API errors', () => {
    it('throws unavailable when Paystack throws', async () => {
      mockInitializeTransaction.mockRejectedValueOnce(new Error('Gateway timeout'));
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: APP_ID }))).rejects.toMatchObject({
        code: 'unavailable',
      });
    });

    it('does NOT persist a payment document when Paystack fails', async () => {
      mockInitializeTransaction.mockRejectedValueOnce(new Error('Gateway timeout'));
      const handler = initializePayment as Function;
      await expect(handler(makeRequest({ applicationId: APP_ID }))).rejects.toBeTruthy();
      expect(mockDocSet).not.toHaveBeenCalled();
    });
  });

  // ── Success path ───────────────────────────────────────────────────────────

  describe('success path', () => {
    it('persists a payments document with status=pending', async () => {
      const handler = initializePayment as Function;
      await handler(makeRequest({ applicationId: APP_ID }));
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_UID,
          landlordId: LANDLORD_UID,
          propertyId: PROPERTY_ID,
          applicationId: APP_ID,
          status: 'pending',
          currency: 'NGN',
        })
      );
    });

    it('returns authorizationUrl and accessCode from Paystack', async () => {
      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      expect(result.data.authorizationUrl).toBe(PAYSTACK_RESPONSE.authorization_url);
      expect(result.data.accessCode).toBe(PAYSTACK_RESPONSE.access_code);
    });

    it('includes escrow info with 7-day hold period', async () => {
      const handler = initializePayment as Function;
      const result = await handler(makeRequest({ applicationId: APP_ID }));
      expect(result.data.escrowInfo).toMatchObject({
        holdPeriodDays: 7,
        depositAmount: PROPERTY_DOC.pricing.cautionDeposit,
      });
    });

    it('uses tenant email from Firestore user doc', async () => {
      const handler = initializePayment as Function;
      await handler(makeRequest({ applicationId: APP_ID }));
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ email: USER_DOC.email })
      );
    });

    it('falls back to uid@directrent.ng when user has no email', async () => {
      mockDocGet
        .mockResolvedValueOnce({ exists: true, data: () => APPLICATION_DOC })
        .mockResolvedValueOnce({ exists: true, data: () => PROPERTY_DOC })
        .mockResolvedValueOnce({ exists: true, data: () => ({}) }); // No email
      const handler = initializePayment as Function;
      await handler(makeRequest({ applicationId: APP_ID }));
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ email: `${TENANT_UID}@directrent.ng` })
      );
    });
  });
});
