import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { IconSaved } from './Icon';
import { duration, easing, spring } from '../../theme/motion';
import { colors } from '../../theme/tokens';

interface AnimatedSaveIconProps {
  /** Drives appearance — the filled label. */
  saved: boolean;
  /**
   * Increment to play the save motion. Deliberately separate from `saved`:
   * the screen sets `saved` when it loads an already-saved listing, and that
   * must not animate. Only a deliberate tap should.
   */
  pulse: number;
  size?: number;
  color?: string;
}

/**
 * The floppy disk pushed into a drive: it gives under the press, then springs
 * home past its resting size. Compression and travel move together because
 * that is how pushing something in reads — shrinking alone looks like a
 * button, not an insertion.
 */
export default function AnimatedSaveIcon({
  saved,
  pulse,
  size = 18,
  color = colors.accentGold,
}: AnimatedSaveIconProps) {
  const scale = useSharedValue(1);
  const offsetY = useSharedValue(0);

  useEffect(() => {
    // Nothing to play on first render — pulse starts at 0 and only a tap moves it.
    if (pulse === 0) return;

    const press = { duration: duration.instant / 2, easing: easing.inOut };
    scale.value = withSequence(withTiming(0.78, press), withSpring(1, spring.settle));
    offsetY.value = withSequence(withTiming(1.5, press), withSpring(0, spring.settle));
  }, [pulse, scale, offsetY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: offsetY.value }],
  }));

  return (
    <Animated.View style={style}>
      <IconSaved size={size} color={color} filled={saved} />
    </Animated.View>
  );
}
