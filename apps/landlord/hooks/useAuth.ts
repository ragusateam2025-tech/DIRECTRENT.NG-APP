import { useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { AuthService, UserProfile } from '../services/auth.service';

export interface AuthState {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isIdentityVerified: () => boolean;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await AuthService.getUserProfile(user.uid);
          setState({ user, profile, loading: false, error: null });
        } catch {
          setState({ user, profile: null, loading: false, error: 'Failed to load profile' });
        }
      } else {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await AuthService.signOut();
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    try {
      const profile = await AuthService.getUserProfile(state.user.uid);
      setState((prev) => ({ ...prev, profile }));
    } catch {
      // Silently fail on refresh
    }
  };

  const isIdentityVerified = (): boolean => {
    if (!state.profile) return false;
    return (
      state.profile.verification.bvn.status === 'verified' ||
      state.profile.verification.nin.status === 'verified'
    );
  };

  return { ...state, signOut, refreshProfile, isIdentityVerified };
}
