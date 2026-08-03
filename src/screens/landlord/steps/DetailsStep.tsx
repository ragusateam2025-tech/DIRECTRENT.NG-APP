import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, Pressable} from 'react-native';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import TextField from '../../../components/TextField';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/Button';
import { Chip } from './BasicInfoStep';
import { formatNaira } from '../../../lib/format';
import { formatNigerianPhone } from '../../../lib/phone';
import { IconCheck } from '../../../components/icons/Icon';
import { AMENITY_GROUPS } from '../../../data/amenities';
import type { DraftListing } from '../AddPropertyScreen';


export default function DetailsStep({
  draft,
  onPublish,
  publishing,
}: {
  draft: DraftListing;
  onPublish: (patch: DraftListing) => void;
  publishing: boolean;
}) {
  const { profile } = useAuth();
  const [description, setDescription] = useState(draft.details?.description ?? '');
  const [amenities, setAmenities] = useState<string[]>(draft.details?.amenities ?? []);
  const [maxOccupants, setMaxOccupants] = useState(
    String(draft.details?.maxOccupants ?? 3),
  );
  const [error, setError] = useState('');
  // Defaults to off. Sharing a personal number should be a deliberate yes,
  // never something an owner discovers they agreed to by not noticing.
  const [callable, setCallable] = useState(!!draft.ownerPhone);
  // Null until answered, so "not stated" stays distinct from "no".
  const [ownerOccupied, setOwnerOccupied] = useState<boolean | null>(
    draft.ownerOccupied ?? null,
  );

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
      // Explicitly null rather than undefined when off. Firestore rejects
      // undefined outright, and a merged write would leave a previously
      // shared number published after the owner turned the choice off.
      ownerPhone: callable && profile?.phone ? profile.phone : null,
      // Omitted entirely when unanswered — Firestore rejects undefined, and an
      // unanswered question must not be stored as a "no".
      ...(ownerOccupied === null ? {} : { ownerOccupied }),
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
        autoCapitalize="sentences"
      />

      <Text style={styles.label}>Amenities</Text>
      {/* Grouped so an owner scans one category at a time instead of reading
          forty chips in a row looking for the one they want. */}
      {AMENITY_GROUPS.map(group => (
        <View key={group.id}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.chips}>
            {group.items.map(a => (
              <Chip
                key={a}
                label={a}
                selected={amenities.includes(a)}
                onPress={() => toggleAmenity(a)}
              />
            ))}
          </View>
        </View>
      ))}

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
          Your listing goes live as soon as you publish it. Editing a published
          listing is not possible yet — check it over before you publish.
        </Text>
      </View>

      {/*
        Asked plainly because it changes the tenancy more than most facilities
        do. An owner on site means house rules and less privacy, and also
        faster repairs and someone accountable. Neither answer is the better
        one — leaving it unanswered is what costs a tenant a wasted journey.
      */}
      <Text style={styles.heading}>Do you live on the property?</Text>
      <Text style={styles.consentNote}>
        Tenants ask this at every viewing. Answering here saves them a journey
        across Lagos and saves you the same conversation each time.
      </Text>
      <View style={styles.chips}>
        <Chip
          label="Yes, I live here"
          selected={ownerOccupied === true}
          onPress={() => setOwnerOccupied(true)}
        />
        <Chip
          label="No, I live elsewhere"
          selected={ownerOccupied === false}
          onPress={() => setOwnerOccupied(false)}
        />
      </View>

      <Text style={styles.heading}>Can tenants call you?</Text>

      {profile?.phone ? (
        <Pressable
          onPress={() => setCallable(current => !current)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: callable }}
          accessibilityLabel={`Let tenants call me on ${formatNigerianPhone(profile.phone)}`}
          style={({ pressed }) => [styles.consent, pressed && styles.consentPressed]}
        >
          <View style={[styles.box, callable && styles.boxChecked]}>
            {callable && <IconCheck size={14} color={colors.primaryDark} />}
          </View>
          <View style={styles.consentCopy}>
            <Text style={styles.consentLabel}>
              Let tenants call me on {formatNigerianPhone(profile.phone)}
            </Text>
            <Text style={styles.consentNote}>
              Anyone viewing this listing will see your number and can ring you
              directly. Leave it off and tenants can still message you in the app.
            </Text>
          </View>
        </Pressable>
      ) : (
        <Text style={styles.consentNote}>
          Add a phone number to your profile first, and you can let tenants call you
          about this property.
        </Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.action}>
        <Button
          label={publishing ? 'Publishing…' : 'Publish listing'}
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
  groupLabel: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  consent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  consentPressed: { opacity: 0.85 },
  /** Squared to match the controls elsewhere, and sized for a comfortable tap. */
  box: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  boxChecked: { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
  consentCopy: { flex: 1 },
  consentLabel: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  consentNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
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
