import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../../../theme/tokens';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import SavingsBreakdown from '../../../components/SavingsBreakdown';
import { Chip } from './BasicInfoStep';
import type { DraftListing } from '../AddPropertyScreen';

const CAUTION_MONTHS = [6, 12, 18, 24];

/** Rent bounds from MASTER_PRD_PART2.md createListing validation. */
const MIN_RENT = 100000;
const MAX_RENT = 50000000;

export default function PricingStep({
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
  const [rent, setRent] = useState(
    draft.pricing?.annualRent ? String(draft.pricing.annualRent) : '',
  );
  const [caution, setCaution] = useState(draft.pricing?.cautionDepositMonths ?? 12);
  const [serviceCharge, setServiceCharge] = useState(
    draft.pricing?.serviceCharge ? String(draft.pricing.serviceCharge) : '0',
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
    const parsedRent = Number.parseInt(rent.replace(/\D/g, ''), 10);
    const parsedService = Number.parseInt(serviceCharge.replace(/\D/g, ''), 10);
    onChange?.({
      pricing: {
        annualRent: Number.isNaN(parsedRent) ? 0 : parsedRent,
        cautionDepositMonths: caution,
        serviceCharge: Number.isNaN(parsedService) ? 0 : parsedService,
      },
    });
  }, [rent, caution, serviceCharge, onChange]);

  const parsedRent = parseInt(rent.replace(/[^0-9]/g, ''), 10);
  const rentValid = !Number.isNaN(parsedRent) && parsedRent >= MIN_RENT && parsedRent <= MAX_RENT;

  function handleNext() {
    if (!rentValid) {
      setError(
        `Annual rent must be between ₦${MIN_RENT.toLocaleString('en-US')} and ₦${MAX_RENT.toLocaleString('en-US')}.`,
      );
      return;
    }
    const parsedService = parseInt(serviceCharge.replace(/[^0-9]/g, ''), 10);

    setError('');
    onNext({
      pricing: {
        annualRent: parsedRent,
        cautionDepositMonths: caution,
        serviceCharge: Number.isNaN(parsedService) ? 0 : parsedService,
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Set your rent</Text>

      <TextField
        label="Annual rent (₦)"
        value={rent}
        onChangeText={setRent}
        placeholder="1000000"
        keyboardType="default"
      />

      <Text style={styles.label}>Caution deposit</Text>
      <View style={styles.chips}>
        {CAUTION_MONTHS.map(m => (
          <Chip
            key={m}
            label={`${m} months`}
            selected={caution === m}
            onPress={() => setCaution(m)}
          />
        ))}
      </View>

      <TextField
        label="Service charge (₦ per year, 0 if none)"
        value={serviceCharge}
        onChangeText={setServiceCharge}
        placeholder="0"
      />

      {/* Shows the owner exactly what a tenant will see on their listing. */}
      {rentValid && (
        <>
          <Text style={styles.previewLabel}>What tenants will see</Text>
          <SavingsBreakdown annualRent={parsedRent} />
        </>
      )}

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
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  previewLabel: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
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
