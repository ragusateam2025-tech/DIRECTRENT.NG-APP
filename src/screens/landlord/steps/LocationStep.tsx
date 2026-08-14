import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../../theme/tokens';
import { defaultMarket } from '../../../data/markets';
import TextField from '../../../components/TextField';
import { toTitleCase } from '../../../lib/text';
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
  // Both optional, and both worth asking. A major road is genuinely two-sided
  // information -- access on one hand, noise and dust at the gate on the other
  // -- and renters weigh those differently. A landmark is simply how Nigerians
  // navigate: an address rarely locates a place for somebody who does not
  // already know the area, and "behind Yaba Tech" does it instantly.
  const [majorRoad, setMajorRoad] = useState(draft.location?.majorRoad ?? '');
  const [landmark, setLandmark] = useState(draft.location?.landmark ?? '');
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
        // Title-cased on the way out, not as the owner types. Rewriting a field
        // under someone's cursor is how an editor makes itself hated; doing it
        // once at the step boundary fixes "14, WAEC STREET, YABA" without ever
        // fighting them mid-word.
        address: toTitleCase(address),
        area: match.area,
        lga: match.lga,
        marketId: market.id,
        state: market.state,
        // Null rather than undefined when cleared: Firestore rejects undefined,
        // and a merged write would leave the old value published.
        majorRoad: toTitleCase(majorRoad) || null,
        landmark: toTitleCase(landmark) || null,
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

      <TextField
        label="Major road nearby (optional)"
        value={majorRoad}
        onChangeText={setMajorRoad}
        placeholder="Lagos-Ibadan Expressway"
        autoCapitalize="words"
      />
      <Text style={styles.note}>
        Say the road even if it is a mixed blessing. Tenants who want the access
        will look for it, and the ones who would mind the noise would rather
        know now than after they have paid.
      </Text>

      <TextField
        label="Nearest landmark (optional)"
        value={landmark}
        onChangeText={setLandmark}
        placeholder="Behind Yaba Tech"
        autoCapitalize="words"
      />
      <Text style={styles.note}>
        Something a stranger would recognise — a market, a school, a junction, a
        bus stop. This is how people actually find an address here.
      </Text>

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
