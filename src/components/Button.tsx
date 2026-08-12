import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { spring } from '../theme/motion';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  /**
   * Strength of the haptic on press. 'medium' for actions that commit
   * something — publishing, paying, signing up.
   */
  feedback?: 'light' | 'medium';
  /** Drawn glyph shown before the label. Keeps symbols out of label strings. */
  icon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  feedback = 'light',
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    const style =
      feedback === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
    // Haptics are a courtesy, never a dependency — a device without a motor
    // (or with it disabled) must not break the button.
    Haptics.impactAsync(style).catch(() => {});
    onPress();
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        if (!isDisabled) scale.value = withSpring(0.97, spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.press);
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
        pressStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              variant === 'secondary' && styles.labelSecondary,
              !!icon && styles.labelWithIcon,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.accentCoral },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  labelSecondary: { color: colors.accentGold },
  content: { flexDirection: 'row', alignItems: 'center' },
  labelWithIcon: { marginLeft: spacing.sm },
});
