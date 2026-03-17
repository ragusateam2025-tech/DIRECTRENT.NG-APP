/**
 * Unit tests for verifyBvn Cloud Function.
 * Covers: auth guard, input validation, duplicate detection,
 * name matching, external API error handling, and success path.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockBatch = jest.fn(() => ({
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
}));

const mockDocGet = jest.fn();
const mockDocRef = jest.fn((id?: string) => ({
  id: id ?? 'mock-doc-id',
  get: mockDocGet,
}));

const mockCollectionGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockQuerySnap = { empty: true, docs: [] as unknown[] };

const mockAdd = jest.fn().mockResolvedValue({ id: 'log-doc-id' });
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn().mockResolvedValue(undefined);

const mockCollection = jest.fn((name: string) => ({
  doc: mockDocRef,
  add: mockAdd,
  where: mockWhere,
}));

// Firestore chaining helpers
mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });
mockLimit.mockReturnValue({ get: mockCollectionGet });
mockCollectionGet.mockResolvedValue(mockQuerySnap);

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    jest.fn(() => ({
      collection: mockCollection,
      batch: mockBatch,
    })),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
        increment: jest.fn((n: number) => ({ _increment: n })),
      },
    }
  ),
  initializeApp: jest.fn(),
  apps: [{}],
}));

const mockVerifyBvnApi = jest.fn();
jest.mock('../../verification/verifyme.client', () => ({
  VerifyMeClient: { verifyBvn: mockVerifyBvnApi },
}));

// Import AFTER mocks
import { https } from 'firebase-functions/v2';
import { verifyBvn } from '../../verification/verifyBvn';
import * as admin from 'firebase-admin';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_UID = 'uid-test-123';
const VALID_BVN = '12345678901'; // 11 digits
const INVALID_BVN_SHORT = '1234567890';
const INVALID_BVN_ALPHA = '1234567890a';

/** Build a fake onCall request */
function makeRequest(data: object, uid: string | null = MOCK_UID) {
  return {
    auth: uid ? { uid } : null,
    data,
  };
}

/** Make firestore().collection().doc().get() return a snapshot */
function mockUserDoc(data: object) {
  mockDocGet.mockResolvedValueOnce({ exists: true, data: () => data });
  mockDocRef.mockReturnValueOnce({ id: MOCK_UID, get: mockDocGet, update: mockUpdate });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('verifyBvn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no duplicate found
    mockCollectionGet.mockResolvedValue({ empty: true, docs: [] });
    // Default: user doc exists with matching name
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        firstName: 'Ada',
        lastName: 'Okonkwo',
        verification: { bvn: { status: 'pending' } },
      }),
    });
    mockDocRef.mockReturnValue({ id: MOCK_UID, get: mockDocGet, update: mockUpdate });
    mockCollection.mockReturnValue({
      doc: mockDocRef,
      add: mockAdd,
      where: mockWhere,
    });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });
    mockLimit.mockReturnValue({ get: mockCollectionGet });
    mockVerifyBvnApi.mockResolvedValue({
      status: true,
      data: { firstName: 'Ada', lastName: 'Okonkwo', reference: 'vm-ref-001' },
    });
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    it('throws unauthenticated when no auth context', async () => {
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: VALID_BVN }, null))).rejects.toMatchObject({
        code: 'unauthenticated',
      });
    });
  });

  // ── Input validation ───────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws invalid-argument for a short BVN', async () => {
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: INVALID_BVN_SHORT }))).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });

    it('throws invalid-argument for a BVN with letters', async () => {
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: INVALID_BVN_ALPHA }))).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });

    it('throws invalid-argument when bvn is missing', async () => {
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({}))).rejects.toMatchObject({
        code: 'invalid-argument',
      });
    });
  });

  // ── Duplicate detection ────────────────────────────────────────────────────

  describe('duplicate detection', () => {
    it('throws already-exists when BVN is linked to another uid', async () => {
      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ uid: 'other-uid', type: 'bvn', status: 'verified' }) }],
      });
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: VALID_BVN }))).rejects.toMatchObject({
        code: 'already-exists',
      });
    });

    it('returns early success if same user re-verifies an already-verified BVN', async () => {
      // Duplicate found but same uid
      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ uid: MOCK_UID, type: 'bvn', status: 'verified' }) }],
      });
      // User doc shows already verified
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ verification: { bvn: { status: 'verified' } } }),
      });
      const handler = verifyBvn as Function;
      const result = await handler(makeRequest({ bvn: VALID_BVN }));
      expect(result).toMatchObject({ success: true, message: 'BVN already verified.' });
      expect(mockVerifyBvnApi).not.toHaveBeenCalled();
    });
  });

  // ── External API error ─────────────────────────────────────────────────────

  describe('VerifyMe API errors', () => {
    it('throws unavailable and writes a failed audit log when API throws', async () => {
      mockVerifyBvnApi.mockRejectedValueOnce(new Error('Network timeout'));
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: VALID_BVN }))).rejects.toMatchObject({
        code: 'unavailable',
      });
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', failureReason: 'external_api_error' })
      );
    });

    it('throws not-found when VerifyMe returns no data', async () => {
      mockVerifyBvnApi.mockResolvedValueOnce({ status: false, data: null, message: 'BVN not found' });
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: VALID_BVN }))).rejects.toMatchObject({
        code: 'not-found',
      });
    });
  });

  // ── Name matching ──────────────────────────────────────────────────────────

  describe('name matching', () => {
    it('throws failed-precondition when BVN name does not match profile', async () => {
      mockVerifyBvnApi.mockResolvedValueOnce({
        status: true,
        data: { firstName: 'Emeka', lastName: 'Nwosu', reference: 'vm-ref-002' },
      });
      const handler = verifyBvn as Function;
      await expect(handler(makeRequest({ bvn: VALID_BVN }))).rejects.toMatchObject({
        code: 'failed-precondition',
      });
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', failureReason: 'name_mismatch' })
      );
    });

    it('accepts transposed first/last name (common in Nigerian BVN records)', async () => {
      // Profile: Ada Okonkwo → BVN returns: Okonkwo Ada
      mockVerifyBvnApi.mockResolvedValueOnce({
        status: true,
        data: { firstName: 'Okonkwo', lastName: 'Ada', reference: 'vm-ref-003' },
      });
      const handler = verifyBvn as Function;
      const result = await handler(makeRequest({ bvn: VALID_BVN }));
      expect(result).toMatchObject({ success: true });
    });
  });

  // ── Success path ───────────────────────────────────────────────────────────

  describe('success path', () => {
    it('calls batch.commit() on successful verification', async () => {
      const handler = verifyBvn as Function;
      await handler(makeRequest({ bvn: VALID_BVN }));
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('returns success with last4 digits', async () => {
      const handler = verifyBvn as Function;
      const result = await handler(makeRequest({ bvn: VALID_BVN }));
      expect(result).toMatchObject({
        success: true,
        data: { last4: VALID_BVN.slice(-4) },
      });
    });

    it('writes a verified audit log entry', async () => {
      const handler = verifyBvn as Function;
      await handler(makeRequest({ bvn: VALID_BVN }));
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'verified', type: 'bvn', uid: MOCK_UID })
      );
    });

    it('does not store the raw BVN — only last4 and hash', async () => {
      const handler = verifyBvn as Function;
      await handler(makeRequest({ bvn: VALID_BVN }));

      const allCalls = [
        ...mockBatchUpdate.mock.calls,
        ...mockBatchSet.mock.calls,
        ...mockAdd.mock.calls,
      ];

      for (const [, payload] of allCalls) {
        if (payload && typeof payload === 'object') {
          // The raw BVN value must never be stored in any field
          expect(JSON.stringify(payload)).not.toContain(VALID_BVN);
        }
      }
    });
  });
});
