import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { fonts, type ColorName, type TypeName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { resolveColor, useLit } from './tone';

export type TextProps = Omit<RNTextProps, 'style'> & {
  variant?: TypeName;
  color?: ColorName;
  /** Tabular numerals for times, counts and money. */
  tabular?: boolean;
  /** Instrument Serif italic (the one italic phrase in a headline). */
  italic?: boolean;
  /** Override weight (sans only). */
  weight?: '400' | '600' | '700';
  center?: boolean;
  style?: TextStyle | TextStyle[];
};

const DISPLAY: TypeName[] = ['display', 'largeTitle', 'title'];

export function Text({ variant = 'body', color, tabular, italic, weight, center, style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const t = useTheme();
  const lit = useLit();
  const base = t.text(variant);
  const serifItalic = italic ? { fontFamily: fonts.serifItalic, fontWeight: undefined } : null;
  const s: TextStyle = {
    ...base,
    color: resolveColor(t.c, color, lit),
    ...(weight && !italic && base.fontFamily === fonts.sans ? { fontWeight: weight } : null),
    ...serifItalic,
    ...(tabular ? { fontVariant: ['tabular-nums' as const] } : null),
    ...(center ? { textAlign: 'center' as const } : null),
  };
  // Our own scale already enlarges text; cap the system multiplier on top of it
  // so big titles never blow out the layout.
  const cap = maxFontSizeMultiplier ?? (DISPLAY.includes(variant) ? 1.25 : variant === 'label' || variant === 'caption' ? 1.4 : 1.6);
  return <RNText {...rest} maxFontSizeMultiplier={cap} style={[s, ...(Array.isArray(style) ? style : style ? [style] : [])]} />;
}
