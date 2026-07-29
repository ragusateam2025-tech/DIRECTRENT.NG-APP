import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import { Chip } from './BasicInfoStep';
import { formatNaira } from '../../../lib/format';
import type { DraftListing } from '../AddPropertyScreen';

/** Common amenities in Lagos rentals, matching the seeded listings' vocabulary. */
const AMENITIES = [
  'Prepaid meter',
  'Borehole water',
  '24-hour security',
  'Backup generator',
  'Parking space',
  'Security gate',
  'En-suite bathroom',
  'Fitted wardrobes',
  'Balcony',
  'POP ceilings',
  'Water treatment',
  'Serviced compound',
];

export default function DetailsStep({
  draft,
  onPublish,
  publishing,
}: {
  draft: DraftListing;
  onPublish: (patch: DraftListing) => void;
  publishing: boolean;
}) {
  const [description, setDescription] = useState(draft.details?.description ?? '');
  const [amenities, setAmenities] = useState<string[]>(draft.details?.amenities ?? []);
  const [maxOccupants, setMaxOccupants] = useState(
    String(draft.details?.maxOccupants ?? 3),
  );
  const [error, setError] = useState('');

  function toggleAmenity(a: string) {
    setAmenities(prev => (prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]));
  }

  function handlePublish() {
    if (description.trim().length < 50) {
      setError(
        `Describe the property in at least 50 characters — you have ${description.trim().length}.`,
      );
      return;
    }
    const occupants = parseInt(maxOccupants, 10);
    if (Number.isNaN(occupants) || occupants < 1 || occupants > 10) {
      setError('Maximum occupants must be between 1 and 10.');
      return;
    }

    setError('');
    onPublish({
      details: {
        description: description.trim(),
        amenities,
        maxOccupants: occupants,
      },
    });
  }

  const cover = draft.media?.photos?.[0];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Describe it</Text>

      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Two bedroom flat with both rooms en-suite, on a quiet residential street…"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Amenities</Text>
      <View style={styles.chips}>
        {AMENITIES.map(a => (
          <Chip
            key={a}
            label={a}
            selected={amenities.includes(a)}
            onPress={() => toggleAmenity(a)}
          />
        ))}
      </View>

      <TextField
        label="Maximum occupants"
        value={maxOccupants}
        onChangeText={setMaxOccupants}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryHeading}>Ready to submit</Text>
        <View style={styles.summaryRow}>
          {cover && <Image source={{ uri: cover }} style={styles.summaryImage} />}
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {draft.basicInfo?.title ?? 'Untitled'}
            </Text>
            <Text style={styles.summaryMeta}>
              {draft.location?.area ?? '—'} ·{' '}
              {draft.pricing?.annualRent
                ? `${formatNaira(draft.pricing.annualRent)}/year`
                : 'no rent set'}
            </Text>
            <Text style={styles.summaryMeta}>
              {draft.media?.photos?.length ?? 0} photos
            </Text>
          </View>
        </View>
        <Text style={styles.reviewNote}>
          Your listing goes to us for a quick review before tenants see it. You can
          keep editing it in the meantime.
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.action}>
        <Button
          label={publishing ? 'Submitting…' : 'Submit for review'}
          onPress={handlePublish}
          loading={publishing}
          feedback="medium"
        />
      </View>
    </ScrollView>
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
  summary: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
    marginBottom: spacing.sm,
  },
  summaryRow: { flexDirection: 'row' },
  summaryImage: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  summaryText: { flex: 1 },
  summaryTitle: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
  },
  summaryMeta: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  reviewNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.lg },
});
