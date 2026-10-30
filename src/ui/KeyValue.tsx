import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export type KeyValueProps = {
  label: string;
  value: ReactNode;
  tabular?: boolean;
  icon?: IconName;
  /** Width of the label column; default 72 (scaled). */
  labelWidth?: number;
  style?: ViewStyle;
};

/** A fact row: muted label, then the value ("When  Fri 14 Nov · 17:00–23:00"). */
export function KeyValue({ label, value, tabular, icon, labelWidth = 72, style }: KeyValueProps) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, { gap: t.space.md, minHeight: Math.round(24 * t.scale) }, style]}
      accessible
      accessibilityLabel={typeof value === 'string' ? `${label}, ${value}` : label}
    >
      <View style={[styles.label, { width: Math.round(labelWidth * t.scale), gap: t.space.xs }]}>
        {icon ? <Icon name={icon} size={14} color="muted" /> : null}
        <Text variant="subhead" color="muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text variant="subhead" weight="600" tabular={tabular} style={{ flex: 1 }}>
          {String(value)}
        </Text>
      ) : (
        <View style={{ flex: 1 }}>{value}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  label: { flexDirection: 'row', alignItems: 'center' },
});
