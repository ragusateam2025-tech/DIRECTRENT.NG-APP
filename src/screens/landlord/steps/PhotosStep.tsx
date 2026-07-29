import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import { duration } from '../../../theme/motion';
import Button from '../../../components/Button';
import { uploadPhoto, deletePhoto, MIN_PHOTOS } from '../../../services/landlord';
import type { DraftListing } from '../AddPropertyScreen';

interface PhotosStepProps {
  draft: DraftListing;
  ownerId: string;
  listingId: string;
  onNext: (patch: DraftListing) => void;
  /** Persists after every individual upload, so a killed app loses at most one photo. */
  onChange: (patch: DraftListing) => Promise<void>;
}

export default function PhotosStep({
  draft,
  ownerId,
  listingId,
  onNext,
  onChange,
}: PhotosStepProps) {
  const [photos, setPhotos] = useState<string[]>(draft.media?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function pickAndUpload() {
    setError('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Directrent needs access to your photos to add pictures of the property.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1, // Compression happens in compressPhoto, after resizing.
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
          current.length,
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
          `A photo failed to upload (${err?.message ?? 'unknown error'}). The others were saved — tap Add photos to retry.`,
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
          const next = photos.filter((_, i) => i !== index);
          setPhotos(next);
          await onChange({ media: { ...draft.media, photos: next } });
          await deletePhoto(ownerId, listingId, index).catch(() => {});
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
    onNext({ media: { ...draft.media, photos } });
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
            onPress={pickAndUpload}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[styles.tile, styles.addTile]}
          >
            <Text style={styles.addTilePlus}>+</Text>
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
  addTilePlus: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
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
    fontSize: typography.sizes.xs,
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
