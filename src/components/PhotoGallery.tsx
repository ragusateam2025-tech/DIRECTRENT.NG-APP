import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius } from '../theme/tokens';
import ImageViewer from './ImageViewer';

/** Matches the Browse cards, so the two do not feel like different features. */
const HOLD_MS = 3600;

interface PhotoGalleryProps {
  photos: ImageSourcePropType[];
  /** Shown in the placeholder when a listing has no photos at all. */
  fallbackLabel: string;
  height?: number;
}

/**
 * Swipeable photos for the listing detail screen.
 *
 * Renters judge a property on its photos before they read a word of it, so all
 * of them are reachable rather than just the cover. Paged rather than free
 * scrolling: a photo either fills the frame or it does not, and a half-swiped
 * pair reads as broken.
 *
 * The counter carries the same information as the dots and is what actually
 * works past four or five photos, where dots become indistinguishable. Both are
 * shown because the dots communicate "swipeable" at a glance and the counter
 * does not.
 */
export default function PhotoGallery({
  photos,
  fallbackLabel,
  height = 240,
}: PhotoGalleryProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // The gallery sits inside the screen's horizontal padding, so a page is the
  // window minus that padding on both sides — not the full window width.
  const pageWidth = windowWidth - spacing.lg * 2;

  /**
   * Advances the gallery on its own, the way the cards on Browse do.
   *
   * Stops for good the first time the user swipes. Someone who has taken hold
   * of the gallery is looking at a particular photo, and sliding it out from
   * under them to keep a timer happy is the version of this feature everybody
   * hates. It never restarts — that would just delay the same problem.
   */
  const listRef = useRef<FlatList<ImageSourcePropType>>(null);
  const [taken, setTaken] = useState(false);
  /** Which photo the full-screen viewer is showing, or null when it is closed. */
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (taken || !isFocused || reduceMotion || photos.length < 2 || pageWidth <= 0) return;

    const id = setInterval(() => {
      setIndex(current => {
        const next = (current + 1) % photos.length;
        listRef.current?.scrollToOffset({ offset: next * pageWidth, animated: true });
        return next;
      });
    }, HOLD_MS);

    return () => clearInterval(id);
  }, [taken, isFocused, reduceMotion, photos.length, pageWidth]);

  if (photos.length === 0) {
    return (
      <View style={[styles.wrapper, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{fallbackLabel}</Text>
        </View>
      </View>
    );
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <FlatList
        ref={listRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        // The moment a finger lands, the gallery belongs to the user.
        onScrollBeginDrag={() => setTaken(true)}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({
          length: pageWidth,
          offset: pageWidth * i,
          index: i,
        })}
        renderItem={({ item, index: i }) => (
          // Tapping opens the photo full screen, where it can be zoomed.
          //
          // At card size a photograph is enough to decide whether to keep
          // reading and not enough to decide anything else — whether that mark
          // on the wall is a shadow or damp is the question people actually
          // have, and the only answer is a bigger picture.
          <Pressable
            onPress={() => {
              setTaken(true);
              setViewerIndex(i);
            }}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}. Opens full screen.`}
          >
            <Image
              source={item}
              style={{ width: pageWidth, height }}
              resizeMode="cover"
            />
          </Pressable>
        )}
      />

      <LinearGradient
        colors={['transparent', 'rgba(26,10,10,0.9)']}
        style={styles.scrim}
        pointerEvents="none"
      />

      {photos.length > 1 && (
        <>
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>

          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      )}

      {/*
        Mounted only while open, and keyed by the photo it opens on.

        Kept mounted, its internal state initialises once — from index 0, the
        first time this screen renders — so tapping the fifth photo opened the
        first, with the counter agreeing. initialScrollIndex has the same
        problem: it only applies on mount.

        A fresh mount per opening is the simplest correct answer, and it also
        drops the decoded full-size images when the viewer closes rather than
        holding them for the life of the screen.
      */}
      {viewerIndex !== null && (
        <ImageViewer
          key={viewerIndex}
          photos={photos}
          initialIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(26,10,10,0.7)',
  },
  counterText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { backgroundColor: colors.accentGold },
});
