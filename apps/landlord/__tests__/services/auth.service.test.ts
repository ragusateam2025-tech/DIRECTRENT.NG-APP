/**
 * Tests for landlord AuthService.
 * Firebase modules and shared utils are mocked.
 */

// ─── Mocks ─────────────────────────────────────────────────────────────────
const mockConfirm = jest.fn();
const mockSignInWithPhoneNumber = jest.fn();
const mockSignOut = jest.fn();
const mockGet = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  const authInstance = {
    signInWithPhoneNumber: mockSignInWithPhoneNumber,
    signOut: mockSignOut,
  };
  const authFn = () => authInstance;
  return authFn;
});

jest.mock('@react-native-firebase/firestore', () => {
  const firestoreInstance = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: mockGet,
  };
  const firestoreFn = () => firestoreInstance;
  firestoreFn.FieldValue = { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') };
  return firestoreFn;
});

jest.mock('@directrent/shared', () => ({
  normalizePhone: jest.fn((phone: string) =>
    phone.startsWith('+234') ? phone : `+234${phone.slice(1)}`
  ),
  isValidNigerianPhone: jest.fn((phone: string) =>
    /^\+234[789][01]\d{8}$/.test(phone)
  ),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────
import { AuthService } from '../../services/auth.service';

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.clearConfirmation();
  });

  describe('sendOTP', () => {
    it('normalizes phone and calls signInWithPhoneNumber', async () => {
      const confirmation = { confirm: mockConfirm };
      mockSignInWithPhoneNumber.mockResolvedValueOnce(confirmation);

      const result = await AuthService.sendOTP('08055555555');

      expect(mockSignInWithPhoneNumber).toHaveBeenCalledWith('+2348055555555');
      expect(result).toBe(confirmation);
    });

    it('stores confirmation for later use', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      expect(AuthService.hasPendingConfirmation()).toBe(false);

      await AuthService.sendOTP('08055555555');

      expect(AuthService.hasPendingConfirmation()).toBe(true);
    });

    it('throws for invalid phone number', async () => {
      await expect(AuthService.sendOTP('12345')).rejects.toThrow(
        'valid Nigerian phone number'
      );
      expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
    });
  });

  describe('verifyOTP', () => {
    it('confirms OTP when pending confirmation exists', async () => {
      const mockCredential = { user: { uid: 'landlord_001' } };
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      mockConfirm.mockResolvedValueOnce(mockCredential);

      await AuthService.sendOTP('08055555555');
      const result = await AuthService.verifyOTP('123456');

      expect(mockConfirm).toHaveBeenCalledWith('123456');
      expect(result).toBe(mockCredential);
    });

    it('clears confirmation after successful verify', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      mockConfirm.mockResolvedValueOnce({ user: { uid: 'landlord_001' } });

      await AuthService.sendOTP('08055555555');
      await AuthService.verifyOTP('123456');

      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });

    it('throws when no pending confirmation', async () => {
      await expect(AuthService.verifyOTP('123456')).rejects.toThrow(
        'No pending verification'
      );
    });

    it('throws for non-6-digit OTP', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP('08055555555');

      await expect(AuthService.verifyOTP('12345')).rejects.toThrow(
        '6-digit code'
      );
    });
  });

  describe('getUserProfile', () => {
    it('returns profile when document exists', async () => {
      const profileData = {
        uid: 'landlord_001',
        firstName: 'Tunde',
        userType: 'landlord',
      };
      mockGet.mockResolvedValueOnce({ exists: true, data: () => profileData });

      const result = await AuthService.getUserProfile('landlord_001');
      expect(result).toEqual(profileData);
    });

    it('returns null when document does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false, data: () => null });

      const result = await AuthService.getUserProfile('unknown_uid');
      expect(result).toBeNull();
    });
  });

  describe('hasPendingConfirmation / clearConfirmation', () => {
    it('returns false initially', () => {
      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });

    it('clearConfirmation resets state', async () => {
      mockSignInWithPhoneNumber.mockResolvedValueOnce({ confirm: mockConfirm });
      await AuthService.sendOTP('08055555555');
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
      await AuthService.sendOTP('08055555555');

      mockSignOut.mockResolvedValueOnce(undefined);
      await AuthService.signOut();

      expect(AuthService.hasPendingConfirmation()).toBe(false);
    });
  });
});
