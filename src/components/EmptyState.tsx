import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '../theme/tokens';
import { duration } from '../theme/motion';
import BrandIllustration, { type IllustrationVariant } from './BrandIllustration';

interface EmptyStateProps {
  title: string;
  body: string;
  /** Which state the direct-line mark should express. */
  variant?: IllustrationVariant;
}

export default function EmptyState({ title, body, variant = 'empty' }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.wrapper}>
      <BrandIllustration variant={variant} size={130} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
    marginTop: spacing.lg,
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
