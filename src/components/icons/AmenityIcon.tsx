import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { canonicalAmenity } from '../../data/amenities';

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
 * All 36 facilities in the catalogue are drawn individually. The four group marks remain as a
 * fallback for wording from older listings and for anything added later, so a
 * new facility renders as something neutral rather than nothing.
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

/** Inverter — a box turning a flat line into a wave. DC in, AC out. */
export function IconInverter({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="3.5" y="7" width="17" height="11" rx="1.6" />
      <Path d="M7 14.5c1.4 0 1.4-3.4 2.8-3.4s1.4 3.4 2.8 3.4 1.4-3.4 2.8-3.4 1.4 3.4 1.6 3.4" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Treated water — a funnel with its filter bed, and what comes out clean. */
export function IconTreatedWater({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4.5 4.5h15l-5.5 7v5l-4 2.5v-7.5z" />
      <Line x1="7.5" y1="8" x2="16.5" y2="8" />
      <Path d="M12 19.5c0 1-1.6 1.6-1.6 0a1.6 1.6 0 0 1 1.6-1.6z" fill={color} />
    </Svg>
  );
}

/** Water heater — a tank with the heat rising off it. */
export function IconWaterHeater({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="6.5" y="8" width="11" height="10.5" rx="3" />
      <Path d="M9.5 5.5c0-1.2 1-1.2 1-2.4M14.5 5.5c0-1.2 1-1.2 1-2.4" />
      <Line x1="9.5" y1="13" x2="14.5" y2="13" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/**
 * Gateman — the man at the gate, scanner in hand.
 *
 * The person is the amenity, not the barrier: a gate with nobody on it is a
 * gate anyone climbs. He stands beside the post with the baton raised at the
 * angle it is actually held, and the two arcs are the sweep it makes.
 */
export function IconGateman({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      {/* The post he stands at. */}
      <Line x1="19" y1="5.5" x2="19" y2="21" />
      <Line x1="16" y1="5.5" x2="19" y2="5.5" />

      {/* Head, body, legs. */}
      <Circle cx="8.5" cy="5.6" r="2.3" />
      <Line x1="8.5" y1="8" x2="8.5" y2="14.5" />
      <Path d="M8.5 14.5 6.5 21M8.5 14.5 10.5 21" />

      {/* The arm and the baton it holds, raised across the body. */}
      <Path d="M8.5 10.5 12.2 8.6" />
      <Line x1="11.5" y1="10.2" x2="14.4" y2="6" />

      {/* Two arcs: the scan the baton sweeps. */}
      <Path d="M15.4 8.2a3.4 3.4 0 0 1 0 4.4" />
      <Path d="M17.1 6.9a5.6 5.6 0 0 1 0 7" />

      {GROUND}
    </Svg>
  );
}

/** Electric fence — the fence, with the charge riding along its top wire. */
export function IconElectricFence({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="6.5" y1="10" x2="6.5" y2="21" />
      <Line x1="17.5" y1="10" x2="17.5" y2="21" />
      <Line x1="4" y1="14" x2="20" y2="14" />
      <Line x1="4" y1="18" x2="20" y2="18" />
      <Path d="M12.6 3.5 9.8 8h2.6l-1.2 3" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Burglar proof — the window, and the bars across it. */
export function IconBurglarProof({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="4" y="4" width="16" height="16" rx="1.6" />
      <Line x1="9.3" y1="4" x2="9.3" y2="20" />
      <Line x1="14.6" y1="4" x2="14.6" y2="20" />
      <Line x1="4" y1="12" x2="20" y2="12" />
    </Svg>
  );
}

/** Fire safety — an extinguisher, standing where you would find it. */
export function IconFireSafety({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="8" y="8" width="7" height="10.5" rx="2.2" />
      <Path d="M10 8V6.2a1.7 1.7 0 0 1 1.7-1.7h1.6" />
      <Path d="M15 7.2h2.6v3" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Intercom — a wall panel with its handset and call button. */
export function IconIntercom({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="5" y="3.5" width="14" height="17" rx="1.8" />
      <Path d="M8.5 7.5h4.5" />
      <Circle cx="15.5" cy="7.5" r="1.1" fill={color} stroke="none" />
      <Rect x="8" y="12" width="8" height="5" rx="1.4" />
    </Svg>
  );
}

/** Fitted kitchen — the counter, its sink, and the units under it. */
export function IconKitchen({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="3" y1="10" x2="21" y2="10" />
      <Path d="M4.5 10v10.5h15V10" />
      <Circle cx="8.5" cy="14" r="1.8" />
      <Line x1="14" y1="13" x2="14" y2="17.5" />
      <Path d="M14.5 6.5V4M17 6.5V4" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Built-in wardrobes — full-height doors, and the handles that meet. */
export function IconWardrobe({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="4.5" y="3" width="15" height="18" rx="1.6" />
      <Line x1="12" y1="3" x2="12" y2="21" />
      <Line x1="10.5" y1="11" x2="10.5" y2="13.5" />
      <Line x1="13.5" y1="11" x2="13.5" y2="13.5" />
    </Svg>
  );
}

/** En-suite — the bed, with its own door off it. */
export function IconEnsuite({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M3 18.5v-6a2 2 0 0 1 2-2h6v8" />
      <Path d="M3 14h8" />
      <Circle cx="6" cy="8" r="1.6" />
      <Path d="M14 20.5V6.5a1.5 1.5 0 0 1 1.5-1.5H20v15.5" />
      <Circle cx="16.5" cy="13" r="0.8" fill={color} stroke="none" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** POP ceiling — the stepped cornice, seen in section, with its light. */
export function IconPopCeiling({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M3 4.5h18M4.5 4.5v3h15v-3" />
      <Path d="M7 7.5v2.5h10V7.5" />
      <Path d="M10.5 13.5a1.5 1.5 0 0 1 3 0" />
      <Line x1="12" y1="10" x2="12" y2="11.5" />
    </Svg>
  );
}

/** Tiled floors — the grid, laid in perspective so it reads as a floor. */
export function IconTiledFloor({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M2.5 19.5 7 8.5h10l4.5 11z" />
      <Path d="M4.6 14.5h14.8" />
      <Path d="M12 8.5v11" />
      <Path d="M8.4 19.5 9.8 8.5M15.6 19.5 14.2 8.5" />
    </Svg>
  );
}

/** Furnished — a seat with its back and arms, the shorthand for a room ready. */
export function IconFurnished({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M5 12V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V12" />
      <Path d="M3.5 12a2 2 0 0 1 2 2v3h13v-3a2 2 0 0 1 2-2v6H3.5z" />
      <Line x1="6" y1="18" x2="6" y2="20.5" />
      <Line x1="18" y1="18" x2="18" y2="20.5" />
    </Svg>
  );
}

/** Guest toilet — cistern and bowl, drawn plainly. */
export function IconGuestToilet({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="6" y="3.5" width="9" height="4.5" rx="1" />
      <Path d="M7 8h11v2.5a6 6 0 0 1-6 6H10z" />
      <Line x1="10" y1="16.5" x2="9" y2="20.5" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Balcony — the slab that projects, and the rail that makes it usable. */
export function IconBalcony({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M6 3.5h12v6" />
      <Line x1="3" y1="14" x2="21" y2="14" />
      <Line x1="4.5" y1="14" x2="4.5" y2="21" />
      <Line x1="19.5" y1="14" x2="19.5" y2="21" />
      <Line x1="9.5" y1="14" x2="9.5" y2="21" />
      <Line x1="14.5" y1="14" x2="14.5" y2="21" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Landscaped garden — a tended shrub on its ground line. */
export function IconGarden({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M12 18.5V9" />
      <Path d="M12 12c-3.5 0-4.5-2.4-4.5-4.5 2.6 0 4.5 1.4 4.5 4.5z" />
      <Path d="M12 9.5c3.5 0 4.5-2.4 4.5-4.5C13.9 5 12 6.4 12 9.5z" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Clubhouse — a building with a canopy, the shared one. */
export function IconClubhouse({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M3.5 10.5 12 4.5l8.5 6" />
      <Path d="M5.5 10.5V21M18.5 10.5V21" />
      <Path d="M9.5 21v-6h5v6" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Playground — a slide, which no adult mistakes for anything else. */
export function IconPlayground({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M7 21V9l4-3.5" />
      <Path d="M11 5.5 19 21" />
      <Path d="M11 9.5 7.5 12M11 13 7.5 15.5" />
      <Circle cx="17" cy="7" r="1.6" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Outdoor lighting — the lamp head, its post, and the light it throws. */
export function IconOutdoorLight({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M8 8.5a4 4 0 0 1 8 0z" />
      <Line x1="12" y1="8.5" x2="12" y2="21" />
      <Path d="M6.5 12.5 4 15M17.5 12.5 20 15" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Drop-off point — the bay, and the arc a car takes into it. */
export function IconDropOff({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4 17c2.5-6 11-8 16-6.5" />
      <Path d="M17.5 7.5 20.5 10.5 17 12.5" />
      <Rect x="4" y="18" width="7" height="2.5" rx="0.8" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/** Jogging track — the lap, drawn as the lane you actually run. */
export function IconJoggingTrack({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M8 6.5h8a5.5 5.5 0 0 1 0 11H8a5.5 5.5 0 0 1 0-11z" />
      <Path d="M9.5 9.5h5a2.5 2.5 0 0 1 0 5h-5a2.5 2.5 0 0 1 0-5z" />
    </Svg>
  );
}

/** Multi-purpose hall — the wide span, columns and all. */
export function IconHall({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M2.5 8.5 12 3.5l9.5 5" />
      <Line x1="5.5" y1="10.5" x2="5.5" y2="18" />
      <Line x1="12" y1="10.5" x2="12" y2="18" />
      <Line x1="18.5" y1="10.5" x2="18.5" y2="18" />
      <Line x1="3.5" y1="18" x2="20.5" y2="18" />
      <Line x1="3" y1="21" x2="21" y2="21" />
    </Svg>
  );
}

/**
 * Serviced compound — the enclosure, with the orbit of something recurring.
 *
 * The same sweep as the 360 tour, used for its other meaning: this is a place
 * where maintenance comes round, not a one-off.
 */
export function IconServicedCompound({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="3.5" y="6" width="17" height="12" rx="1.6" />
      <Path d="M9 12a3 3 0 0 0 6 0 3 3 0 0 0-6 0" />
      <Path d="M13.9 9.7l1.4.3-.4 1.4" />
      <Line x1="3" y1="21" x2="21" y2="21" />
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

/**
 * Laundry space — a line with two garments, sagging under the weight.
 *
 * Floats rather than standing on the ground line: it is a space inside the
 * property, not a structure on the plot. The sag is the whole drawing — a
 * straight line with rectangles on it reads as shelving.
 */
export function IconLaundry({ size = 20, color = colors.accentGold }: AmenityIconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M3 6.5Q12 9 21 6.5" />
      <Rect x="6.4" y="8.4" width="4" height="6.2" rx="1" />
      <Rect x="13.6" y="9.2" width="4" height="7.4" rx="1" />
    </Svg>
  );
}

/**
 * Every facility in the catalogue now has its own drawing.
 *
 * The group marks below stay as the fallback, for two reasons: a listing
 * written before this catalogue can carry wording that is no longer in it, and
 * a future facility should render as something neutral rather than nothing
 * while its own icon is being drawn.
 */
const BY_AMENITY: Record<string, IconComponent> = {
  // Power & Utilities
  '24/7 power supply': IconPower,
  'Standby generator': IconGenerator,
  'Prepaid meter': IconMeter,
  'Solar backup': IconSolar,
  Inverter: IconInverter,
  Borehole: IconBorehole,
  'Treated water': IconTreatedWater,
  'Water heater': IconWaterHeater,

  // Security & Safety
  'Security gate': IconGate,
  'Security / gateman': IconGateman,
  'CCTV surveillance': IconCCTV,
  'Perimeter fencing': IconFence,
  'Electric fence': IconElectricFence,
  'Burglar proof': IconBurglarProof,
  'Fire safety': IconFireSafety,
  Intercom: IconIntercom,

  // Interior & Finishing
  'Fitted kitchen': IconKitchen,
  'Built-in wardrobes': IconWardrobe,
  'En-suite bedrooms': IconEnsuite,
  'POP ceiling': IconPopCeiling,
  'Tiled floors': IconTiledFloor,
  'Air conditioning': IconAircon,
  Furnished: IconFurnished,
  'Guest toilet': IconGuestToilet,

  // Outdoor & Communal
  'Car park': IconParking,
  Balcony: IconBalcony,
  'Landscaped garden': IconGarden,
  'Swimming pool': IconPool,
  Gym: IconGym,
  Clubhouse: IconClubhouse,
  Playground: IconPlayground,
  'Outdoor lighting': IconOutdoorLight,
  'Drop-off point': IconDropOff,
  'Jogging track': IconJoggingTrack,
  'Multi-purpose hall': IconHall,
  'Serviced compound': IconServicedCompound,
  'Laundry space': IconLaundry,
};

const BY_GROUP: Record<string, IconComponent> = {
  'Power & Utilities': IconGroupPower,
  'Security & Safety': IconGroupSecurity,
  'Interior & Finishing': IconGroupInterior,
  'Outdoor & Communal': IconGroupOutdoor,
};

/**
 * Resolves the best icon available: the facility's own, then its group's mark.
 *
 * Older wording is aliased to the catalogue first, so "Backup generator" gets
 * the generator and "Parking for two" gets the car park. Without that step
 * every synonym fell through to the outdoor group mark, and a renter saw a
 * generator, a borehole and a parking space all wearing the same tree.
 *
 * Returns null only for wording that resolves to nothing at all. An icon that
 * does not mean what it sits beside is worse than no icon — it reads as a
 * mistake and makes the whole set look arbitrary — so anything genuinely
 * unrecognised renders as text alone rather than borrowing a picture.
 */
export function amenityIcon(amenity: string, group: string): IconComponent | null {
  const canonical = canonicalAmenity(amenity);
  return BY_AMENITY[amenity] ?? BY_AMENITY[canonical] ?? BY_GROUP[group] ?? null;
}
