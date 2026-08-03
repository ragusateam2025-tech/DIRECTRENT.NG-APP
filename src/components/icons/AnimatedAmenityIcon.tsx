import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';
import { duration, easing, spring, stagger } from '../../theme/motion';
import { amenityIcon } from './AmenityIcon';

/**
 * Facility icons that move once, on arrival, and then stop.
 *
 * The obvious reading of "animate the icons" is a looping animation per icon.
 * That is the version to avoid: thirty-six perpetual timers on one screen is
 * real battery and real jank on the mid-range Android most Nigerian renters
 * carry, and a grid of things all moving forever is harder to read than a
 * still one, not easier.
 *
 * So each icon plays a single gesture as the section opens, staggered down the
 * list, and is then completely inert — no timers, no worklets, nothing
 * scheduled. Amenities are collapsed by default, so this happens at most once
 * per listing view, on a deliberate tap.
 *
 * The gesture is chosen by what the facility does rather than by its shape:
 * power pulses, water rises, gates swing, the serviced sweep turns. Nobody
 * will name the difference; they will feel that the list arrived rather than
 * appeared.
 */

type Motion = 'pulse' | 'rise' | 'swing' | 'turn' | 'settle';

/**
 * Facilities whose behaviour suggests a specific gesture. Anything absent
 * settles, which is deliberately the quietest of the five — a default that
 * competes for attention would be worse than no animation at all.
 */
const MOTIONS: Record<string, Motion> = {
  // Things that energise
  '24/7 power supply': 'pulse',
  'Standby generator': 'pulse',
  Inverter: 'pulse',
  'Solar backup': 'pulse',
  'Prepaid meter': 'pulse',
  'Electric fence': 'pulse',
  'Outdoor lighting': 'pulse',
  'Fire safety': 'pulse',

  // Things that fill or flow
  Borehole: 'rise',
  'Treated water': 'rise',
  'Water heater': 'rise',
  'Swimming pool': 'rise',
  'Landscaped garden': 'rise',

  // Things that open, or stand guard
  'Security gate': 'swing',
  'Security / gateman': 'swing',
  'Built-in wardrobes': 'swing',
  'En-suite bedrooms': 'swing',
  'Guest toilet': 'swing',
  Balcony: 'swing',

  // Things that come round again
  'Serviced compound': 'turn',
  'Jogging track': 'turn',
  'Drop-off point': 'turn',
  'Air conditioning': 'turn',
};

interface AnimatedAmenityIconProps {
  amenity: string;
  group: string;
  /** Position in the list, for the stagger. */
  index: number;
  size?: number;
  color?: string;
}

export default function AnimatedAmenityIcon({
  amenity,
  group,
  index,
  size = 19,
  color = colors.accentGold,
}: AnimatedAmenityIconProps) {
  const Glyph = amenityIcon(amenity, group);
  const motion = MOTIONS[amenity] ?? 'settle';

  const scale = useSharedValue(motion === 'settle' ? 0.94 : 1);
  const shift = useSharedValue(motion === 'rise' ? 4 : 0);
  const spin = useSharedValue(motion === 'swing' ? -14 : motion === 'turn' ? -25 : 0);
  const fade = useSharedValue(0);

  useEffect(() => {
    // stagger() caps its delay, so a long list does not end with icons
    // arriving after the user has already started reading.
    const delay = stagger(index, 45, 320);

    fade.value = withDelay(delay, withTiming(1, { duration: duration.quick }));

    if (motion === 'pulse') {
      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1.14, { duration: duration.instant, easing: easing.out }),
          withSpring(1, spring.settle),
        ),
      );
    } else if (motion === 'rise') {
      shift.value = withDelay(delay, withSpring(0, spring.settle));
    } else if (motion === 'swing' || motion === 'turn') {
      spin.value = withDelay(delay, withSpring(0, spring.settle));
    } else {
      scale.value = withDelay(delay, withSpring(1, spring.settle));
    }
    // Runs once. Nothing here reschedules, so after roughly half a second the
    // icon holds its final value and no work remains.
  }, [index, motion, scale, shift, spin, fade]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { scale: scale.value },
      { translateY: shift.value },
      { rotate: `${spin.value}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Glyph size={size} color={color} />
    </Animated.View>
  );
}
