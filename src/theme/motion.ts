// Motion tokens. Timings and easings live here so animation feels like one
// system rather than a per-component decision.
//
// The guiding rule: motion should explain what happened, not decorate. Things
// that enter from below are arriving; things that scale down are being pressed;
// the savings figure counts up because the number is the point of the screen.

import { Easing } from 'react-native-reanimated';

export const duration = {
  /** Press feedback. Fast enough to feel like a direct response to touch. */
  instant: 120,
  /** Most transitions — fades, slides, colour changes. */
  quick: 240,
  /** Entrances and anything the eye should follow. */
  normal: 380,
  /** The savings count-up. Long enough to read, short enough not to delay. */
  deliberate: 900,
} as const;

export const easing = {
  /** Decelerating. For things arriving on screen. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Symmetric. For things changing in place. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

/** Springs for touch feedback — no duration, physics decides. */
export const spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  settle: { damping: 14, stiffness: 140, mass: 0.9 },
} as const;

/**
 * Delay for the nth item in a staggered list.
 *
 * Capped deliberately: past roughly the sixth item the user is scrolling, not
 * watching, and a growing delay would make lower cards feel broken.
 */
export function stagger(index: number, step = 70, max = 420): number {
  return Math.min(index * step, max);
}

/** How far cards travel when entering, in points. */
export const travel = 18;
