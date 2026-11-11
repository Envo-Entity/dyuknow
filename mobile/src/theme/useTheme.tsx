import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme, type TextStyle } from 'react-native';

import { fonts, hit, motion, palettes, radius, scales, space, type, type Palette, type TypeName } from './tokens';

type TextSize = keyof typeof scales;

export type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  /** Larger-text multiplier for type, icons and touch targets. */
  scale: number;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  reduceMotion: boolean;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  /** Minimum touch target at the current scale. */
  hit: number;
  /** A ready-to-use text style for a type token. */
  text: (name: TypeName) => TextStyle;
};

const TEXT_SIZE_KEY = 'dyuknow.text-size';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [textSize, setTextSizeState] = useState<TextSize>('standard');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TEXT_SIZE_KEY)
      .then((v) => v === 'large' && setTextSizeState('large'))
      .catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const theme = useMemo<Theme>(() => {
    const scale = scales[textSize];
    const c = palettes[scheme];
    return {
      scheme,
      c,
      scale,
      textSize,
      setTextSize: (size) => {
        setTextSizeState(size);
        AsyncStorage.setItem(TEXT_SIZE_KEY, size).catch(() => {});
      },
      reduceMotion,
      space,
      radius,
      motion,
      hit: Math.round(hit * scale),
      text: (name) => {
        const t = type[name];
        const tracking = 'tracking' in t ? t.tracking : undefined;
        return {
          fontFamily: fonts[t.family],
          // Custom serif files carry their own weight; only the system sans takes fontWeight.
          fontWeight: t.family === 'sans' ? t.weight : undefined,
          fontSize: Math.round(t.size * scale),
          lineHeight: Math.round(t.line * scale),
          letterSpacing: tracking,
          color: c.text,
        };
      },
    };
  }, [scheme, textSize, reduceMotion]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside ThemeProvider');
  return t;
}
