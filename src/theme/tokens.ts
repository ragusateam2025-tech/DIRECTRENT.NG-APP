// Design tokens — source of truth: DIRECTRENT_MOBILE_HANDOFF.md

export const colors = {
  // Primary palette
  primaryDark: '#1A0A0A',
  primaryMedium: '#2D1515',
  primaryLight: '#4A2020',

  // Accent — Gold
  accentGold: '#D4A853',
  accentGoldLight: '#E5C47A',
  accentGoldDark: '#B8923F',

  // Accent — Coral
  accentCoral: '#E85A4F',
  accentCoralLight: '#F07D74',
  accentCoralDark: '#D14338',

  // Accent — Orange
  accentOrange: '#F5A623',

  // Semantic
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#F87171',
  errorDark: '#DC2626',
  info: '#3B82F6',

  // Text (on dark backgrounds)
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  textDisabled: 'rgba(255,255,255,0.3)',

  // Surface & Border
  background: '#1A0A0A',
  backgroundPaper: '#2D1515',
  backgroundElevated: '#3D2020',
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.2)',
  borderGold: '#D4A853',

  /**
   * A light surface, for the rare panel that inverts the app.
   *
   * The app is dark throughout; this exists so a deliberate exception — the
   * home hero — can be written in tokens rather than a raw hex string. Text on
   * it must be `primaryDark`, never gold: `accentGold` on white measures about
   * 2.9:1, below the 3:1 floor for large text, so gold belongs in a fill here
   * rather than in a letterform.
   */
  surfaceLight: '#FFFFFF',
  surfaceLightMuted: '#F4EFEA',
} as const;

export const typography = {
  families: {
    display: 'Outfit_700Bold',
    heading: 'Outfit_600SemiBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  /**
   * The scale, and the rule for choosing from it.
   *
   * **Anything written in sentences gets `sm` (14) or larger. `xs` (12) is for
   * things that are glanced at, never read** — badges, counts, timestamps, the
   * small gold label above a group of chips.
   *
   * This is worth stating because the natural way to make a note look secondary
   * is to shrink it, and doing that repeatedly ends with a screen whose
   * explanatory copy — exactly the copy a first-time user depends on — is set
   * below the size at which reading is comfortable. Android treats 12sp as
   * caption size for that reason.
   *
   * **Carry hierarchy with colour and weight instead.** `textSecondary` and
   * `textMuted` against `textPrimary` separate a note from the thing it
   * explains perfectly well, and cost nothing in legibility. A muted 14 reads
   * as secondary; a 12 reads as secondary and also as unreadable on a phone
   * held at arm's length on a bus, which is where this app gets used.
   */
  sizes: {
    /** Labels, badges, counts, timestamps. Not sentences. */
    xs: 12,
    /** The floor for prose: notes, list content, supporting copy. */
    sm: 14,
    /** Body copy someone sits and reads — descriptions, message bubbles. */
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radius = {
  /**
   * Anything with words inside it: buttons, chips, tags, inputs.
   *
   * One value, deliberately. The app had grown three different shapes for the
   * same idea — a near-square button here, a 16px chip there, a 24px pill
   * somewhere else — and on one screen you could see all three at once, which
   * reads as three different apps rather than one.
   *
   * Nearly square is the choice, taken from the profile controls: it sits with
   * Outfit's geometric construction, and it keeps the rounded shapes for things
   * that are genuinely containers rather than labels.
   */
  control: 2,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
