import { createContext, useContext } from 'react';

import type { ColorName, Palette } from '@/theme/tokens';

/**
 * True inside a lit (ink) surface such as `<Ticket lit>`. Text, Icon, Badge
 * and Button read it so they flip to onInk without the caller doing anything.
 * Surfaces that paint their own background (Badge, Button, Photo) reset it.
 */
export const LitContext = createContext(false);

export function useLit(): boolean {
  return useContext(LitContext);
}

/** `#rrggbb` + opacity → `rgba()`. Works on token values only. */
export function alpha(color: string, opacity: number): string {
  if (!color.startsWith('#') || color.length !== 7) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Resolve a colour token, adapting the neutral text colours on a lit surface. */
export function resolveColor(c: Palette, name: ColorName | undefined, lit: boolean, fallback: ColorName = 'text'): string {
  const n = name ?? fallback;
  if (!lit) return c[n];
  switch (n) {
    case 'text':
    case 'ink':
    case 'onInk':
      return c.onInk;
    case 'muted':
    case 'neutralText':
      return alpha(c.onInk, 0.74);
    case 'faint':
      return alpha(c.onInk, 0.56);
    default:
      return c[n];
  }
}
