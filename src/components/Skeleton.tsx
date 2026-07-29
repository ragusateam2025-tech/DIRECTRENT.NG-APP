import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '../theme/tokens';

/**
 * A shimmering placeholder block.
 *
 * A sweep of light travels across a muted surface, which reads as "content is
 * coming" rather than the ambiguous "something is happening" of a spinner. It
 * also holds the layout, so nothing jumps when real content arrives.
 */
export function SkeletonBlock({
  width,
  height,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-220, 220]) }],
  }));

  return (
    <View
      style={[{ width, height, borderRadius: radius.sm }, styles.base, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** A placeholder shaped like a PropertyCard, used while listings load. */
export function PropertyCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width="100%" height={180} style={styles.image} />
      <View style={styles.body}>
        <SkeletonBlock width="85%" height={18} />
        <SkeletonBlock width="40%" height={13} style={styles.gap} />
        <SkeletonBlock width="55%" height={24} style={styles.gapLarge} />
        <SkeletonBlock width="45%" height={22} style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.backgroundElevated, overflow: 'hidden' },
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: { borderRadius: 0 },
  body: { padding: spacing.md },
  gap: { marginTop: spacing.sm },
  gapLarge: { marginTop: spacing.md },
});
