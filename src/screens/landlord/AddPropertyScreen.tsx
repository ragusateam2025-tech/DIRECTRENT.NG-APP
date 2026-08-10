import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import { duration, easing } from '../../theme/motion';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import {
  newListingId,
  saveDraft,
  publishListing,
  discardDraft,
  MIN_PHOTOS,
} from '../../services/landlord';
import { fetchListing } from '../../services/listings';
import BasicInfoStep from './steps/BasicInfoStep';
import LocationStep from './steps/LocationStep';
import PhotosStep from './steps/PhotosStep';
import PricingStep from './steps/PricingStep';
import DetailsStep from './steps/DetailsStep';
import type { Listing } from '../../types';

const STEPS = ['Basics', 'Location', 'Photos', 'Pricing', 'Details'] as const;

/** The listing as it is being assembled — every field optional until publish. */
export type DraftListing = Partial<Listing>;

export default function AddPropertyScreen() {
  const { profile, refreshVerification, resendVerification } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const existingDraftId: string | undefined = route.params?.draftId;

  // Reserved before the wizard starts so photos have somewhere to live from
  // step one. Held in a ref so a re-render never mints a second listing.
  const listingId = useRef<string>(existingDraftId ?? newListingId());

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftListing>({});
  const [loading, setLoading] = useState(!!existingDraftId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!existingDraftId) return;
    let active = true;

    fetchListing(existingDraftId)
      .then(found => {
        if (!active || !found) return;
        setDraft(found);
        // Resume where they left off rather than at the beginning.
        setStep(furthestCompletedStep(found));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [existingDraftId]);

  async function persist(patch: DraftListing) {
    const merged = { ...draft, ...patch };
    setDraft(merged);
    if (!profile) return;
    try {
      await saveDraft(listingId.current, profile.uid, profile.fullName, merged);
    } catch {
      // A failed autosave must not block the owner mid-form. The next step
      // writes the whole draft again, so one lost save is recoverable.
    }
  }

  async function handleNext(patch: DraftListing) {
    await persist(patch);
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    confirmLeave();
  }

  function confirmLeave() {
    Alert.alert('Save as draft?', 'Your progress and any uploaded photos will be kept.', [
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          if (profile) await discardDraft(profile.uid, listingId.current).catch(() => {});
          navigation.goBack();
        },
      },
      { text: 'Save draft', onPress: () => navigation.goBack() },
    ]);
  }

  async function handlePublish(patch: DraftListing) {
    const merged = { ...draft, ...patch };
    // Saved before the gate, not after. Someone stopped here has done the whole
    // wizard, and losing that work because their email is unconfirmed would be
    // a far worse offence than the unconfirmed email.
    await persist(patch);

    // A published listing is a public claim about a real property, carrying a
    // name and a phone number. Confirming the address is the one check standing
    // between the catalogue and anyone who fancies inventing a flat.
    const verified = await refreshVerification();
    if (!verified) {
      Alert.alert(
        'Confirm your email first',
        'Your listing is saved as a draft. Open the link we emailed you when you signed up, then publish it from My properties.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Send it again',
            onPress: () => {
              resendVerification()
                .then(() => Alert.alert('Sent', 'Check your email for the confirmation link.'))
                .catch(e => Alert.alert('Could not send it', e?.message ?? String(e)));
            },
          },
        ],
      );
      return;
    }

    setBusy(true);
    try {
      const result = await publishListing(listingId.current, merged);
      if (!result.ok) {
        Alert.alert('Not ready to publish', result.reason ?? 'Something is missing.');
        return;
      }
      // Says what actually happens. publishListing sets the listing straight to
      // `active` — review was removed because there is no admin panel to review
      // from — so telling an owner to wait for an approval that never comes
      // left them watching for a state change that had already happened.
      Alert.alert(
        'Your property is live',
        'Tenants can find it in Browse now. You can see it under My properties.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Could not publish', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <Text style={styles.loading}>Loading draft…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right', 'bottom']}>
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          {STEPS.map((label, i) => (
            <View
              key={label}
              style={[
                styles.progressSegment,
                i <= step && styles.progressSegmentDone,
                i === STEPS.length - 1 && styles.progressSegmentLast,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressLabel}>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </Text>
      </View>

      <Animated.View
        key={step}
        entering={FadeInDown.duration(duration.quick).easing(easing.out)}
        style={styles.stepBody}
      >
        {step === 0 && <BasicInfoStep draft={draft} onNext={handleNext} />}
        {step === 1 && <LocationStep draft={draft} onNext={handleNext} />}
        {step === 2 && (
          <PhotosStep
            draft={draft}
            ownerId={profile.uid}
            listingId={listingId.current}
            onNext={handleNext}
            onChange={persist}
          />
        )}
        {step === 3 && <PricingStep draft={draft} onNext={handleNext} />}
        {step === 4 && (
          <DetailsStep draft={draft} onPublish={handlePublish} publishing={busy} />
        )}
      </Animated.View>

      <View style={styles.backRow}>
        <Button
          label={step === 0 ? 'Cancel' : 'Back'}
          variant="secondary"
          onPress={handleBack}
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * Which step a resumed draft should open on.
 *
 * Returns the first step whose requirement is unmet, so the owner lands on
 * the thing that still needs doing rather than re-reading what they finished.
 */
export function furthestCompletedStep(draft: DraftListing): number {
  if (!draft.basicInfo?.title) return 0;
  if (!draft.location?.address) return 1;
  if ((draft.media?.photos?.length ?? 0) < MIN_PHOTOS) return 2;
  if (!draft.pricing?.annualRent) return 3;
  return 4;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  loading: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  progressWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  progressTrack: { flexDirection: 'row' },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.backgroundElevated,
    marginRight: spacing.xs,
  },
  progressSegmentDone: { backgroundColor: colors.accentGold },
  progressSegmentLast: { marginRight: 0 },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  stepBody: { flex: 1 },
  backRow: { padding: spacing.md, paddingTop: 0 },
});
