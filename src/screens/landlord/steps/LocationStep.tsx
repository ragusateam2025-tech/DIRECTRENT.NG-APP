import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../../theme/tokens';
import { defaultMarket } from '../../../data/markets';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import { Chip } from './BasicInfoStep';
import type { DraftListing } from '../AddPropertyScreen';

/**
 * Launch areas only. DIRECTRENT_MOBILE_HANDOFF.md §5.3 lists Yaba and Surulere
 * as the launch areas, and a pilot has no inventory anywhere else.
 */
const AREAS: Array<{ area: string; lga: string }> = [
  { area: 'Yaba', lga: 'Lagos Mainland' },
  { area: 'Surulere', lga: 'Surulere' },
];

export default function LocationStep({
  draft,
  onNext,
}: {
  draft: DraftListing;
  onNext: (patch: DraftListing) => void;
}) {
  const [address, setAddress] = useState(draft.location?.address ?? '');
  const [area, setArea] = useState(draft.location?.area ?? AREAS[0].area);
  const [error, setError] = useState('');

  function handleNext() {
    if (address.trim().length < 10) {
      setError('Enter the street address, at least 10 characters.');
      return;
    }
    const match = AREAS.find(a => a.area === area) ?? AREAS[0];
    setError('');
    // The market must be stamped here. Browse queries on it, so a listing saved
    // without one is invisible to every tenant.
    const market = defaultMarket();

    onNext({
      location: {
        address: address.trim(),
        area: match.area,
        lga: match.lga,
        marketId: market.id,
        state: market.state,
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Where is it?</Text>

      <TextField
        label="Street address"
        value={address}
        onChangeText={setAddress}
        placeholder="14 Shitta Street"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Area</Text>
      <View style={styles.chips}>
        {AREAS.map(a => (
          <Chip
            key={a.area}
            label={a.area}
            selected={area === a.area}
            onPress={() => setArea(a.area)}
          />
        ))}
      </View>

      <Text style={styles.note}>
        Directrent is launching in Yaba and Surulere first. More areas open as we
        grow.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.action}>
        <Button label="Continue" onPress={handleNext} />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  note: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md },
});
