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
import {
  POWER_BAND_LABELS,
  POWER_BAND_NOTE,
  POWER_BAND_OPTIONS,
} from '../../../data/power';
import { toSentenceCase } from '../../../lib/text';
import {
  ALTERATION_LABELS,
  ALTERATION_NOTE,
  ALTERATION_OPTIONS,
  AVAILABLE_FROM_LABELS,
  AVAILABLE_FROM_OPTIONS,
  MINIMUM_LEASE_LABELS,
  MINIMUM_LEASE_OPTIONS,
  PET_LABELS,
  PET_OPTIONS,
  SMOKING_LABELS,
  SMOKING_OPTIONS,
} from '../../../data/rules';
import type {
  PowerBand,
  AlterationPolicy,
  LeaseDuration,
  MoveInTiming,
  PetPolicy,
  SmokingPolicy,
} from '../../../types';
import type { DraftListing } from '../AddPropertyScreen';


export default function DetailsStep({
  draft,
  onPublish,
  publishing,
  /**
   * What the final button does, in the owner's words.
   *
   * "Publish listing" is a promise about something that does not exist yet.
   * Editing a live property is not publishing it, and saying so would suggest
   * the listing goes away and comes back.
   */
  submitLabel = 'Publish listing',
  submittingLabel = 'Publishing…',
}: {
  draft: DraftListing;
  onPublish: (patch: DraftListing) => void;
  publishing: boolean;
  submitLabel?: string;
  submittingLabel?: string;
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

  // Sensible defaults rather than nulls. These four have an ordinary answer —
  // most Lagos flats are no-pets, no-smoking, available now, a year minimum —
  // and making an owner state the obvious four times is how a wizard gets
  // abandoned. An owner whose property differs changes them in one tap.
  const [pets, setPets] = useState<PetPolicy>(draft.rules?.pets ?? 'no_pets');
  const [smoking, setSmoking] = useState<SmokingPolicy>(
    draft.rules?.smoking ?? 'no_smoking',
  );
  const [alterations, setAlterations] = useState<AlterationPolicy>(
    draft.rules?.alterations ?? 'ask_first',
  );
  const [houseRules, setHouseRules] = useState(draft.rules?.houseRules ?? '');
  // Null until answered, and allowed to stay null. Plenty of owners genuinely
  // do not know their band, and a required field would be answered with a
  // guess -- which is worse than a blank, because a guess reads as a fact.
  const [powerBand, setPowerBand] = useState<PowerBand | null>(
    draft.powerBand ?? null,
  );
  const [availableFrom, setAvailableFrom] = useState<MoveInTiming>(
    draft.availability?.from ?? 'asap',
  );
  const [minimumLease, setMinimumLease] = useState<LeaseDuration>(
    draft.availability?.minimumLeaseMonths ?? 12,
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
    // Required, because a renter deciding whether to travel across Lagos to
    // see a place wants this answered, and an optional question is one most
    // owners skip. The listing shows "Not stated" only for the back catalogue.
    if (ownerOccupied === null) {
      setError('Say whether you live on the property — renters ask before they visit.');
      return;
    }

    setError('');
    onPublish({
      details: {
        // Normalised at the step boundary rather than as they type. This only
        // ever changes case and spacing -- it rescues A DESCRIPTION IN CAPITALS
        // and one with no capitals at all, and leaves mixed-case writing alone,
        // because somebody who typed both cases meant both.
        description: toSentenceCase(description),
        amenities,
        maxOccupants: occupants,
      },
      // Explicitly null rather than undefined when off. Firestore rejects
      // undefined outright, and a merged write would leave a previously
      // shared number published after the owner turned the choice off.
      ownerPhone: callable && profile?.phone ? profile.phone : null,
      // Always a boolean by this point — publishing is blocked above until the
      // question is answered.
      ownerOccupied,
      rules: {
        pets,
        smoking,
        alterations,
        // Null, not undefined, so clearing the box clears the published rule
        // rather than leaving the old text in place on a merged write.
        houseRules: houseRules.trim() || null,
      },
      availability: {
        from: availableFrom,
        minimumLeaseMonths: minimumLease,
      },
      // Explicit null when unanswered, so clearing it clears the published
      // value rather than leaving an old band on a merged write.
      powerBand,
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

      {/*
        The band, not a tick-box.

        "24/7 power supply" as an amenity means whatever the person ticking it
        wants it to mean. A NERC band is a minimum number of hours the
        distribution company is meant to hold to, which is a figure the owner is
        quoting rather than one they chose -- and it is the first question a
        Lagos renter asks.
      */}
      <Text style={styles.heading}>Power supply</Text>
      <Text style={styles.consentNote}>{POWER_BAND_NOTE}</Text>
      <View style={styles.chips}>
        {POWER_BAND_OPTIONS.map(band => (
          <Chip
            key={band}
            label={POWER_BAND_LABELS[band]}
            selected={powerBand === band}
            // Tapping the chosen band again clears it. Leaving no way back
            // would make a mis-tap permanent on a question they are allowed
            // not to answer.
            onPress={() => setPowerBand(current => (current === band ? null : band))}
          />
        ))}
      </View>

      {/*
        Every one of these is a question a renter currently has to send a
        message to ask, then wait a day for. Answered once here, they are
        answered for everybody who ever opens the listing.
      */}
      <Text style={styles.heading}>House rules</Text>

      <Text style={styles.groupLabel}>Pets</Text>
      <View style={styles.chips}>
        {PET_OPTIONS.map(option => (
          <Chip
            key={option}
            label={PET_LABELS[option]}
            selected={pets === option}
            onPress={() => setPets(option)}
          />
        ))}
      </View>

      <Text style={styles.groupLabel}>Smoking</Text>
      <View style={styles.chips}>
        {SMOKING_OPTIONS.map(option => (
          <Chip
            key={option}
            label={SMOKING_LABELS[option]}
            selected={smoking === option}
            onPress={() => setSmoking(option)}
          />
        ))}
      </View>

      <Text style={styles.groupLabel}>Changes to the property</Text>
      <Text style={styles.consentNote}>{ALTERATION_NOTE}</Text>
      <View style={styles.chips}>
        {ALTERATION_OPTIONS.map(option => (
          <Chip
            key={option}
            label={ALTERATION_LABELS[option]}
            selected={alterations === option}
            onPress={() => setAlterations(option)}
          />
        ))}
      </View>

      <TextField
        label="Anything else (optional)"
        value={houseRules}
        onChangeText={setHouseRules}
        placeholder="Gate closes at 11pm. No commercial use of the flat."
        autoCapitalize="sentences"
      />

      <Text style={styles.heading}>Availability</Text>

      <Text style={styles.groupLabel}>When can someone move in?</Text>
      <View style={styles.chips}>
        {AVAILABLE_FROM_OPTIONS.map(option => (
          <Chip
            key={option}
            label={AVAILABLE_FROM_LABELS[option]}
            selected={availableFrom === option}
            onPress={() => setAvailableFrom(option)}
          />
        ))}
      </View>

      <Text style={styles.groupLabel}>Shortest tenancy you will accept</Text>
      <View style={styles.chips}>
        {MINIMUM_LEASE_OPTIONS.map(option => (
          <Chip
            key={option}
            label={MINIMUM_LEASE_LABELS[option]}
            selected={minimumLease === option}
            onPress={() => setMinimumLease(option)}
          />
        ))}
      </View>

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
          label={publishing ? submittingLabel : submitLabel}
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
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.sm,
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
