import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatNaira } from '../lib/format';
import { duration } from '../theme/motion';

interface AnimatedNairaProps {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Prefix rendered before the figure, e.g. "from ". */
  prefix?: string;
  /** Skip the animation and render the final value immediately. */
  immediate?: boolean;
}

/** Decelerating curve — fast at first, easing into the final figure. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counts up to a naira figure when first rendered.
 *
 * Driven from JavaScript rather than Reanimated because the animated quantity
 * is text content, not a style property. Reanimated cannot drive a Text child
 * without rendering through an AnimatedTextInput, which brings its own styling
 * and accessibility problems for one number. A single Text node updating for
 * under a second is comfortably within budget.
 *
 * The final value is always rendered exactly — the animation never leaves a
 * rounded approximation on screen.
 */
export default function AnimatedNaira({
  value,
  style,
  prefix,
  immediate = false,
}: AnimatedNairaProps) {
  const [displayed, setDisplayed] = useState(immediate ? value : 0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (immediate) {
      setDisplayed(value);
      return;
    }

    const start = Date.now();
    let cancelled = false;

    function tick() {
      if (cancelled) return;

      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration.deliberate, 1);

      if (progress >= 1) {
        setDisplayed(value);
        return;
      }

      setDisplayed(Math.round(value * easeOutCubic(progress)));
      frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, immediate]);

  return (
    <Text style={style} accessibilityLabel={`${prefix ?? ''}${formatNaira(value)}`}>
      {prefix}
      {formatNaira(displayed)}
    </Text>
  );
}
