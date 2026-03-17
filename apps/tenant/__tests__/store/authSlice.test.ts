import authReducer, { setAuth, setProfile, setLoading } from '../../store/authSlice';
import type { AuthState } from '../../store/authSlice';
import type { UserProfile } from '../../services/auth.service';

const mockProfile: UserProfile = {
  uid: 'uid-123',
  phone: '+2348012345678',
  firstName: 'Ada',
  lastName: 'Okonkwo',
  email: 'ada@example.com',
  photoUrl: null,
  userType: 'tenant',
  profileComplete: true,
  profileCompleteness: 40,
  verification: {
    bvn: { status: 'pending' },
    nin: { status: 'pending' },
    phone: { verified: true },
    email: { verified: false },
  },
};

const initialState: AuthState = {
  uid: null,
  phone: null,
  profile: null,
  isAuthenticated: false,
  loading: true,
};

describe('authSlice', () => {
  describe('initial state', () => {
    it('has the correct default values', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setAuth', () => {
    it('sets uid, phone, profile and marks isAuthenticated true for non-null payload', () => {
      const state = authReducer(
        initialState,
        setAuth({ uid: 'uid-123', phone: '+2348012345678', profile: mockProfile })
      );
      expect(state.uid).toBe('uid-123');
      expect(state.phone).toBe('+2348012345678');
      expect(state.profile).toEqual(mockProfile);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('accepts null phone in the payload', () => {
      const state = authReducer(initialState, setAuth({ uid: 'uid-456', phone: null, profile: null }));
      expect(state.uid).toBe('uid-456');
      expect(state.phone).toBeNull();
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears all auth fields when payload is null (sign out)', () => {
      const authenticated: AuthState = {
        uid: 'uid-123',
        phone: '+2348012345678',
        profile: mockProfile,
        isAuthenticated: true,
        loading: false,
      };
      const state = authReducer(authenticated, setAuth(null));
      expect(state.uid).toBeNull();
      expect(state.phone).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('sets loading to false in both null and non-null cases', () => {
      expect(authReducer(initialState, setAuth({ uid: 'x', phone: null, profile: null })).loading).toBe(false);
      expect(authReducer(initialState, setAuth(null)).loading).toBe(false);
    });
  });

  describe('setProfile', () => {
    it('updates profile without touching other fields', () => {
      const current: AuthState = {
        uid: 'uid-123',
        phone: '+2348012345678',
        profile: null,
        isAuthenticated: true,
        loading: false,
      };
      const state = authReducer(current, setProfile(mockProfile));
      expect(state.profile).toEqual(mockProfile);
      expect(state.uid).toBe('uid-123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets profile to null', () => {
      const withProfile: AuthState = { ...initialState, profile: mockProfile };
      const state = authReducer(withProfile, setProfile(null));
      expect(state.profile).toBeNull();
    });

    it('reflects updated profileCompleteness', () => {
      const updated: UserProfile = { ...mockProfile, profileCompleteness: 80 };
      const state = authReducer(initialState, setProfile(updated));
      expect(state.profile?.profileCompleteness).toBe(80);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const state = authReducer({ ...initialState, loading: false }, setLoading(true));
      expect(state.loading).toBe(true);
    });

    it('sets loading to false', () => {
      const state = authReducer(initialState, setLoading(false));
      expect(state.loading).toBe(false);
    });

    it('does not touch other state fields', () => {
      const authenticated: AuthState = {
        uid: 'uid-123',
        phone: '+2348012345678',
        profile: mockProfile,
        isAuthenticated: true,
        loading: true,
      };
      const state = authReducer(authenticated, setLoading(false));
      expect(state.uid).toBe('uid-123');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('action creators', () => {
    it('setAuth creates action with correct type', () => {
      expect(setAuth(null).type).toBe('auth/setAuth');
    });

    it('setProfile creates action with correct type', () => {
      expect(setProfile(null).type).toBe('auth/setProfile');
    });

    it('setLoading creates action with correct type', () => {
      expect(setLoading(true).type).toBe('auth/setLoading');
    });
  });
});
