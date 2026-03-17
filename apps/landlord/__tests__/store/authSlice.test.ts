import authReducer, { setAuth, setProfile, setLoading } from '../../store/authSlice';
import type { AuthState } from '../../store/authSlice';
import type { UserProfile } from '../../services/auth.service';

const mockProfile: UserProfile = {
  uid: 'landlord_001',
  phone: '+2348055555555',
  firstName: 'Tunde',
  lastName: 'Bakare',
  email: 'tunde@test.com',
  photoUrl: null,
  userType: 'landlord',
  profileComplete: true,
  profileCompleteness: 100,
  verification: {
    bvn: { status: 'verified' },
    nin: { status: 'pending' },
    phone: { verified: true },
    email: { verified: true },
  },
};

describe('authSlice', () => {
  const initialState: AuthState = {
    uid: null,
    phone: null,
    profile: null,
    isAuthenticated: false,
    loading: true,
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  describe('setAuth', () => {
    it('sets authenticated state with valid payload', () => {
      const state = authReducer(
        initialState,
        setAuth({ uid: 'landlord_001', phone: '+2348055555555', profile: mockProfile })
      );
      expect(state.uid).toBe('landlord_001');
      expect(state.phone).toBe('+2348055555555');
      expect(state.profile).toEqual(mockProfile);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('clears state when payload is null (sign out)', () => {
      const loggedIn: AuthState = {
        uid: 'landlord_001',
        phone: '+2348055555555',
        profile: mockProfile,
        isAuthenticated: true,
        loading: false,
      };
      const state = authReducer(loggedIn, setAuth(null));
      expect(state.uid).toBeNull();
      expect(state.phone).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('sets loading to false regardless of payload', () => {
      const state = authReducer({ ...initialState, loading: true }, setAuth(null));
      expect(state.loading).toBe(false);
    });
  });

  describe('setProfile', () => {
    it('updates profile without changing other fields', () => {
      const current: AuthState = {
        uid: 'landlord_001',
        phone: '+2348055555555',
        profile: null,
        isAuthenticated: true,
        loading: false,
      };
      const state = authReducer(current, setProfile(mockProfile));
      expect(state.profile).toEqual(mockProfile);
      expect(state.uid).toBe('landlord_001');
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears profile when payload is null', () => {
      const current: AuthState = {
        uid: 'landlord_001',
        phone: '+2348055555555',
        profile: mockProfile,
        isAuthenticated: true,
        loading: false,
      };
      const state = authReducer(current, setProfile(null));
      expect(state.profile).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const state = authReducer(
        { ...initialState, loading: false },
        setLoading(true)
      );
      expect(state.loading).toBe(true);
    });

    it('sets loading to false', () => {
      const state = authReducer(initialState, setLoading(false));
      expect(state.loading).toBe(false);
    });
  });
});
