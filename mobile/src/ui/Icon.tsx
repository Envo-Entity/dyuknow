import { SymbolView, type AndroidSymbol, type SymbolWeight } from 'expo-symbols';
import { Platform, type ViewStyle } from 'react-native';

import type { ColorName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { icons, type IconName } from './icons';
import { resolveColor, useLit } from './tone';

export type IconProps = {
  name: IconName;
  /** Points before the larger-text scale. Default 20. */
  size?: number;
  color?: ColorName;
  /** Use the filled iOS variant. */
  selected?: boolean;
  weight?: SymbolWeight;
  style?: ViewStyle;
  /** Icons are decorative by default; pass a label to make one readable. */
  accessibilityLabel?: string;
};

export function Icon({ name, size = 20, color, selected, weight, style, accessibilityLabel }: IconProps) {
  const t = useTheme();
  const lit = useLit();
  const def = icons[name];
  const px = Math.round(size * t.scale);
  return (
    <SymbolView
      name={{ ios: selected ? def.iosSelected : def.ios, android: def.android as AndroidSymbol, web: def.android as AndroidSymbol }}
      size={px}
      tintColor={resolveColor(t.c, color, lit)}
      weight={Platform.OS === 'ios' && weight ? weight : undefined}
      style={[{ width: px, height: px }, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
