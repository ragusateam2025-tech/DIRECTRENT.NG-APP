import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { testFirestoreConnection, getProjectId } from '../lib/firebase';

type Status = 'loading' | 'success' | 'error';

export default function FirebaseHealthCheck() {
  const [status, setStatus] = useState<Status>('loading');
  const [projectId, setProjectId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function runCheck() {
      try {
        setProjectId(getProjectId());
        await testFirestoreConnection();
        setStatus('success');
      } catch (err: any) {
        setErrorMessage(err?.message ?? String(err));
        setStatus('error');
      }
    }
    runCheck();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkDirect}>Direct</Text>
          <Text style={styles.wordmarkRent}>rent</Text>
        </Text>
        <Text style={styles.subtitle}>Firebase Connectivity Test</Text>
      </View>

      <View style={styles.center}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.accentCoral} />
            <Text style={styles.loadingText}>Connecting to Firebase...</Text>
          </>
        )}

        {status === 'success' && (
          <View style={styles.resultBox}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.successText}>Firebase Connected</Text>
            <Text style={styles.projectIdText}>Project: {projectId}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.resultBox}>
            <Text style={styles.errorIcon}>✗</Text>
            <Text style={styles.errorTitle}>Connection Failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  wordmark: {
    fontSize: typography.sizes['4xl'],
    fontFamily: typography.families.display,
  },
  wordmarkDirect: {
    color: colors.textPrimary,
  },
  wordmarkRent: {
    color: colors.accentGold,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    marginTop: spacing.md,
  },
  resultBox: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  checkmark: {
    fontSize: 64,
    color: colors.success,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.families.heading,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  projectIdText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 64,
    color: colors.accentCoral,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.families.heading,
    color: colors.accentCoral,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.accentCoral,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
