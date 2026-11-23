/**
 * needs locker - Official Brand Theme & Color Tokens
 * Derived from gemini-code-1795336726940.md & brand specifications
 */

import '@/global.css';
import { Platform } from 'react-native';

export const BrandColors = {
  primary: '#FF7A00',
  primaryDeep: '#E64A00',
  wordmark: '#C84600',
  foreground: '#FFFDFB',
  pitchBlack: '#0A0604',
  black: '#000000',
  warmPeach: '#FDE5D4',
  softCream: '#FFFDFB',
  cleanSlate: '#F7F8FA',
  securityMint: '#10B981',
  dangerRed: '#EF4444',
  borderLight: '#F0E6DF',
  borderDark: '#1F1713',
} as const;

export const Colors = {
  light: {
    primary: BrandColors.primary,
    primaryDeep: BrandColors.primaryDeep,
    wordmark: BrandColors.wordmark,
    text: '#1C1917',
    textSecondary: '#78716C',
    background: BrandColors.cleanSlate,
    cardBackground: '#FFFFFF',
    backgroundElement: BrandColors.warmPeach,
    backgroundSelected: '#FCD8C1',
    border: BrandColors.borderLight,
    surface: '#FFFFFF',
    tint: BrandColors.primary,
    badgeBackground: BrandColors.warmPeach,
    badgeText: BrandColors.wordmark,
    securityBadge: BrandColors.securityMint,
  },
  dark: {
    primary: BrandColors.primary,
    primaryDeep: BrandColors.primaryDeep,
    wordmark: BrandColors.primary,
    text: '#F5F5F4',
    textSecondary: '#A8A29E',
    background: BrandColors.pitchBlack,
    cardBackground: '#140F0D',
    backgroundElement: '#1F1713',
    backgroundSelected: '#2C1F18',
    border: BrandColors.borderDark,
    surface: '#140F0D',
    tint: BrandColors.primary,
    badgeBackground: '#261710',
    badgeText: '#FFA25B',
    securityBadge: BrandColors.securityMint,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Soft ambient shadows.
 * Android draws `elevation` as a hard dark shadow and ignores shadowRadius/opacity,
 * so elevation stays low (1-4) while the large iOS blur carries the softness.
 */
export const SoftShadows = {
  /** Cards, tiles, list rows - barely-there lift. */
  card: {
    shadowColor: '#7A4826',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  /** Chips, segmented controls - almost flat. */
  subtle: {
    shadowColor: '#7A4826',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  /** Floating nav bars and raised controls. */
  floating: {
    shadowColor: '#7A4826',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  /** Bottom sheets - broad soft halo. */
  sheet: {
    shadowColor: '#4A2E1D',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  /** Primary buttons - gentle colored glow. */
  button: {
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 2,
  },
  /** Full-screen overlay modals. */
  modal: {
    shadowColor: '#2A1A10',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 4,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
