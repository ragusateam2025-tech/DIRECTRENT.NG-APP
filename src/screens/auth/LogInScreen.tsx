import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { useAuth, friendlyAuthError } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'LogIn'>;

export default function LogInScreen({ navigation }: Props) {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogIn() {
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await logIn(email, password);
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ''));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue.</Text>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={error}
          />

          <Button label="Log in" onPress={handleLogIn} loading={loading} />

          <Text style={styles.switch} onPress={() => navigation.navigate('SignUp')}>
            New here? Create an account
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  switch: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
