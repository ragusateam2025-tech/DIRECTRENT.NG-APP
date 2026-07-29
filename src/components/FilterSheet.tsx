import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from './Button';
import {
  EMPTY_FILTERS,
  PRICE_BANDS,
  SORT_LABELS,
  hasActiveFilters,
  applyFilters,
  type Filters,
  type PriceBand,
  type SortOption,
} from '../lib/listingFilter';
import type { Listing } from '../types';

interface FilterSheetProps {
  visible: boolean;
  filters: Filters;
  areas: string[];
  /**
   * The full set, so the count on the apply button reflects the selection being
   * edited rather than the one already applied. Passing a precomputed number
   * would leave the button stale the moment an option is tapped.
   */
  listings: Listing[];
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

const BEDROOM_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
];

export default function FilterSheet({
  visible,
  filters,
  areas,
  listings,
  onApply,
  onClose,
}: FilterSheetProps) {
  // Edited locally so closing without applying discards the changes.
  const [draft, setDraft] = useState<Filters>(filters);

  // Re-seed whenever the sheet opens, so it always reflects what is actually applied.
  React.useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  // Live count for the selection being edited, so the button tells the user
  // what tapping it will actually produce.
  const previewCount = useMemo(
    () => applyFilters(listings, draft).length,
    [listings, draft],
  );

  function toggleArea(area: string) {
    setDraft(d => ({
      ...d,
      areas: d.areas.includes(area) ? d.areas.filter(a => a !== area) : [...d.areas, area],
    }));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close filters" />

        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            {hasActiveFilters(draft) && (
              <Pressable
                onPress={() => setDraft({ ...EMPTY_FILTERS, query: draft.query })}
                accessibilityRole="button"
              >
                <Text style={styles.clearAll}>Clear all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.label}>Area</Text>
            <View style={styles.chips}>
              {areas.map(area => (
                <Option
                  key={area}
                  label={area}
                  selected={draft.areas.includes(area)}
                  onPress={() => toggleArea(area)}
                />
              ))}
            </View>

            <Text style={styles.label}>Bedrooms</Text>
            <View style={styles.chips}>
              {BEDROOM_OPTIONS.map(option => (
                <Option
                  key={String(option.value)}
                  label={option.label}
                  selected={draft.bedrooms === option.value}
                  onPress={() => setDraft(d => ({ ...d, bedrooms: option.value }))}
                />
              ))}
            </View>

            <Text style={styles.label}>Annual rent</Text>
            <View style={styles.chips}>
              {PRICE_BANDS.map(band => (
                <Option
                  key={band.value}
                  label={band.label}
                  selected={draft.priceBand === band.value}
                  onPress={() => setDraft(d => ({ ...d, priceBand: band.value as PriceBand }))}
                />
              ))}
            </View>

            <Text style={styles.label}>Sort by</Text>
            <View style={styles.chips}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
                <Option
                  key={option}
                  label={SORT_LABELS[option]}
                  selected={draft.sort === option}
                  onPress={() => setDraft(d => ({ ...d, sort: option }))}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={
                previewCount === 0
                  ? 'No matches — widen your search'
                  : previewCount === 1
                    ? 'Show 1 property'
                    : `Show ${previewCount} properties`
              }
              onPress={() => onApply(draft)}
              disabled={previewCount === 0}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: colors.backgroundPaper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  clearAll: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  body: { padding: spacing.md },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  chipText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  chipTextSelected: { color: colors.accentGold },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
