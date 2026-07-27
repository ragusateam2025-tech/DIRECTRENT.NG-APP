import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LogInScreen from '../screens/auth/LogInScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import AppTabs from './AppTabs';

export type AuthStackParams = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParams>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.backgroundPaper,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accentGold,
  },
};

export default function RootNavigator() {
  const { profile, initialising } = useAuth();

  if (initialising) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!profile ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="LogIn" component={LogInScreen} />
        </Stack.Navigator>
      ) : !profile.roleChosen ? (
        <RoleSelectionScreen />
      ) : (
        <AppTabs />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
