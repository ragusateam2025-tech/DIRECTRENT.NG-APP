import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import { duration } from '../../../theme/motion';
import Button from '../../../components/Button';
import { uploadPhoto, deletePhoto, MIN_PHOTOS } from '../../../services/landlord';
import { IconPlus } from '../../../components/icons/Icon';
import type { DraftListing } from '../AddPropertyScreen';

interface PhotosStepProps {
  draft: DraftListing;
  ownerId: string;
  listingId: string;
  onNext: (patch: DraftListing) => void;
  /** Persists after every individual upload, so a killed app loses at most one photo. */
  onChange: (patch: DraftListing) => Promise<void>;
  /**
   * Whether removing a photo also deletes the file.
   *
   * True while building a new listing: nobody is looking at it, and leaving
   * files behind for every photo an owner tried and rejected would fill
   * Storage with rubbish.
   *
   * False when editing a published one. The document is not written until the
   * owner saves, so deleting the file first would leave a live listing
   * pointing at a photo that no longer exists — a broken image for every
   * tenant browsing right now, and permanent if the owner then walks away
   * without saving. The file is left in place instead; an unreferenced photo
   * costs a little storage and breaks nothing.
   */
  deleteFromStorage?: boolean;
}

export default function PhotosStep({
  draft,
  ownerId,
  listingId,
  onNext,
  onChange,
  deleteFromStorage = true,
}: PhotosStepProps) {
  const [photos, setPhotos] = useState<string[]>(draft.media?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [tourRequested, setTourRequested] = useState(!!draft.tourRequested);

  /** Offers the two ways an owner actually has photos: already taken, or about to take. */
  function addPhotos() {
    Alert.alert('Add photos', undefined, [
      { text: 'Take a photo', onPress: () => pickAndUpload('camera') },
      { text: 'Choose from gallery', onPress: () => pickAndUpload('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickAndUpload(source: 'camera' | 'gallery') {
    setError('');

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Directrent needs camera access to photograph the property.'
          : 'Directrent needs access to your photos to add pictures of the property.',
      );
      return;
    }

    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            // Compression happens in compressPhoto, after resizing.
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 1,
          });

    if (picked.canceled || picked.assets.length === 0) return;

    setUploading(true);
    let current = [...photos];

    for (const asset of picked.assets) {
      try {
        setProgress(0);
        const url = await uploadPhoto(
          ownerId,
          listingId,
          asset.uri,
          asset.width ?? 1600,
          asset.height ?? 1200,
          setProgress,
        );

        current = [...current, url];
        setPhotos(current);
        // Persist immediately — one photo in flight is the most we can lose.
        await onChange({ media: { ...draft.media, photos: current } });
      } catch (err: any) {
        setError(
          `A photo failed to upload (${err?.message ?? 'unknown error'}). The others were saved — tap Add to retry.`,
        );
        break;
      }
    }

    setUploading(false);
    setProgress(0);
  }

  function confirmRemove(index: number) {
    Alert.alert('Remove this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          // Captured before the array changes, because it is the only handle on
          // the file. Read afterwards it would point at whichever photo shuffled
          // into the gap.
          const removedUrl = photos[index];
          const next = photos.filter((_, i) => i !== index);
          setPhotos(next);
          await onChange({ media: { ...draft.media, photos: next } });
          if (deleteFromStorage && removedUrl) {
            await deletePhoto(removedUrl).catch(() => {});
          }
        },
      },
    ]);
  }

  function handleNext() {
    if (photos.length < MIN_PHOTOS) {
      setError(`Please add at least ${MIN_PHOTOS} photos. You have ${photos.length}.`);
      return;
    }
    setError('');
    onNext({ media: { ...draft.media, photos }, tourRequested });
  }

  const remaining = Math.max(0, MIN_PHOTOS - photos.length);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Add photos</Text>
      <Text style={styles.sub}>
        {remaining > 0
          ? `At least ${MIN_PHOTOS} photos — ${remaining} more to go. The first is the cover.`
          : `${photos.length} photos added. The first is the cover.`}
      </Text>

      {/*
        Said before the camera opens, not after. A tenant scrolling Browse is
        comparing your property against every other one on the screen, and an
        unmade bed is what they remember. This costs an owner ten minutes and
        is the highest-return thing on this step.
      */}
      <View style={styles.advice}>
        <Text style={styles.adviceHeading}>Tidy first, then shoot</Text>
        <Text style={styles.adviceBody}>
          Clear the floor, open the curtains and take the photos in daylight. The
          same flat photographed clean and photographed cluttered gets a very
          different number of enquiries, and it is the cheapest advantage you
          have over the next listing.
        </Text>
      </View>

      <View style={styles.grid}>
        {photos.map((uri, index) => (
          <Animated.View key={uri} entering={FadeIn.duration(duration.quick)}>
            <Pressable
              onLongPress={() => confirmRemove(index)}
              accessibilityRole="image"
              accessibilityLabel={`Photo ${index + 1}${index === 0 ? ', cover photo' : ''}. Long press to remove.`}
              style={styles.tile}
            >
              <Image source={{ uri }} style={styles.tileImage} resizeMode="cover" />
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        ))}

        {photos.length < 10 && (
          <Pressable
            onPress={addPhotos}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[styles.tile, styles.addTile]}
          >
            <IconPlus size={22} color={colors.accentGold} />
            <Text style={styles.addTileText}>Add</Text>
          </Pressable>
        )}
      </View>

      {uploading && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Uploading… {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        Photos are resized before upload to keep them quick to send and quick for
        tenants to load. Long press a photo to remove it.
      </Text>

      {/*
        The second way to show a property, offered alongside photos rather than
        instead of them. Photos are still required: a tour is booked, shot and
        attached days later, and a listing cannot wait on a visit before it can
        go live.

        Which of the two actually moves enquiries is the open question, and the
        reason both exist — a listing with a tour and a listing without one are
        the two halves of that comparison.
      */}
      <Pressable
        onPress={() => setTourRequested(v => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tourRequested }}
        accessibilityLabel="Ask Directrent to shoot a 360 tour of this property"
        style={({ pressed }) => [
          styles.tourCard,
          tourRequested && styles.tourCardOn,
          pressed && styles.tourCardPressed,
        ]}
      >
        <View style={styles.tourHeadingRow}>
          <View style={[styles.checkbox, tourRequested && styles.checkboxOn]}>
            {tourRequested && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.tourHeading}>Ask us to shoot a 360 tour</Text>
        </View>

        <Text style={styles.tourBody}>
          One of our people visits with a 360 camera and shoots the whole flat, so
          tenants can walk through it from their phone. Free while we are testing
          it. We will contact you to arrange a time.
        </Text>

        {tourRequested && (
          <Text style={styles.tourWarning}>
            Have the place properly clean and empty of clutter before we arrive.
            A 360 camera sees every corner of every room at once — there is no
            angle to shoot around a mess, and we cannot re-shoot for free.
          </Text>
        )}
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.action}>
        <Button
          label={uploading ? 'Uploading…' : 'Continue'}
          onPress={handleNext}
          disabled={uploading}
        />
      </View>
    </ScrollView>
  );
}

const TILE = 104;

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  advice: {
    backgroundColor: colors.backgroundPaper,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentGold,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  adviceHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  adviceBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  tourCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  tourCardOn: { borderColor: colors.borderGold },
  tourCardPressed: { opacity: 0.85 },
  tourHeadingRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxOn: { borderColor: colors.accentGold, backgroundColor: colors.accentGold },
  checkboxMark: {
    color: colors.background,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
  },
  tourHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.base,
    flex: 1,
  },
  tourBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  tourWarning: {
    color: colors.accentGold,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundElevated,
  },
  tileImage: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: 'rgba(26,10,10,0.75)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderStyle: 'dashed',
  },
  addTileText: {
    color: colors.accentGold,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  progressWrap: { marginTop: spacing.sm, marginBottom: spacing.md },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accentGold },
  progressText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  note: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.md },
});
