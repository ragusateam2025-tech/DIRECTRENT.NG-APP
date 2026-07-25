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
} as const;

export const typography = {
  families: {
    display: 'Outfit_700Bold',
    heading: 'Outfit_600SemiBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  sizes: {
    xs: 12,
    sm: 14,
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
