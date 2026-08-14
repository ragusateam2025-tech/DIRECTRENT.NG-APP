import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing } from '../theme/motion';
import { IconSearch, IconClose, IconFilters } from './icons/Icon';

/** How long each suggestion holds still before the next one takes its place. */
const HOLD = 2400;

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilters: () => void;
  /** Shown on the filter button so the count is visible without opening it. */
  activeFilters: number;
  /**
   * Places to cycle through in the empty field, as a hint about what this
   * search understands.
   *
   * These must be areas that actually have properties. A rotating hint is a
   * suggestion, and a suggestion that returns "Nothing matches" teaches the
   * user the search is broken when in fact they were misdirected. The caller
   * derives them from the listings on screen for that reason.
   */
  suggestions?: string[];
}

export default function SearchBar({
  value,
  onChangeText,
  onOpenFilters,
  activeFilters,
  suggestions = [],
}: SearchBarProps) {
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);

  // Still while the field is in use. A word moving underneath the cursor as
  // someone is trying to type is the kind of animation that makes an app feel
  // busy rather than alive.
  const cycling = suggestions.length > 1 && !focused && value.length === 0;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!cycling) return;

    const tick = setInterval(() => {
      if (reduceMotion) {
        setIndex(i => (i + 1) % suggestions.length);
        return;
      }
      // Out, swap, in. The word leaves upward and the next arrives from below,
      // so the movement reads as one list advancing rather than two unrelated
      // fades.
      opacity.value = withTiming(0, { duration: duration.instant });
      lift.value = withTiming(-6, { duration: duration.instant });
      timers.current.push(
        setTimeout(() => {
          setIndex(i => (i + 1) % suggestions.length);
          lift.value = 6;
          opacity.value = withTiming(1, { duration: duration.quick });
          lift.value = withTiming(0, { duration: duration.quick, easing: easing.out });
        }, duration.instant),
      );
    }, HOLD);

    return () => {
      clearInterval(tick);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [cycling, reduceMotion, suggestions.length, opacity, lift]);

  // Reset to a clean, fully visible state whenever cycling stops, so a hint
  // caught mid-fade does not stay half-transparent while the field sits idle.
  useEffect(() => {
    if (!cycling) {
      opacity.value = 1;
      lift.value = 0;
    }
  }, [cycling, opacity, lift]);

  const hintStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  const suggestion = suggestions[index % Math.max(suggestions.length, 1)];

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <View style={styles.icon}>
          <IconSearch size={17} color={colors.textMuted} />
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // The rotating hint replaces the placeholder rather than sitting
            // beside it. Two greyed strings in one field is a field nobody can
            // read.
            placeholder={suggestion ? undefined : 'Search an area or a street'}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel="Search properties by area or street"
          />
          {/* Sits over the empty field, never in front of it: no touches, and
              invisible to a screen reader, which gets the full description from
              the input's own label instead of a word that changes every two
              seconds. */}
          {!!suggestion && value.length === 0 && (
            <Animated.View
              style={[styles.hint, hintStyle]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.hintText} numberOfLines={1}>
                Try <Text style={styles.hintTerm}>{suggestion}</Text>
              </Text>
            </Animated.View>
          )}
        </View>
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <View style={styles.clear}>
              <IconClose size={15} color={colors.textMuted} />
            </View>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={
          activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'
        }
        style={({ pressed }) => [
          styles.filterButton,
          activeFilters > 0 && styles.filterButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.filterInner}>
          <IconFilters size={16} color={activeFilters > 0 ? colors.accentGold : colors.textSecondary} />
          <Text style={[styles.filterText, activeFilters > 0 && styles.filterTextActive]}>
            {activeFilters > 0 ? String(activeFilters) : 'Filter'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  icon: { marginRight: spacing.xs },
  inputWrap: { flex: 1, justifyContent: 'center' },
  input: {
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    paddingVertical: 0,
  },
  /**
   * Absolute so the hint occupies no layout of its own — the input keeps its
   * exact position whether a suggestion is showing or not, and nothing shifts
   * as the words change.
   */
  hint: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  hintText: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
  },
  /** The place itself, brighter than the framing word around it. */
  hintTerm: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
  },
  clear: { paddingHorizontal: spacing.xs },
  filterButton: {
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundPaper,
  },
  filterButtonActive: {
    borderColor: colors.accentGold,
    backgroundColor: colors.backgroundElevated,
  },
  pressed: { opacity: 0.85 },
  filterInner: { flexDirection: 'row', alignItems: 'center' },
  filterText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
  },
  filterTextActive: { color: colors.accentGold },
});
