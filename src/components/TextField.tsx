import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { IconEye, IconEyeOff } from './icons/Icon';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  error?: string;
}

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
}: TextFieldProps) {
  /**
   * Whether a password field is currently showing its contents.
   *
   * Every password box in the app is this component, so the toggle belongs
   * here rather than being rebuilt at each of the four call sites.
   *
   * Starts hidden, always. Someone typing a password on a bus should have to
   * ask to reveal it, and the state is deliberately not remembered between
   * screens — a field that opens revealed because of something the user did
   * ten minutes ago on another screen is a nasty surprise.
   */
  const [revealed, setRevealed] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !revealed}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          style={[styles.input, isPassword && styles.inputWithAction, !!error && styles.inputError]}
          accessibilityLabel={label}
        />

        {isPassword && (
          <Pressable
            onPress={() => setRevealed(v => !v)}
            // The icon is 20px; the target around it is the full height of the
            // field, because a 20px tap target is a miss on a phone.
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: revealed }}
            style={styles.action}
          >
            {revealed ? (
              <IconEyeOff size={20} color={colors.accentGold} />
            ) : (
              <IconEye size={20} color={colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
  // Room for the eye, so a long password does not run underneath it.
  inputWithAction: { paddingRight: spacing.xl + spacing.md },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: { borderColor: colors.error },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
});
