import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../services/auth.service';

interface AuthState {
  uid: string | null;
  phone: string | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  uid: null,
  phone: null,
  profile: null,
  isAuthenticated: false,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{
        uid: string;
        phone: string | null;
        profile: UserProfile | null;
      } | null>
    ) {
      if (action.payload) {
        state.uid = action.payload.uid;
        state.phone = action.payload.phone;
        state.profile = action.payload.profile;
        state.isAuthenticated = true;
      } else {
        state.uid = null;
        state.phone = null;
        state.profile = null;
        state.isAuthenticated = false;
      }
      state.loading = false;
    },
    setProfile(state, action: PayloadAction<UserProfile | null>) {
      state.profile = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setAuth, setProfile, setLoading } = authSlice.actions;
export type { AuthState };
export default authSlice.reducer;
