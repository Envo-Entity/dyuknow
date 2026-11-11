import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { ColorName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';
import { alpha, LitContext, useLit } from './tone';

export type BadgeTone = 'neutral' | 'good' | 'attention' | 'danger';

export type BadgeProps = {
  /** The status word. Always a word; colour is never the only signal. */
  label: string;
  tone?: BadgeTone;
  /**
   * Override the tone's default symbol. Defaults: neutral a small circle,
   * good a sage dot, attention an hourglass, danger an alert. `null` for word
   * only, which is for non-status labels (a count, a role), never a status.
   */
  icon?: IconName | null;
  /** Lines the label may wrap to; default 2. */
  numberOfLines?: number;
  style?: ViewStyle;
};

const DEFAULT_ICON: Record<BadgeTone, IconName | 'dot' | null> = {
  neutral: 'circle',
  good: 'dot',
  attention: 'waiting',
  danger: 'alert',
};

export function Badge({ label, tone = 'neutral', icon, numberOfLines = 2, style }: BadgeProps) {
  const t = useTheme();
  const { c } = t;
  const lit = useLit();

  let bg: string;
  let fg: ColorName;
  let fgRaw: string | undefined;
  switch (tone) {
    case 'good':
      bg = c.sageSoft;
      fg = 'sageText';
      break;
    case 'attention':
      bg = lit ? c.onInk : c.ink;
      fg = lit ? 'ink' : 'onInk';
      break;
    case 'danger':
      bg = c.dangerBg;
      fg = 'dangerText';
      break;
    default:
      bg = lit ? alpha(c.onInk, 0.14) : c.neutralBg;
      fg = 'neutralText';
      fgRaw = lit ? c.onInk : undefined;
  }
  const sym = icon === undefined ? DEFAULT_ICON[tone] : icon;
  const h = Math.round(24 * t.scale);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, minHeight: h, borderRadius: numberOfLines > 1 ? Math.round(h / 2) : t.radius.pill, paddingHorizontal: t.space.sm + 2, paddingVertical: t.space.xxs, gap: t.space.xs + 1 },
        style,
      ]}
      accessible
      accessibilityLabel={label}
    >
      <LitContext.Provider value={false}>
        {sym === 'dot' && tone === 'good' && !icon ? (
          <View style={{ width: 6 * t.scale, height: 6 * t.scale, borderRadius: 4 * t.scale, backgroundColor: c.sageDot }} />
        ) : sym ? (
          // A lit neutral badge keeps the lit tint for its symbol, as its word does.
          <LitContext.Provider value={!!fgRaw}>
            <Icon name={sym} size={sym === 'circle' ? 10 : 12} color={fg} weight="semibold" />
          </LitContext.Provider>
        ) : null}
        <Text variant="footnote" weight="600" color={fg} numberOfLines={numberOfLines} style={fgRaw ? { color: fgRaw, flexShrink: 1 } : { flexShrink: 1 }}>
          {label}
        </Text>
      </LitContext.Provider>
    </View>
  );
}

export type CountBadgeProps = {
  count: number;
  /** Shown as "9+" above this. Default 9. */
  max?: number;
  /** Spoken label; default "<count> new". */
  accessibilityLabel?: string;
  style?: ViewStyle;
};

/** Sage circle with a tabular count. Renders nothing for 0. */
export function CountBadge({ count, max = 9, accessibilityLabel, style }: CountBadgeProps) {
  const t = useTheme();
  if (count <= 0) return null;
  const size = Math.round(20 * t.scale);
  return (
    <View
      style={[styles.count, { minWidth: size, height: size, borderRadius: size / 2, backgroundColor: t.c.sage, paddingHorizontal: 5 }, style]}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${count} new`}
    >
      <LitContext.Provider value={false}>
        <Text variant="caption" weight="700" color="onSage" tabular>
          {count > max ? `${max}+` : String(count)}
        </Text>
      </LitContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
  count: { alignItems: 'center', justifyContent: 'center' },
});
