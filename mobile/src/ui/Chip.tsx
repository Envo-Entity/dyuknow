import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { select as tick, warn } from './haptics';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';
import { alpha, LitContext } from './tone';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Small tabular count after the label. */
  count?: number;
  icon?: IconName;
  disabled?: boolean;
  /** Looks unavailable but still takes presses (used when a max is reached). */
  dimmed?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, onPress, count, icon, disabled, dimmed, accessibilityLabel, style }: ChipProps) {
  const t = useTheme();
  const { c } = t;
  const h = Math.round(36 * t.scale);
  const fg = selected ? 'onInk' : 'text';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: (44 - 36) / 2, bottom: (44 - 36) / 2 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (count != null ? `${label}, ${count}` : label)}
      accessibilityState={{ selected, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: h,
          borderRadius: t.radius.pill,
          paddingHorizontal: t.space.md + 2,
          gap: t.space.xs + 2,
          backgroundColor: selected ? c.ink : pressed ? c.fill : c.card,
          borderColor: selected ? c.ink : c.borderStrong,
          opacity: disabled ? 0.42 : dimmed ? 0.5 : 1,
          transform: [{ scale: pressed && !t.reduceMotion ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <LitContext.Provider value={false}>
        {icon ? <Icon name={icon} size={15} color={fg} /> : null}
        <Text variant="subhead" weight="600" color={fg} numberOfLines={1}>
          {label}
        </Text>
        {count != null ? (
          <Text variant="footnote" tabular color={selected ? 'onInk' : 'muted'} style={selected ? { color: alpha(c.onInk, 0.7) } : undefined}>
            {String(count)}
          </Text>
        ) : null}
      </LitContext.Provider>
    </Pressable>
  );
}

export type ChipOption<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
  icon?: IconName;
  disabled?: boolean;
};

type Common<T extends string> = {
  options: ChipOption<T>[];
  style?: ViewStyle;
  /** Spoken name of the group. */
  accessibilityLabel?: string;
};

export type ChipGroupProps<T extends string = string> = Common<T> &
  (
    | {
        multiple: true;
        value: T[];
        onChange: (value: T[]) => void;
        /** Most that can be on; further taps warn and do nothing. */
        max?: number;
        onMaxReached?: () => void;
      }
    | {
        multiple?: false;
        value: T | null;
        onChange: (value: T | null) => void;
        /** Tapping the selected chip clears it. Default true. */
        allowDeselect?: boolean;
      }
  );

export function ChipGroup<T extends string = string>(props: ChipGroupProps<T>) {
  const t = useTheme();
  const { options, style, accessibilityLabel } = props;
  const isOn = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const full = props.multiple && props.max != null && props.value.length >= props.max;

  const press = (v: T) => {
    if (props.multiple) {
      const on = props.value.includes(v);
      if (!on && props.max != null && props.value.length >= props.max) {
        warn();
        props.onMaxReached?.();
        return;
      }
      tick();
      props.onChange(on ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      const on = props.value === v;
      if (on && props.allowDeselect === false) return;
      tick();
      props.onChange(on ? null : v);
    }
  };

  return (
    <View style={[styles.group, { gap: t.space.sm }, style]} accessibilityLabel={accessibilityLabel} accessibilityRole={props.multiple ? undefined : 'radiogroup'}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          count={o.count}
          icon={o.icon}
          disabled={o.disabled}
          selected={isOn(o.value)}
          dimmed={full && !isOn(o.value)}
          onPress={() => press(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  group: { flexDirection: 'row', flexWrap: 'wrap' },
});
