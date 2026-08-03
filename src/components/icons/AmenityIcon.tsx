import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

/**
 * Facility icons.
 *
 * The set follows the same rules as the main icon set — 24×24 grid, 1.75
 * stroke, round caps, geometric construction — with one addition of its own:
 *
 *   **Anything that belongs to the building stands on a ground line.**
 *
 * That line is already the app's signature, carried by Browse and the 360 tour.
 * Here it separates two kinds of fact at a glance: a gate, a generator and a
 * borehole sit on the ground because they are part of the property, while a
 * fitted kitchen or air conditioning floats because it is inside it. Nobody
 * will consciously notice the rule; they will notice that the set looks like
 * one hand drew it.
 *
 * Only the facilities that decide a Lagos rental are drawn individually.
 * Everything else falls back to its group mark, which is deliberate: forty
 * mediocre glyphs read worse than twelve good ones plus a consistent default,
 * and a wrong-but-present icon is more confusing than a neutral one.
 */

interface AmenityIconProps {
  size?: number;
  color?: string;
}

function base(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/** The ground line every building-bound facility stands on. */
const GROUND = <Line x1="3" y1="21" x2="21" y2="21" />;

/**
 * Power — a bolt that is also a meter needle.
 *
 * Not the usual lightning cliché on its own: the bolt sits inside a dial,
 * because in Lagos "power" is never a yes or no, it is a question of how many
 * hours. The dial says supply, the bolt says electricity.
 */
export function IconPower({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="11" r="7.5" />
      <Path d="M12.8 6.5 9.5 11.8h3.2L11.2 15.5" />
      {GROUND}
    </Svg>
  );
}

/** Generator — a box with an exhaust stack and a pull-start line. */
export function IconGenerator({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="3.5" y="11" width="14" height="7.5" rx="1.4" />
      <Path d="M14.5 11V7.5a2 2 0 0 1 2-2h1.5" />
      <Line x1="6.5" y1="14.8" x2="10.5" y2="14.8" />
      {GROUND}
    </Svg>
  );
}

/**
 * Borehole — the water table, reached.
 *
 * A shaft going down through a ground line to a curve of water beneath it.
 * Every other water icon is a droplet; a droplet says "wet", not "we have our
 * own supply and it does not stop when the mains do".
 */
export function IconBorehole({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 4.5h6v3h-6z" />
      <Line x1="12" y1="7.5" x2="12" y2="16" />
      <Line x1="3" y1="12" x2="21" y2="12" />
      <Path d="M7.5 17.5c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0" />
    </Svg>
  );
}

/** Prepaid meter — a display with a keypad, the thing on the wall. */
export function IconMeter({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="4.5" y="3.5" width="15" height="17" rx="1.6" />
      <Rect x="7.5" y="6.5" width="9" height="4" rx="0.8" />
      <Circle cx="8.5" cy="14.5" r="0.9" fill={color} stroke="none" />
      <Circle cx="12" cy="14.5" r="0.9" fill={color} stroke="none" />
      <Circle cx="15.5" cy="14.5" r="0.9" fill={color} stroke="none" />
    </Svg>
  );
}

/** Solar — a panel on its ground line, angled to the sun. */
export function IconSolar({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4 15.5 6.5 8.5h11l2.5 7z" />
      <Line x1="7.4" y1="12" x2="16.6" y2="12" />
      <Line x1="12" y1="8.5" x2="12" y2="15.5" />
      <Line x1="12" y1="15.5" x2="12" y2="21" />
      {GROUND}
    </Svg>
  );
}

/**
 * Security gate — the doorway from Browse, closed and barred.
 *
 * Reusing the app's own doorway rather than a padlock ties the idea back to
 * the brand: this is the same threshold, controlled.
 */
export function IconGate({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4.5 21V8.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V21" />
      <Line x1="9" y1="6.5" x2="9" y2="21" />
      <Line x1="15" y1="6.5" x2="15" y2="21" />
      <Line x1="4.5" y1="13.5" x2="19.5" y2="13.5" />
      {GROUND}
    </Svg>
  );
}

/** CCTV — a housing on its bracket, watching down the frame. */
export function IconCCTV({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4 7.5h11a2 2 0 0 1 2 2v2H6a2 2 0 0 1-2-2z" />
      <Line x1="17" y1="10.5" x2="20.5" y2="9" />
      <Path d="M9 11.5v2a3.5 3.5 0 0 0 3.5 3.5h1" />
      <Circle cx="14.5" cy="17" r="1.4" />
    </Svg>
  );
}

/** Perimeter fence — uprights on the ground line, with a rail. */
export function IconFence({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="6" y1="7" x2="6" y2="21" />
      <Line x1="12" y1="5.5" x2="12" y2="21" />
      <Line x1="18" y1="7" x2="18" y2="21" />
      <Line x1="4" y1="11" x2="20" y2="11" />
      <Line x1="4" y1="16" x2="20" y2="16" />
      {GROUND}
    </Svg>
  );
}

/** Parking — a bay marked on the ground, with the car above it. */
export function IconParking({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M5 15.5 6.5 10.5a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.9 1.4L19 15.5z" />
      <Circle cx="8" cy="15.5" r="1.3" />
      <Circle cx="16" cy="15.5" r="1.3" />
      {GROUND}
    </Svg>
  );
}

/** Pool — the water line, contained. */
export function IconPool({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4 9.5v8M20 9.5v8" />
      <Path d="M4 12.5c2-1.3 4-1.3 6 0s4 1.3 6 0 2.7-1 4 0" />
      <Path d="M4 17c2-1.3 4-1.3 6 0s4 1.3 6 0 2.7-1 4 0" />
      <Line x1="4" y1="9.5" x2="9" y2="9.5" />
      <Line x1="15" y1="9.5" x2="20" y2="9.5" />
    </Svg>
  );
}

/** Gym — a bar loaded at both ends, on the same grid as the rest. */
export function IconGym({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="8" y1="12" x2="16" y2="12" />
      <Rect x="4.5" y="8.5" width="3.5" height="7" rx="1.2" />
      <Rect x="16" y="8.5" width="3.5" height="7" rx="1.2" />
      <Line x1="2.8" y1="10.5" x2="2.8" y2="13.5" />
      <Line x1="21.2" y1="10.5" x2="21.2" y2="13.5" />
    </Svg>
  );
}

/** Air conditioning — the unit, and the air leaving it. */
export function IconAircon({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="3.5" y="5" width="17" height="6.5" rx="1.6" />
      <Line x1="6.5" y1="8.2" x2="17.5" y2="8.2" />
      <Path d="M8 14.5c0 1.6 1.2 1.6 1.2 3.2" />
      <Path d="M12 14.5c0 1.6 1.2 1.6 1.2 3.2" />
      <Path d="M16 14.5c0 1.6 1.2 1.6 1.2 3.2" />
    </Svg>
  );
}

/* ---- Group marks, used for anything without its own drawing ---- */

/** Power & Utilities — the dial alone. */
export function IconGroupPower({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12.8 7 9.5 12.8h3.2L11.2 17" />
    </Svg>
  );
}

/** Security & Safety — a shield built from the doorway's shoulders. */
export function IconGroupSecurity({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M12 3.5 19 6v6.5c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6z" />
    </Svg>
  );
}

/** Interior & Finishing — a room corner, drawn as three planes meeting. */
export function IconGroupInterior({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M12 3.5v10.5" />
      <Path d="M12 14 3.5 9V19l8.5 5 8.5-5V9z" />
    </Svg>
  );
}

/** Outdoor & Communal — a canopy over the ground line. */
export function IconGroupOutdoor({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4.5 12a7.5 7.5 0 0 1 15 0z" />
      <Line x1="12" y1="12" x2="12" y2="21" />
      {GROUND}
    </Svg>
  );
}

type IconComponent = React.ComponentType<AmenityIconProps>;

/** Facilities with a drawing of their own. Everything else uses its group. */
const BY_AMENITY: Record<string, IconComponent> = {
  '24/7 power supply': IconPower,
  'Standby generator': IconGenerator,
  'Prepaid meter': IconMeter,
  'Solar backup': IconSolar,
  Inverter: IconGenerator,
  Borehole: IconBorehole,
  'Treated water': IconBorehole,
  'Security gate': IconGate,
  'Security / gateman': IconGate,
  'CCTV surveillance': IconCCTV,
  'Perimeter fencing': IconFence,
  'Electric fence': IconFence,
  'Car park': IconParking,
  'Drop-off point': IconParking,
  'Swimming pool': IconPool,
  Gym: IconGym,
  'Air conditioning': IconAircon,
};

const BY_GROUP: Record<string, IconComponent> = {
  'Power & Utilities': IconGroupPower,
  'Security & Safety': IconGroupSecurity,
  'Interior & Finishing': IconGroupInterior,
  'Outdoor & Communal': IconGroupOutdoor,
  Other: IconGroupOutdoor,
};

/** Resolves the best icon available: the facility's own, then its group's. */
export function amenityIcon(amenity: string, group: string): IconComponent {
  return BY_AMENITY[amenity] ?? BY_GROUP[group] ?? IconGroupOutdoor;
}
