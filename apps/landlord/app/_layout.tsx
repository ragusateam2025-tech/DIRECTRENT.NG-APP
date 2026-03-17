import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { store } from '../store';
import { theme } from '@directrent/shared/theme';
import { useAuth } from '../hooks/useAuth';
import { setAuth } from '../store/authSlice';

function AuthGuard() {
  const { user, profile, loading } = useAuth();
  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    dispatch(
      setAuth(
        user
          ? {
              uid: user.uid,
              phone: user.phoneNumber ?? null,
              profile,
            }
          : null
      )
    );

    const inAuthGroup = segments[0] === '(auth)';
    const inVerificationGroup = segments[0] === '(verification)';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/phone');
      }
    } else if (!profile?.userType) {
      router.replace('/(auth)/profile');
    } else {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </PaperProvider>
    </ReduxProvider>
  );
}
