import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../theme/tokens';

interface EmptyStateProps {
  icon: string;
  title: string;
  body: string;
}

export default function EmptyState({ icon, title, body }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
