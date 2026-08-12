import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePreventScreenCapture } from 'expo-screen-capture';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '../theme/tokens';
import { IconClose } from './icons/Icon';

/**
 * Full-screen photos, opened by tapping one.
 *
 * The gallery on a listing shows a photo at card size, which is enough to
 * decide whether to keep reading and not enough to decide anything else.
 * Somebody judging a property wants to know whether that damp patch is a shadow
 * — and the only way to answer it is to make the picture bigger.
 *
 * Pinch to zoom, drag to move around, double-tap to jump in and out, swipe for
 * the next photo.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** What a double-tap jumps to. Enough to read a wall, short of pixellation. */
const DOUBLE_TAP_SCALE = 2.5;

interface ImageViewerProps {
  photos: ImageSourcePropType[];
  /** Which photo to open on. */
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImageViewer({
  photos,
  initialIndex,
  visible,
  onClose,
}: ImageViewerProps) {
  /**
   * Blocks screenshots and screen recording while a photograph is full screen.
   *
   * This is where the property photography is actually legible — a card-sized
   * thumbnail is not worth lifting, a full-screen frame is. It is also where
   * somebody copying a listing wholesale would come.
   *
   * It raises the cost of copying and nothing more. A second phone pointed at
   * the screen defeats it completely, and the files themselves sit behind
   * long-lived download URLs. Client-side protection is a speed bump for the
   * casual, never a wall against the determined.
   */
  usePreventScreenCapture();

  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  /**
   * Paging is disabled while a photo is zoomed.
   *
   * Otherwise a drag means two things at once — move the enlarged photo, or go
   * to the next one — and the list wins, so zooming in and trying to look
   * around throws you onto a different picture.
   */
  const [zoomed, setZoomed] = useState(false);

  const onZoomChange = useCallback((isZoomed: boolean) => {
    setZoomed(isZoomed);
  }, []);

  function handleScroll(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      // Android's back button closes it, which is what the gesture means here.
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={handleScroll}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <ZoomableImage
              source={item}
              width={width}
              height={height}
              onZoomChange={onZoomChange}
            />
          )}
        />

        {/* Above the photo, always reachable. A viewer you cannot get out of
            is the reason people force-quit apps. */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          hitSlop={12}
          style={styles.close}
        >
          <IconClose size={26} color={colors.textPrimary} />
        </Pressable>

        {photos.length > 1 && (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} of {photos.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ZoomableImage({
  source,
  width,
  height,
  onZoomChange,
}: {
  source: ImageSourcePropType;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  /**
   * Snaps back to the resting size, and tells the list it may page again.
   *
   * A const arrow with the directive rather than a function declaration: this
   * is called from inside gesture callbacks, which are worklets running on the
   * UI thread, and a helper that has not been converted throws there rather
   * than at compile time.
   */
  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(onZoomChange)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      // Anything at or below the resting size springs back rather than leaving
      // a photo slightly smaller than its frame.
      if (scale.value <= MIN_SCALE) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      runOnJS(onZoomChange)(true);
    });

  const pan = Gesture.Pan()
    .onUpdate(event => {
      // Only meaningful when the photo is larger than the screen; otherwise the
      // list should be handling this drag.
      if (scale.value <= MIN_SCALE) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(onZoomChange)(true);
    });

  // Pinch and pan run together — people zoom and reposition in one movement.
  // The double tap races them, so a quick two-finger pinch is never swallowed
  // waiting to see whether a second tap arrives.
  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, styles.page]}>
        <Animated.Image
          source={source}
          style={[{ width, height }, style]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Black rather than the app's burgundy: a photograph should be judged against
  // nothing, and every colour around it shifts how it reads.
  screen: { flex: 1, backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 22,
  },
  counter: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  counterText: {
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
  },
});
