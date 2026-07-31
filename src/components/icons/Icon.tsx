import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

/**
 * Directrent's icon set.
 *
 * Drawn rather than borrowed, so the interface reads as one designed thing.
 * Three rules hold across every glyph:
 *
 *  - Geometric construction. Outfit is a geometric sans, so the icons are built
 *    from the same primitives: circles, straight runs, consistent angles.
 *  - One stroke weight (1.75 at 24px), scaled proportionally. Mixed weights are
 *    the fastest way to make an icon set look assembled from different places.
 *  - Round caps and joins, matching the type's soft terminals.
 *
 * Everything is stroked on a 24×24 grid and scaled, so a single size prop keeps
 * optical weight consistent wherever an icon appears.
 */

export interface IconProps {
  size?: number;
  color?: string;
  /** Filled variants signal an active or committed state — a saved property, the current tab. */
  filled?: boolean;
}

const GRID = 24;

function baseProps(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: `0 0 ${GRID} ${GRID}`,
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/**
 * Browse — a doorway rather than a house.
 *
 * Every property app draws a house with a pitched roof. Directrent is about
 * getting through the door without a middleman, so the door is the subject.
 */
export function IconBrowse({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Path d="M5 21V6.5a1.5 1.5 0 0 1 1.1-1.44l9-2.5A1.5 1.5 0 0 1 17 4v17" fill={filled ? color : 'none'} fillOpacity={filled ? 0.14 : 0} />
      <Line x1="3" y1="21" x2="20" y2="21" />
      <Circle cx="13.6" cy="12.5" r="0.9" fill={color} stroke="none" />
    </Svg>
  );
}

/**
 * Listings — stacked plates, the owner's portfolio.
 *
 * Reads as "several properties" without repeating the doorway at a smaller size,
 * which would be illegible in a tab bar.
 */
export function IconListings({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Rect x="3" y="12.5" width="18" height="8.5" rx="1.6" fill={filled ? color : 'none'} fillOpacity={filled ? 0.14 : 0} />
      <Line x1="5.5" y1="9" x2="18.5" y2="9" />
      <Line x1="8" y1="5.5" x2="16" y2="5.5" />
    </Svg>
  );
}

/**
 * Saved — a floppy disk, the desktop save glyph.
 *
 * Three parts, same as the object: the body with its clipped corner, the metal
 * shutter across the top, and the label below. The label fills when the
 * property is saved, so the state reads at a glance rather than depending on
 * the whole shape darkening.
 */
export function IconSaved({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Path
        d="M5.5 3.5h9.7l5.3 5.3v9.7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.14 : 0}
      />
      <Rect x="8" y="3.5" width="6" height="4.7" />
      <Rect
        x="7"
        y="13.2"
        width="10"
        height="7.3"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.9 : 0}
      />
    </Svg>
  );
}

/**
 * Enquiries — the direct line.
 *
 * Two points with one unbroken run between them: the brand's whole argument
 * reduced to a mark. Tenant here, owner there, nothing in the middle.
 */
export function IconEnquiries({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Circle cx="5" cy="12" r="2.4" fill={filled ? color : 'none'} />
      <Circle cx="19" cy="12" r="2.4" fill={filled ? color : 'none'} />
      <Line x1="7.4" y1="12" x2="16.6" y2="12" />
    </Svg>
  );
}

/**
 * Messages — a speech bubble, kept distinct from Enquiries.
 *
 * Enquiries is the direct line: a formal request with a status. This is the
 * talking that happens around it, so it takes the conversational shape rather
 * than a second variation on the line.
 */
export function IconMessages({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Path
        d="M20.5 12.8a7.7 7.7 0 0 1-8.3 7.7L5 21.5l1.2-4.3a7.7 7.7 0 1 1 14.3-4.4Z"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.14 : 0}
      />
    </Svg>
  );
}

/** Profile — a circle and a shoulder line, on the same geometric grid. */
export function IconProfile({ size = 24, color = colors.textSecondary, filled }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Circle cx="12" cy="8.5" r="3.6" fill={filled ? color : 'none'} fillOpacity={filled ? 0.16 : 0} />
      <Path d="M5 20.5a7 7 0 0 1 14 0" />
    </Svg>
  );
}

/** Search — the same circle primitive as Profile, with a handle. */
export function IconSearch({ size = 24, color = colors.textMuted }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Circle cx="11" cy="11" r="6.2" />
      <Line x1="15.6" y1="15.6" x2="20" y2="20" />
    </Svg>
  );
}

/** Filters — three runs of decreasing length: the act of narrowing, drawn. */
export function IconFilters({ size = 24, color = colors.textSecondary }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Line x1="4" y1="7" x2="20" y2="7" />
      <Line x1="7" y1="12" x2="17" y2="12" />
      <Line x1="10" y1="17" x2="14" y2="17" />
    </Svg>
  );
}

export function IconClose({ size = 24, color = colors.textMuted }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Line x1="6" y1="6" x2="18" y2="18" />
      <Line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

export function IconCamera({ size = 24, color = colors.accentGold }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Path d="M3 8.5h3.2l1.4-2.2h8.8l1.4 2.2H21v11H3z" />
      <Circle cx="12" cy="14" r="3.4" />
    </Svg>
  );
}

export function IconGallery({ size = 24, color = colors.accentGold }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Rect x="3.5" y="5" width="17" height="14" rx="1.8" />
      <Circle cx="8.5" cy="10" r="1.4" />
      <Path d="M4.5 17.5 9.8 12.6l3 2.6 3-2.4 3.7 3.4" />
    </Svg>
  );
}

export function IconPlus({ size = 24, color = colors.accentGold }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Line x1="12" y1="5.5" x2="12" y2="18.5" />
      <Line x1="5.5" y1="12" x2="18.5" y2="12" />
    </Svg>
  );
}

export function IconCheck({ size = 24, color = colors.success }: IconProps) {
  return (
    <Svg {...baseProps(size, color)}>
      <Path d="M5 12.5 10 17.5 19 7" />
    </Svg>
  );
}
