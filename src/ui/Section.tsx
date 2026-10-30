import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Photo } from './Photo';
import { Text } from './Text';

export type SeparatorProps = {
  /** Leading inset in points. Default theme.space.lg (16). */
  inset?: number;
  style?: ViewStyle;
};

export function Separator({ inset, style }: SeparatorProps) {
  const t = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.c.border, marginLeft: inset ?? t.space.lg }, style]} />;
}

export type SectionProps = {
  /** Small label above the group (label style). */
  label?: string;
  /** Muted text under the group. */
  footer?: string;
  children: ReactNode;
  /** Separator inset; default 16. Use ~60 when rows have a leading icon/photo. */
  separatorInset?: number;
  style?: ViewStyle;
};

/** iOS inset-grouped section: label, a rounded card of rows with hairlines, footer. */
export function Section({ label, footer, children, separatorInset, style }: SectionProps) {
  const t = useTheme();
  const items = Children.toArray(children).filter((ch) => isValidElement(ch));
  return (
    <View style={[{ gap: t.space.sm }, style]}>
      {label ? (
        <Text variant="label" color="muted" accessibilityRole="header" style={{ paddingHorizontal: t.space.lg, textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <View style={{ backgroundColor: t.c.card, borderRadius: t.radius.lg, overflow: 'hidden' }}>
        {items.map((ch, i) => (
          <Fragment key={(isValidElement(ch) && ch.key) || i}>
            {i > 0 ? <Separator inset={separatorInset} /> : null}
            {ch}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" color="muted" style={{ paddingHorizontal: t.space.lg }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type RowProps = {
  title: string;
  subtitle?: string;
  /** Leading symbol in a soft tile. */
  icon?: IconName;
  /** Leading avatar. */
  photo?: { uri: string | null | undefined; name?: string };
  /** Custom leading node (overrides icon/photo). */
  leading?: ReactNode;
  /** Muted trailing text ("3 days", "£180"). */
  value?: string;
  valueTabular?: boolean;
  /** Custom trailing node, e.g. a Badge or CountBadge. Shown before the chevron. */
  trailing?: ReactNode;
  /** Defaults to true when onPress is set. */
  chevron?: boolean;
  onPress?: () => void;
  /** Title in danger colour (Sign out, Delete). */
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

/** A list row: two lines max. Place inside `Section`. */
export function Row({
  title,
  subtitle,
  icon,
  photo,
  leading,
  value,
  valueTabular,
  trailing,
  chevron,
  onPress,
  destructive,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  style,
}: RowProps) {
  const t = useTheme();
  const tile = Math.round(30 * t.scale);
  const lead =
    leading ??
    (photo ? (
      <Photo circle size={Math.round(40 * Math.min(t.scale, 1.1))} uri={photo.uri} name={photo.name} accessibilityLabel="" />
    ) : icon ? (
      <View style={{ width: tile, height: tile, borderRadius: t.radius.sm, backgroundColor: t.c.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={destructive ? 'danger' : 'text'} />
      </View>
    ) : null);
  const showChevron = chevron ?? !!onPress;
  const spoken = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');

  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        {
          minHeight: t.hit + (subtitle ? 12 * t.scale : 0),
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.sm + 2,
          gap: t.space.md,
          backgroundColor: pressed ? t.c.fill : 'transparent',
          opacity: disabled ? 0.42 : 1,
        },
        style,
      ]}
    >
      {lead}
      <View style={styles.main}>
        <Text variant="body" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" color="muted" tabular={valueTabular} numberOfLines={1} style={{ flexShrink: 1, maxWidth: '45%' }}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Icon name="forward" size={13} color="faint" weight="semibold" /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken}>
        {content(false)}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minWidth: 0, gap: 1 },
});
