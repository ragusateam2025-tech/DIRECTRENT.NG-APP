import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { useAuth, friendlyAuthError } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'LogIn'>;

export default function LogInScreen({ navigation }: Props) {
  const { logIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  /**
   * Sends a reset link to whatever is in the email box.
   *
   * Uses the field rather than asking again, because someone reaching for this
   * has usually already typed their address and failed to log in with it.
   *
   * The confirmation never says whether an account exists. "No account for that
   * address" tells anyone who asks which emails are registered here, and the
   * people most likely to ask are not the people who forgot their password.
   */
  async function handleForgotPassword() {
    setError('');

    if (resetting) return;
    setResetting(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Check your email',
        `If an account exists for ${email.trim()}, a link to set a new password is on its way. It may take a minute, and it may land in spam.`,
      );
    } catch (err: any) {
      setError(
        err?.code === 'app/email-rejected'
          ? err.message
          : friendlyAuthError(err?.code ?? ''),
      );
    } finally {
      setResetting(false);
    }
  }

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

          {/* Under the password, where the person who needs it is already
              looking. Placed before the log-in button rather than after,
              because someone who cannot remember their password is not about
              to press Log in. */}
          <Text
            style={styles.forgot}
            onPress={handleForgotPassword}
            accessibilityRole="button"
          >
            Forgot your password?
          </Text>

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
  // Right-aligned and quieter than the primary action: available to the person
  // hunting for it, not competing with the button everyone else came to press.
  forgot: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
});
