import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { IconSearch, IconClose, IconFilters } from './icons/Icon';

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
        <View style={styles.icon}>
          <IconSearch size={17} color={colors.textMuted} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search an area or a street"
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
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    paddingVertical: 0,
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
