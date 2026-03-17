const mockConfirm = jest.fn();
const mockSignInWithPhoneNumber = jest.fn();
const mockSignOut = jest.fn();
const mockGet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn(() => ({
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
}));
const mockDoc = jest.fn(() => ({ id: 'mock-doc-id' }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('@react-native-firebase/auth', () => () => ({
  signInWithPhoneNumber: mockSignInWithPhoneNumber,
  signOut: mockSignOut,
}));

jest.mock('@react-native-firebase/firestore', () => {
  const firestoreFn = () => ({
    collection: mockCollection,
    batch: mockBatch,
  });
  firestoreFn.FieldValue = {
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  };
  return firestoreFn;
});

import { AuthService } from '../../services/auth.service';

const VALID_PHONE_LOCAL = '08012345678';
const VALID_PHONE_INTL = '+2348012345678';
const INVALID_PHONE = '12345';
const MOCK_UID = 'uid-abc-123';
const MOCK_OTP = '123456';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.clearConfirmation();
  });

  describe('sendOTP', () => {
    it('normalises local phone to +234 and calls Firebase', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP(VALID_PHONE_LOCAL);
      expect(mockSignInWithPhoneNumber).toHaveBeenCalledWith(VALID_PHONE_INTL);
    });

    it('stores confirmation result', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      expect(AuthService.hasPendingConfirmation()).toBe(false);
      await AuthService.sendOTP(VALID_PHONE_LOCAL);
      expect(AuthService.hasPendingConfirmation()).toBe(true);
    });

    it('throws for invalid phone numbers', async () => {
      await expect(AuthService.sendOTP(INVALID_PHONE)).rejects.toThrow(
        'valid Nigerian phone number'
      );
      expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('returns the confirmation result', async () => {
      const confirmation = { confirm: mockConfirm };
      mockSignInWithPhoneNumber.mockResolvedValueOnce(confirmation);
      const result = await AuthService.sendOTP(VALID_PHONE_LOCAL);
      expect(result).toBe(confirmation);
    });
  });

  describe('verifyOTP', () => {
    beforeEach(async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP(VALID_PHONE_LOCAL);
    });

    it('throws if no pending confirmation', async () => {
      AuthService.clearConfirmation();
      await expect(AuthService.verifyOTP(MOCK_OTP)).rejects.toThrow('No pending verification');
    });

    it('throws for non-6-digit OTP', async () => {
      await expect(AuthService.verifyOTP('123')).rejects.toThrow('6-digit code');
      await expect(AuthService.verifyOTP('1234567')).rejects.toThrow('6-digit code');
      await expect(AuthService.verifyOTP('abcdef')).rejects.toThrow('6-digit code');
    });

    it('calls confirm with the OTP', async () => {
      mockConfirm.mockResolvedValueOnce({ user: { uid: MOCK_UID } });
      await AuthService.verifyOTP(MOCK_OTP);
      expect(mockConfirm).toHaveBeenCalledWith(MOCK_OTP);
    });

    it('clears pending confirmation after verify', async () => {
      mockConfirm.mockResolvedValueOnce({ user: { uid: MOCK_UID } });
      await AuthService.verifyOTP(MOCK_OTP);
      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });
  });

  describe('getUserProfile', () => {
    it('returns profile data when document exists', async () => {
      const profileData = { uid: MOCK_UID, firstName: 'Ada', userType: 'tenant' };
      mockDoc.mockReturnValueOnce({ get: mockGet });
      mockGet.mockResolvedValueOnce({ exists: true, data: () => profileData });
      mockCollection.mockReturnValueOnce({ doc: mockDoc });

      const profile = await AuthService.getUserProfile(MOCK_UID);
      expect(profile).toEqual(profileData);
    });

    it('returns null when document does not exist', async () => {
      mockDoc.mockReturnValueOnce({ get: mockGet });
      mockGet.mockResolvedValueOnce({ exists: false, data: () => null });
      mockCollection.mockReturnValueOnce({ doc: mockDoc });

      const profile = await AuthService.getUserProfile('unknown');
      expect(profile).toBeNull();
    });
  });

  describe('hasPendingConfirmation / clearConfirmation', () => {
    it('returns false initially', () => {
      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });

    it('clearConfirmation resets to false', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP(VALID_PHONE_LOCAL);
      expect(AuthService.hasPendingConfirmation()).toBe(true);
      AuthService.clearConfirmation();
      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });
  });

  describe('signOut', () => {
    it('calls firebase signOut', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);
      await AuthService.signOut();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('clears pending confirmation on sign out', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP(VALID_PHONE_LOCAL);
      mockSignOut.mockResolvedValueOnce(undefined);
      await AuthService.signOut();
      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });
  });

  describe('createProfile', () => {
    beforeEach(() => {
      mockBatchCommit.mockResolvedValue(undefined);
      mockDoc.mockReturnValue({ id: 'mock-doc-id' });
      mockCollection.mockReturnValue({ doc: mockDoc });
    });

    it('calls batch.commit() for tenant profile', async () => {
      await AuthService.createProfile(MOCK_UID, {
        userType: 'tenant', firstName: 'Ada', lastName: 'Okonkwo', email: 'ada@test.com',
      });
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('stores _searchName as lowercase for tenant', async () => {
      await AuthService.createProfile(MOCK_UID, {
        userType: 'tenant', firstName: 'Ada', lastName: 'Okonkwo', email: 'ada@test.com',
      });
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ _searchName: 'ada okonkwo' })
      );
    });

    it('calls batch.commit() for landlord profile', async () => {
      await AuthService.createProfile(MOCK_UID, {
        userType: 'landlord', firstName: 'Tunde', lastName: 'Bakare', email: 'tunde@test.com',
      });
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });
});
