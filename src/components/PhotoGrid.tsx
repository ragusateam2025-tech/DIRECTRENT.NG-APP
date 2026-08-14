import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration } from '../theme/motion';
import { IconPlus, IconClose } from './icons/Icon';

const COLUMNS = 3;
/** How long a finger rests before the tile lifts, in milliseconds. */
const HOLD = 180;

interface PhotoGridProps {
  photos: string[];
  /** Called with the new order once a drag settles. */
  onReorder: (photos: string[]) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  /** Hides the add tile while an upload is in flight. */
  addDisabled?: boolean;
  /** Beyond this, the add tile disappears. */
  max?: number;
}

/**
 * The uploaded photographs, in the order tenants will see them.
 *
 * Drag to reorder. The first tile is the cover, and the cover is most of what
 * decides whether anybody opens the listing at all — so putting the best room
 * first has to be something an owner does by hand, in one gesture, without
 * thinking about it.
 *
 * This replaced a menu of "move earlier" and "move later". That worked for
 * three photos and fell apart at ten: every step was a separate tap, and the
 * owner had to hold in their head which direction was which and count the
 * positions. Dragging is the only interaction where the thing you want and the
 * thing you do are the same shape.
 *
 * Written here rather than taken from a library. Everything it needs —
 * Reanimated and Gesture Handler — is already in the app and already built into
 * the dev client, so this ships as a JavaScript change with no install and no
 * native rebuild.
 */
export default function PhotoGrid({
  photos,
  onReorder,
  onRemove,
  onAdd,
  addDisabled,
  max = 10,
}: PhotoGridProps) {
  const [width, setWidth] = useState(0);
  const gap = spacing.sm;
  const size = width > 0 ? (width - gap * (COLUMNS - 1)) / COLUMNS : 0;

  /**
   * The live order, held on the UI thread.
   *
   * The whole drag runs off this without a single React render: the tiles read
   * their position from it, and the gesture rewrites it as the finger crosses
   * into a new slot. React only hears about it when the finger lifts. Driving
   * a drag through component state re-renders every tile on every frame, which
   * is what makes a hand-rolled one feel worse than no drag at all.
   */
  const order = useSharedValue<string[]>(photos);
  /** The photo currently under the finger, or null. */
  const active = useSharedValue<string | null>(null);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Photos also change from outside a drag — an upload finishing, a removal —
  // so the shared copy follows the prop whenever it moves.
  useEffect(() => {
    order.value = photos;
  }, [photos, order]);

  // The add tile occupies the slot after the last photo, so the grid is as tall
  // as its contents whether or not anything is being dragged.
  const showAdd = photos.length < max;
  const cells = photos.length + (showAdd ? 1 : 0);
  const rows = Math.ceil(cells / COLUMNS);
  const height = rows > 0 && size > 0 ? rows * size + (rows - 1) * gap : 0;

  function measure(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={[styles.grid, { height }]} onLayout={measure}>
      {size > 0 &&
        photos.map(uri => (
          <Tile
            key={uri}
            uri={uri}
            size={size}
            gap={gap}
            order={order}
            active={active}
            startX={startX}
            startY={startY}
            dragX={dragX}
            dragY={dragY}
            onReorder={onReorder}
            onRemove={onRemove}
          />
        ))}

      {size > 0 && showAdd && (
        <View
          style={[
            styles.cell,
            {
              width: size,
              height: size,
              left: (photos.length % COLUMNS) * (size + gap),
              top: Math.floor(photos.length / COLUMNS) * (size + gap),
            },
          ]}
        >
          <Pressable
            onPress={onAdd}
            disabled={addDisabled}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[styles.tile, styles.addTile]}
          >
            <IconPlus size={22} color={colors.accentGold} />
            <Text style={styles.addTileText}>Add</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Tile({
  uri,
  size,
  gap,
  order,
  active,
  startX,
  startY,
  dragX,
  dragY,
  onReorder,
  onRemove,
}: {
  uri: string;
  size: number;
  gap: number;
  order: ReturnType<typeof useSharedValue<string[]>>;
  active: ReturnType<typeof useSharedValue<string | null>>;
  startX: ReturnType<typeof useSharedValue<number>>;
  startY: ReturnType<typeof useSharedValue<number>>;
  dragX: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
  onReorder: (photos: string[]) => void;
  onRemove: (index: number) => void;
}) {
  const step = size + gap;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // A hold, not an immediate drag. The grid sits inside a scrolling form,
        // and a tile that moved the instant a finger touched it would fight
        // every attempt to scroll past it.
        .activateAfterLongPress(HOLD)
        .onStart(() => {
          const index = order.value.indexOf(uri);
          startX.value = (index % COLUMNS) * step;
          startY.value = Math.floor(index / COLUMNS) * step;
          dragX.value = 0;
          dragY.value = 0;
          active.value = uri;
          // The tile has left the grid and is now on the finger. A tap that
          // silently became a drag is how people lose their layout.
          runOnJS(tap)();
        })
        .onUpdate(e => {
          dragX.value = e.translationX;
          dragY.value = e.translationY;

          // Which slot the middle of the tile is over, not the fingertip —
          // dropping is judged by where the picture looks like it is.
          const cx = startX.value + dragX.value + size / 2;
          const cy = startY.value + dragY.value + size / 2;

          const col = Math.min(Math.max(Math.floor(cx / step), 0), COLUMNS - 1);
          const row = Math.max(Math.floor(cy / step), 0);
          const last = order.value.length - 1;
          const target = Math.min(Math.max(row * COLUMNS + col, 0), last);
          const from = order.value.indexOf(uri);

          if (target !== from) {
            // Rewritten as the finger crosses, so the gap opens under it and
            // the owner sees the result before committing to it.
            const next = [...order.value];
            next.splice(from, 1);
            next.splice(target, 0, uri);
            order.value = next;
          }
        })
        .onFinalize(() => {
          if (active.value !== uri) return;
          active.value = null;
          runOnJS(onReorder)(order.value);
        }),
    [uri, size, step, order, active, startX, startY, dragX, dragY, onReorder],
  );

  const style = useAnimatedStyle(() => {
    const index = order.value.indexOf(uri);
    const homeX = (index % COLUMNS) * step;
    const homeY = Math.floor(index / COLUMNS) * step;

    if (active.value === uri) {
      return {
        left: startX.value + dragX.value,
        top: startY.value + dragY.value,
        transform: [{ scale: 1.08 }],
        // Above every other tile, so it is never drawn behind one it is
        // passing over. Android needs elevation as well as zIndex.
        zIndex: 20,
        elevation: 20,
      };
    }

    return {
      left: withTiming(homeX, { duration: duration.quick }),
      top: withTiming(homeY, { duration: duration.quick }),
      transform: [{ scale: withTiming(1, { duration: duration.quick }) }],
      zIndex: 1,
      elevation: 1,
    };
  });

  return (
    <Animated.View style={[styles.cell, { width: size, height: size }, style]}>
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="image"
          accessibilityLabel={`Photo. Hold and drag to reorder.`}
          style={styles.tile}
        >
          <Image source={{ uri }} style={styles.tileImage} resizeMode="cover" />
        </Animated.View>
      </GestureDetector>

      <CoverBadge uri={uri} order={order} />

      {/* Its own control rather than a long press, now that a long press means
          pick up. Two meanings on one gesture is how a photo gets deleted by
          somebody who meant to move it. */}
      <Pressable
        onPress={() => onRemove(order.value.indexOf(uri))}
        accessibilityRole="button"
        accessibilityLabel="Remove this photo"
        hitSlop={8}
        style={styles.remove}
      >
        <IconClose size={13} color={colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
}

/** Marks whichever photo currently sits first, following it as the order changes. */
function CoverBadge({
  uri,
  order,
}: {
  uri: string;
  order: ReturnType<typeof useSharedValue<string[]>>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: order.value.indexOf(uri) === 0 ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.coverBadge, style]} pointerEvents="none">
      <Text style={styles.coverBadgeText}>Cover</Text>
    </Animated.View>
  );
}

/** Kept off the worklet thread; haptics are a JS call. */
function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

const styles = StyleSheet.create({
  grid: { width: '100%', marginBottom: spacing.md },
  /**
   * Every tile is absolutely placed. A wrapping flex row cannot express "this
   * one is in the air above the others", and the whole interaction depends on
   * exactly that.
   */
  cell: { position: 'absolute' },
  tile: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
  },
  tileImage: { width: '100%', height: '100%' },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accentGold,
    backgroundColor: colors.backgroundPaper,
  },
  addTileText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: colors.accentGold,
    borderRadius: radius.control,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: colors.primaryDark,
    fontFamily: typography.families.bodySemiBold,
    fontSize: 10,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
