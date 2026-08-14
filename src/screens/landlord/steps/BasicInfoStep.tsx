import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import TextField from '../../../components/TextField';
import { toTitleCase } from '../../../lib/text';
import Button from '../../../components/Button';
import type { DraftListing } from '../AddPropertyScreen';
import type { PropertyType, FurnishingType } from '../../../types';

const PROPERTY_TYPES: Array<{ value: PropertyType; label: string }> = [
  { value: 'self_contained', label: 'Self-contained' },
  { value: 'mini_flat', label: 'Mini flat' },
  { value: 'one_bedroom', label: '1 bedroom' },
  { value: 'two_bedroom', label: '2 bedroom' },
  { value: 'three_bedroom', label: '3 bedroom' },
];

const FURNISHING: Array<{ value: FurnishingType; label: string }> = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-furnished' },
  { value: 'furnished', label: 'Furnished' },
];

export default function BasicInfoStep({
  draft,
  onNext,
  onChange,
}: {
  draft: DraftListing;
  onNext: (patch: DraftListing) => void;
  /**
   * Called as fields change, so half-finished work survives Back and a phone
   * dying. Optional, so the step still renders anywhere it is not wired up.
   */
  onChange?: (patch: DraftListing) => void;
}) {
  const [title, setTitle] = useState(draft.basicInfo?.title ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    draft.basicInfo?.propertyType ?? 'one_bedroom',
  );
  const [bedrooms, setBedrooms] = useState(String(draft.basicInfo?.bedrooms ?? 1));
  const [bathrooms, setBathrooms] = useState(String(draft.basicInfo?.bathrooms ?? 1));
  const [furnishing, setFurnishing] = useState<FurnishingType>(
    draft.basicInfo?.furnishing ?? 'unfurnished',
  );
  const [error, setError] = useState('');

  /**
   * Reports what is typed as it is typed, so nothing is lost on the way back.
   *
   * Everything used to be captured when Continue was pressed, which meant
   * stepping back — or a phone dying — threw away the whole step. The parent
   * holds this in memory and writes it on a debounce.
   *
   * Raw values, deliberately unnormalised. Title case and sentence case are
   * applied when the step is submitted; storing the tidied version here would
   * mean somebody stepping back found their words already rewritten.
   */
  useEffect(() => {
    onChange?.({
      basicInfo: {
        title,
        propertyType,
        // Guarded, because these are strings while being typed and an empty
        // field parses to NaN — which Firestore rejects outright.
        bedrooms: Number.parseInt(bedrooms, 10) || 1,
        bathrooms: Number.parseInt(bathrooms, 10) || 1,
        furnishing,
      },
    });
  }, [title, propertyType, bedrooms, bathrooms, furnishing, onChange]);

  function handleNext() {
    if (title.trim().length < 10) {
      setError('Give the property a title of at least 10 characters.');
      return;
    }
    const beds = parseInt(bedrooms, 10);
    const baths = parseInt(bathrooms, 10);
    if (Number.isNaN(beds) || beds < 0 || beds > 10) {
      setError('Bedrooms must be a number between 0 and 10.');
      return;
    }
    if (Number.isNaN(baths) || baths < 1 || baths > 10) {
      setError('Bathrooms must be a number between 1 and 10.');
      return;
    }

    setError('');
    onNext({
      basicInfo: {
        // Title-cased at the step boundary, not as they type. A listing title
        // is a label rather than somebody's prose, so "A ROOM SELF-CONTAINED IN
        // YABA" is worth fixing -- and rewriting a field under the cursor is
        // how an editor makes itself hated.
        title: toTitleCase(title),
        propertyType,
        bedrooms: beds,
        bathrooms: baths,
        furnishing,
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Tell us about the property</Text>

      <TextField
        label="Listing title"
        value={title}
        onChangeText={setTitle}
        placeholder="Two bedroom flat, quiet Surulere street"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Property type</Text>
      <View style={styles.chips}>
        {PROPERTY_TYPES.map(t => (
          <Chip
            key={t.value}
            label={t.label}
            selected={propertyType === t.value}
            onPress={() => setPropertyType(t.value)}
          />
        ))}
      </View>

      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <TextField label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} />
        </View>
        <View style={styles.pairSpacer} />
        <View style={styles.pairItem}>
          <TextField label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} />
        </View>
      </View>

      <Text style={styles.label}>Furnishing</Text>
      <View style={styles.chips}>
        {FURNISHING.map(f => (
          <Chip
            key={f.value}
            label={f.label}
            selected={furnishing === f.value}
            onPress={() => setFurnishing(f.value)}
          />
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.action}>
        <Button label="Continue" onPress={handleNext} />
      </View>
    </ScrollView>
  );
}

export function Chip({
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
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
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
  pair: { flexDirection: 'row' },
  pairItem: { flex: 1 },
  pairSpacer: { width: spacing.md },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md },
});
