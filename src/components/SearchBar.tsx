import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilters: () => void;
  /** Shown on the filter button so the count is visible without opening it. */
  activeFilters: number;
}

export default function SearchBar({
  value,
  onChangeText,
  onOpenFilters,
  activeFilters,
}: SearchBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search Yaba, Surulere, or a street"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Search properties"
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Text style={styles.clear}>✕</Text>
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
        <Text style={[styles.filterText, activeFilters > 0 && styles.filterTextActive]}>
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </Text>
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  icon: { fontSize: 15, marginRight: spacing.xs },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    paddingVertical: 0,
  },
  clear: {
    color: colors.textMuted,
    fontSize: typography.sizes.base,
    paddingHorizontal: spacing.xs,
  },
  filterButton: {
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundPaper,
  },
  filterButtonActive: {
    borderColor: colors.accentGold,
    backgroundColor: colors.backgroundElevated,
  },
  pressed: { opacity: 0.85 },
  filterText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  filterTextActive: { color: colors.accentGold },
});
