import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import { setAuth } from '../store/authSlice';
import { theme } from '@directrent/shared/theme';
import { useAuth } from '../hooks/useAuth';

const ONBOARDING_KEY = 'DIRECTRENT_ONBOARDING_COMPLETE';

const PRIMARY = '#1B5E20';

/**
 * AuthGuard sits inside the Redux provider so it can dispatch.
 * It listens to Firebase auth state and routes users accordingly:
 *   - No user            → /(auth)/phone
 *   - User, no profile   → /(auth)/profile
 *   - User + profile     → /(tabs)
 */
function AuthGuard() {
  const { user, profile, loading } = useAuth();
  const dispatch = useDispatch();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  // Check AsyncStorage once on mount for first-install welcome
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        setOnboardingComplete(value === 'true');
      })
      .catch(() => {
        setOnboardingComplete(true);
      })
      .finally(() => {
        setOnboardingChecked(true);
      });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    // Sync auth state into Redux for any component that reads from the store
    dispatch(
      setAuth(
        user
          ? { uid: user.uid, phone: user.phoneNumber ?? null, profile }
          : null
      )
    );

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      if (!onboardingComplete) {
        // First install — show welcome slides
        if (segments[0] !== '(auth)' || segments[1] !== 'welcome') {
          router.replace('/(auth)/welcome');
        }
      } else {
        // Not logged in — send to phone entry
        if (!inAuthGroup) {
          router.replace('/(auth)/phone');
        }
      }
    } else if (!profile?.userType) {
      // Logged in but profile not completed
      router.replace('/(auth)/profile');
    } else {
      // Fully authenticated — leave auth screens
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading, onboardingChecked, onboardingComplete]);

  if (loading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <AuthGuard />
      </PaperProvider>
    </ReduxProvider>
  );
}
