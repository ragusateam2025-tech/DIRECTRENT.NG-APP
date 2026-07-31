import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

/**
 * The direct line — Directrent's signature mark.
 *
 * Two points, one unbroken run between them: a tenant and an owner with
 * nothing in the middle. It is the company's whole argument reduced to a shape,
 * which is why it earns the empty states rather than a stock illustration.
 *
 * One drawing carries every empty state, varying only in how the connection is
 * expressed. That is deliberate: six different pictures would read as six
 * different decisions, where one mark repeated reads as a brand.
 */

export type IllustrationVariant =
  /** Nothing here yet — the far point is hollow, the line unfinished. */
  | 'empty'
  /** Waiting on someone — the line is dashed, mid-journey. */
  | 'pending'
  /** Nothing matched — the line is present but the points sit outside the frame. */
  | 'noMatch';

interface BrandIllustrationProps {
  variant?: IllustrationVariant;
  size?: number;
}

export default function BrandIllustration({
  variant = 'empty',
  size = 120,
}: BrandIllustrationProps) {
  const height = size * 0.5;

  return (
    <Svg width={size} height={height} viewBox="0 0 120 60" fill="none">
      {variant === 'noMatch' ? (
        <>
          {/* The connection exists; nothing currently sits at either end. */}
          <Line
            x1="18"
            y1="30"
            x2="102"
            y2="30"
            stroke={colors.border}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx="18" cy="30" r="7" stroke={colors.borderLight} strokeWidth={2} />
          <Circle cx="102" cy="30" r="7" stroke={colors.borderLight} strokeWidth={2} />
          <Path
            d="M52 22 L68 38 M68 22 L52 38"
            stroke={colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Line
            x1="25"
            y1="30"
            x2="95"
            y2="30"
            stroke={variant === 'pending' ? colors.accentGold : colors.border}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={variant === 'pending' ? '5 6' : undefined}
            opacity={variant === 'pending' ? 0.8 : 1}
          />

          {/* Near point: the user. Always solid — they are here. */}
          <Circle cx="18" cy="30" r="8" fill={colors.accentGold} opacity={0.9} />

          {/* Far point: whoever they are trying to reach. Hollow until they arrive. */}
          <Circle
            cx="102"
            cy="30"
            r="8"
            fill={variant === 'pending' ? 'none' : 'none'}
            stroke={variant === 'pending' ? colors.accentGold : colors.borderLight}
            strokeWidth={2}
            strokeDasharray={variant === 'empty' ? '3 4' : undefined}
          />
        </>
      )}
    </Svg>
  );
}
