import React, { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme/tokens';
import { duration, easing } from '../theme/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The house, drawn as a solid object rather than an outline.
 *
 * Isometric and filled, in the manner the big property apps use: a three-
 * quarter view, flat planes shaded light-to-dark to imply a light source, soft
 * palette, no outlines anywhere. Line-art reads as a diagram — correct for an
 * empty state, wrong for the thing the whole app is about. This has weight.
 *
 * Burgundy walls under a gold roof, on the white hero card. Drawn rather than
 * photographed on purpose: a stock photograph of a nice living room is what
 * every property app opens with, and it promises a specific home we cannot
 * deliver.
 */
export default function HomeBackdrop({ size = 200 }: { size?: number }) {
  const reduceMotion = useReducedMotion();

  /**
   * The lights coming on.
   *
   * The windows and the door arrive dark and warm up a beat after the house
   * lands, which is the one thing an animation here can actually say: somebody
   * is in. It is the same claim the headline beside it makes — meet the owner —
   * so the motion explains the copy rather than decorating it.
   *
   * Once, on arrival. A looping animation on a screen people are trying to
   * scroll is a distraction with a frame budget.
   */
  const lit = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    lit.value = withDelay(
      duration.normal,
      withTiming(1, { duration: duration.deliberate, easing: easing.out }),
    );
  }, [lit, reduceMotion]);

  const glow = useAnimatedProps(() => ({ opacity: lit.value }));
  // The side window is turned away from the viewer, so it never reaches full
  // brightness — the same reason its wall is the darker of the two.
  const glowSide = useAnimatedProps(() => ({ opacity: lit.value * 0.7 }));

  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 200 170" fill="none">
      <Defs>
        {/* Each plane gets its own ramp. A single flat fill per face reads as
            paper cut-outs; a gentle ramp on each reads as one light source. */}
        <LinearGradient id="wall" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={colors.primaryLight} />
          <Stop offset="1" stopColor={colors.primaryMedium} />
        </LinearGradient>
        <LinearGradient id="wallSide" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primaryMedium} />
          <Stop offset="1" stopColor={colors.primaryDark} />
        </LinearGradient>
        {/* The gable is the plane facing the viewer, so it is the brighter of
            the two. Without the split the roof reads as one flat shape and the
            house loses its third dimension. */}
        <LinearGradient id="roofFront" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F0D9A4" />
          <Stop offset="1" stopColor={colors.accentGoldLight} />
        </LinearGradient>
        <LinearGradient id="roofSide" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accentGold} />
          <Stop offset="1" stopColor={colors.accentGoldDark} />
        </LinearGradient>
      </Defs>

      {/* Grounding shadow. Without it the house floats, and no amount of
          shading on the walls fixes that. */}
      <Ellipse cx="96" cy="152" rx="62" ry="9" fill={colors.primaryDark} opacity={0.14} />

      {/* Roof: the gable seen square on, and the long slope receding right.
          Two tones, because the whole illusion is that one of them is turned
          away from the light. */}
      <Path d="M75 50 L115 28 L154 62 L114 84 Z" fill="url(#roofSide)" />
      <Path d="M34 85 L75 50 L116 85 Z" fill="url(#roofFront)" />

      {/* Walls. The front catches the light, the return side falls away. */}
      <Path d="M40 85 L110 85 L110 150 L40 150 Z" fill="url(#wall)" />
      <Path d="M110 85 L150 63 L150 128 L110 150 Z" fill="url(#wallSide)" />

      {/* The openings, warm rather than gold — light spilling out of a burgundy
          wall, which is what the animation is about. */}
      <AnimatedPath
        d="M64 112 L86 112 L86 150 L64 150 Z"
        fill={colors.accentGoldLight}
        animatedProps={glow}
      />
      <AnimatedPath
        d="M48 96 L62 96 L62 108 L48 108 Z"
        fill={colors.accentGoldLight}
        animatedProps={glow}
      />
      <AnimatedPath
        d="M90 96 L104 96 L104 108 L90 108 Z"
        fill={colors.accentGoldLight}
        animatedProps={glow}
      />
      <AnimatedPath
        d="M120 98 L136 89 L136 103 L120 112 Z"
        fill={colors.accentGold}
        animatedProps={glowSide}
      />
    </Svg>
  );
}
