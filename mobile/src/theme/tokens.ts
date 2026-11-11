import { Platform } from 'react-native';

/**
 * Dyuknow design tokens. The light palette is the website's own
 * (components/preview/preview.css); dark is derived from it.
 * Screens never use a raw hex value — only these tokens.
 *
 * Colour meanings (one each):
 *   ink      — primary action, and "this is waiting on you" (the lit ticket)
 *   sage     — settled: booked, available, verified. Never a button.
 *   danger   — unread and destructive
 */
export const palettes = {
  light: {
    page: '#f5f6f2', // the pass: grouped background
    card: '#ffffff', // a ticket
    raised: '#ffffff',
    fill: '#f5f5f2', // soft fill, pressed rows, inputs
    ink: '#141712',
    onInk: '#ffffff',
    text: '#141712',
    muted: '#5d625c',
    faint: '#8a8f86',
    border: '#e3e6de',
    borderStrong: '#dce0d8',
    neutralBg: '#f2f3ef',
    neutralText: '#52584d',
    sage: '#a8c5a0',
    sageSoft: '#d3e2cc',
    sageText: '#35532b',
    sageDot: '#5f8556',
    onSage: '#172514',
    monoBg: '#efefeb',
    monoText: '#656c60',
    danger: '#9c3333',
    dangerBg: '#f7eeeb',
    dangerText: '#80322c',
    focus: '#3f6541',
    scrim: 'rgba(0,0,0,0.2)',
    shadow: '#142010',
  },
  dark: {
    page: '#0e100d',
    card: '#181b16',
    raised: '#20241e',
    fill: '#23271f',
    ink: '#eef0ea',
    onInk: '#141712',
    text: '#eef0ea',
    muted: '#a6aca1',
    faint: '#7d8378',
    border: '#2a2f27',
    borderStrong: '#363c32',
    neutralBg: '#23271f',
    neutralText: '#c2c8bc',
    sage: '#a8c5a0',
    sageSoft: '#2c3a28',
    sageText: '#c4dbbd',
    sageDot: '#8fb486',
    onSage: '#172514',
    monoBg: '#23271f',
    monoText: '#a6aca1',
    danger: '#e07a72',
    dangerBg: '#3a1e1b',
    dangerText: '#f0b1aa',
    focus: '#a8c5a0',
    scrim: 'rgba(0,0,0,0.45)',
    shadow: '#000000',
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)['light']]: string };
export type ColorName = keyof Palette;

/** Instrument Serif for names, titles and the wordmark; Helvetica (system sans on Android) for everything else. */
export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: Platform.select({ ios: 'Helvetica Neue', default: undefined }),
} as const;

type TypeStyle = {
  size: number;
  line: number;
  weight: '400' | '600' | '700';
  family: 'serif' | 'serifItalic' | 'sans';
  tracking?: number;
};

/** Text styles. Sizes are multiplied by the larger-text scale. */
export const type = {
  display: { size: 40, line: 42, weight: '400', family: 'serif', tracking: -0.6 },
  largeTitle: { size: 34, line: 38, weight: '400', family: 'serif', tracking: -0.4 },
  title: { size: 28, line: 32, weight: '400', family: 'serif', tracking: -0.3 },
  title2: { size: 22, line: 26, weight: '400', family: 'serif' },
  title3: { size: 19, line: 23, weight: '400', family: 'serif' },
  headline: { size: 17, line: 22, weight: '600', family: 'sans' },
  body: { size: 16, line: 23, weight: '400', family: 'sans' },
  callout: { size: 15, line: 21, weight: '400', family: 'sans' },
  subhead: { size: 14, line: 19, weight: '400', family: 'sans' },
  footnote: { size: 13, line: 18, weight: '400', family: 'sans' },
  caption: { size: 12, line: 16, weight: '400', family: 'sans' },
  label: { size: 11, line: 14, weight: '600', family: 'sans', tracking: 0.6 },
} as const satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;

/** 16pt side gutter on every screen. */
export const gutter = 16;

export const radius = { sm: 10, md: 14, lg: 20, card: 24, sheet: 28, pill: 999 } as const;

/** Minimum touch target before scale. */
export const hit = 44;

/** Shared motion. Every screen uses these, nothing else. */
export const motion = {
  spring: { damping: 20, stiffness: 240, mass: 1 },
  springSoft: { damping: 26, stiffness: 160, mass: 1 },
  fast: 160,
  normal: 280,
  slow: 460,
} as const;

/** Larger-text mode multiplies type, icons and touch targets together. */
export const scales = { standard: 1, large: 1.2 } as const;
