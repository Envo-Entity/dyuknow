import SegmentedControlNative, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import type { ComponentType } from 'react';
import type { ViewStyle } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { select as tick } from './haptics';

// The package ships a class type that React 19's JSX types reject; the runtime is fine.
const SegmentedControl = SegmentedControlNative as unknown as ComponentType<SegmentedControlProps>;

export type SegmentedProps<T extends string = string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Segmented<T extends string = string>({ options, value, onChange, disabled, style }: SegmentedProps<T>) {
  const t = useTheme();
  const { c } = t;
  const size = Math.round(14 * t.scale);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <SegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={index}
      enabled={!disabled}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (next && next.value !== value) {
          tick();
          onChange(next.value);
        }
      }}
      appearance={t.scheme}
      backgroundColor={c.fill}
      tintColor={t.scheme === 'dark' ? c.raised : c.card}
      fontStyle={{ color: c.muted, fontSize: size, fontFamily: fonts.sans, fontWeight: '400' }}
      activeFontStyle={{ color: c.text, fontSize: size, fontFamily: fonts.sans, fontWeight: '600' }}
      style={[{ minHeight: Math.round(34 * t.scale) }, style]}
    />
  );
}
