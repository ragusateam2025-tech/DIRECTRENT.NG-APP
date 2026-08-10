import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { useAuth, friendlyAuthError } from '../../context/AuthContext';
import { emailProblem } from '../../lib/email';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    // Checked here as well as in signUp, so the message appears before an
    // account attempt rather than after one. signUp keeps its own check
    // because it is reachable from anywhere and a screen is not a guarantee.
    const emailError = emailProblem(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(fullName, email, password);
      // RootNavigator swaps to the app stack automatically.
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start renting directly.</Text>

          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Adebayo Okonkwo"
            autoCapitalize="words"
          />
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
            placeholder="At least 6 characters"
            secureTextEntry
            error={error}
          />

          <Button label="Create account" onPress={handleSignUp} loading={loading} />

          <Text style={styles.switch} onPress={() => navigation.navigate('LogIn')}>
            Already have an account? Log in
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
