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
  saveListingProgress,
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
import type { Listing, ListingStatus } from '../../types';

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

  /**
   * The status the listing had when the wizard opened.
   *
   * Undefined for a new listing, 'draft' for one being resumed, and 'active'
   * for a published one being edited. Everything that distinguishes editing
   * from creating hangs off this, so it is read once and never recomputed from
   * the draft — the draft is edited as we go and would stop being a record of
   * where we started.
   */
  const [openedAs, setOpenedAs] = useState<ListingStatus | undefined>(undefined);
  const editingPublished = openedAs !== undefined && openedAs !== 'draft';

  useEffect(() => {
    if (!existingDraftId) return;
    let active = true;

    fetchListing(existingDraftId)
      .then(found => {
        if (!active || !found) return;
        setDraft(found);
        setOpenedAs(found.status?.listing ?? 'draft');
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

  /**
   * Keeps the working copy, and autosaves it while a listing is being created.
   *
   * Editing a published listing does NOT autosave. A live property is being
   * read by tenants right now, and writing each step as it is filled in would
   * publish half an edit — a changed rent with the old description, or a
   * listing with two photos while the rest upload. An owner who changes their
   * mind halfway through would leave it that way.
   *
   * So edits are held here and written once, deliberately, from the last step.
   * Autosave exists to protect work nobody has seen yet; it is the wrong
   * trade for work everybody can see.
   */
  async function persist(patch: DraftListing) {
    const merged = { ...draft, ...patch };
    setDraft(merged);
    if (!profile || editingPublished) return;
    try {
      await saveListingProgress(listingId.current, profile.uid, profile.fullName, merged);
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
    // Editing a live listing can never delete it.
    //
    // The create path offers Discard, which calls discardDraft and removes the
    // document and every photo with it. That is right for something nobody has
    // seen and catastrophic for a published property: one tap on the wrong
    // button and an owner destroys a live listing, its photos, and the
    // conversations pointing at it.
    //
    // Nothing has been written yet either, so leaving simply drops the edits.
    if (editingPublished) {
      Alert.alert(
        'Leave without saving?',
        'Your changes have not been saved. The listing stays as it is now.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }

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

    // Editing an existing listing writes once, here, and keeps the status it
    // arrived with. It does not go through publishListing: that sets the
    // listing to `active`, which would quietly relist a property the owner had
    // marked as rented.
    //
    // No email gate either. It guards the moment a property first becomes
    // public; this listing already is, and stopping an owner from correcting a
    // wrong rent on a live listing would make the app worse, not safer.
    if (editingPublished) {
      if (!profile) return;
      setBusy(true);
      try {
        await saveListingProgress(
          listingId.current,
          profile.uid,
          profile.fullName,
          merged,
          openedAs,
        );
        setDraft(merged);
        Alert.alert('Changes saved', 'Your listing has been updated.', [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } catch (err: any) {
        Alert.alert('Could not save your changes', err?.message ?? 'Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

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
            deleteFromStorage={!editingPublished}
          />
        )}
        {step === 3 && <PricingStep draft={draft} onNext={handleNext} />}
        {step === 4 && (
          <DetailsStep
            draft={draft}
            onPublish={handlePublish}
            publishing={busy}
            submitLabel={editingPublished ? 'Save changes' : 'Publish listing'}
            submittingLabel={editingPublished ? 'Saving…' : 'Publishing…'}
          />
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
