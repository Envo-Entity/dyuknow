import type { ReactNode } from 'react';
import { View, type DimensionValue, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { alpha, LitContext } from './tone';

export type ScrimProps = {
  /** Which edge darkens; default 'bottom'. */
  edge?: 'bottom' | 'top';
  /** How far it reaches; default '62%'. */
  height?: DimensionValue;
  /** Darkness at the edge, 0–1; default 0.8. */
  strength?: number;
  style?: ViewStyle;
};

/**
 * A gradient that darkens a photo's edge so light text reads over it, in both
 * themes. Place it absolutely inside the photo's box, under the text.
 */
export function Scrim({ edge = 'bottom', height = '62%', strength = 0.8, style }: ScrimProps) {
  const { c } = useTheme();
  const dark = c.shadow;
  const dir = edge === 'bottom' ? 'to bottom' : 'to top';
  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, right: 0, height },
        edge === 'bottom' ? { bottom: 0 } : { top: 0 },
        { backgroundImage: `linear-gradient(${dir}, ${alpha(dark, 0)}, ${alpha(dark, strength * 0.52)} 45%, ${alpha(dark, strength)})` },
        style,
      ]}
    />
  );
}

/**
 * Text and icons inside read light over a `Scrim`, in both themes (`text`,
 * `muted` and `faint` turn white-ish). Put the words over the photo inside it.
 */
export function OnPhoto({ children }: { children: ReactNode }) {
  const { scheme } = useTheme();
  // In light mode the lit context turns text white; in dark mode text is already light.
  return <LitContext.Provider value={scheme === 'light'}>{children}</LitContext.Provider>;
}
