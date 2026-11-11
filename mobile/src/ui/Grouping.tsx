import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { space as spaceTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { TextLink } from './Controls';
import { Icon } from './Icon';
import { Text } from './Text';

type SpaceName = keyof typeof spaceTokens;

/* ------------------------------------------------------------------ GroupHeading */

export type GroupHeadingProps = {
  /** "Needs you", "Upcoming", "Open job posts". Sentence case, never uppercase. */
  title: string;
  /** Optional count shown after the title in muted tabular figures. */
  count?: number;
  /** Optional trailing link ("See all"). */
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

/**
 * The one heading for a group of tickets on a screen: serif title3 plus an
 * optional count. (Form groups keep `Section label`.)
 */
export function GroupHeading({ title, count, action, style }: GroupHeadingProps) {
  const t = useTheme();
  return (
    <View style={[styles.row, { gap: t.space.sm, marginBottom: -t.space.xs }, style]}>
      <View
        style={[styles.row, { flex: 1, gap: t.space.sm, alignItems: 'baseline' }]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={count != null ? `${title}, ${count}` : title}
      >
        <Text variant="title3" style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {count != null ? (
          <Text variant="callout" color="muted" tabular>
            {String(count)}
          </Text>
        ) : null}
      </View>
      {action ? <TextLink label={action.label} onPress={action.onPress} variant="subhead" color="muted" /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Disclosure */

export type DisclosureProps = {
  /** "Past and closed". With `count` it reads "Past and closed (4)". */
  title: string;
  count?: number;
  /** Controlled open state; omit to let it manage itself. */
  expanded?: boolean;
  /** Uncontrolled starting state; default closed. */
  defaultExpanded?: boolean;
  onToggle?: (next: boolean) => void;
  children: ReactNode;
  /** Gap between the revealed children; default 'md'. */
  gap?: SpaceName;
  style?: ViewStyle;
};

/** A collapsible group: a heading row with a turning chevron, then its children when open. */
export function Disclosure({ title, count, expanded, defaultExpanded = false, onToggle, children, gap = 'md', style }: DisclosureProps) {
  const t = useTheme();
  const [own, setOwn] = useState(defaultExpanded);
  const open = expanded ?? own;
  const turn = useSharedValue(open ? 1 : 0);
  const rm = t.reduceMotion;
  useEffect(() => {
    turn.value = rm ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: t.motion.fast });
  }, [open, rm, turn, t.motion.fast]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 90}deg` }] }));
  const label = count != null ? `${title} (${count})` : title;

  return (
    <View style={[{ gap: t.space[gap] }, style]}>
      <Pressable
        onPress={() => {
          const next = !open;
          if (expanded === undefined) setOwn(next);
          onToggle?.(next);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, { minHeight: t.hit, gap: t.space.sm, opacity: pressed ? 0.6 : 1 }]}
      >
        <Text variant="title3" color="muted" tabular style={{ flex: 1 }}>
          {label}
        </Text>
        <Animated.View style={chevron}>
          <Icon name="forward" size={13} color="faint" weight="semibold" />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(rm ? t.motion.fast : t.motion.normal)} style={{ gap: t.space[gap] }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
