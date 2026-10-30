import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { ColorName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

/* ------------------------------------------------------------------ Loading */

export type LoadingProps = {
  /** Number of skeleton tickets. Default 3. */
  count?: number;
  /** 'ticket' cards (default) or flat 'rows' inside one group. */
  variant?: 'ticket' | 'rows';
  style?: ViewStyle;
};

function Bar({ w, h = 12 }: { w: `${number}%` | number; h?: number }) {
  const t = useTheme();
  return <View style={{ width: w, height: Math.round(h * t.scale), borderRadius: 6, backgroundColor: t.c.fill }} />;
}

export function Loading({ count = 3, variant = 'ticket', style }: LoadingProps) {
  const t = useTheme();
  const pulse = useSharedValue(1);
  const rm = t.reduceMotion;
  useEffect(() => {
    if (rm) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [rm, pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <Animated.View style={[{ gap: t.space.md }, anim, style]} accessible accessibilityRole="progressbar" accessibilityLabel="Loading">
      {variant === 'rows' ? (
        <View style={{ backgroundColor: t.c.card, borderRadius: t.radius.lg, overflow: 'hidden' }}>
          {items.map((i) => (
            <View key={i} style={[styles.row, { padding: t.space.lg, gap: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: t.c.border }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.c.fill }} />
              <View style={{ flex: 1, gap: t.space.sm }}>
                <Bar w="55%" h={13} />
                <Bar w="35%" h={11} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        items.map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: t.c.card,
              borderRadius: t.radius.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.c.border,
              padding: t.space.lg,
              gap: t.space.md,
            }}
          >
            <View style={[styles.row, { gap: t.space.md }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.c.fill }} />
              <View style={{ flex: 1, gap: t.space.sm }}>
                <Bar w="60%" h={15} />
                <Bar w="40%" h={11} />
              </View>
            </View>
            <Bar w="85%" />
            <Bar w="30%" h={22} />
          </View>
        ))
      )}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ Empty */

export type EmptyProps = {
  title: string;
  /** One sentence. */
  message?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

export function Empty({ title, message, icon, action, style }: EmptyProps) {
  const t = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: t.space.huge, paddingHorizontal: t.space.xxl, gap: t.space.sm }, style]}>
      {icon ? (
        <View style={{ width: 56 * t.scale, height: 56 * t.scale, borderRadius: 28 * t.scale, backgroundColor: t.c.fill, alignItems: 'center', justifyContent: 'center', marginBottom: t.space.sm }}>
          <Icon name={icon} size={24} color="muted" />
        </View>
      ) : null}
      <Text variant="title2" center accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="muted" center style={{ maxWidth: 320 }}>
          {message}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={{ alignSelf: 'center', marginTop: t.space.md }} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ ErrorState */

export type ErrorStateProps = {
  /** Optional bold line above the message. */
  title?: string;
  /** One line. Default "Couldn't load this." */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Show the retry spinner. */
  retrying?: boolean;
  style?: ViewStyle;
};

export function ErrorState({ title, message = "Couldn't load this.", onRetry, retryLabel = 'Try again', retrying, style }: ErrorStateProps) {
  const t = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: t.space.xxxl, paddingHorizontal: t.space.xxl, gap: t.space.md }, style]} accessibilityLiveRegion="polite">
      {title ? (
        <Text variant="headline" center accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={[styles.row, { gap: t.space.sm }]}>
        <Icon name="alert" size={17} color="dangerText" />
        <Text variant="callout" color="text" center>
          {message}
        </Text>
      </View>
      {onRetry ? <Button label={retryLabel} variant="secondary" icon="refresh" loading={retrying} onPress={onRetry} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Notice */

export type NoticeTone = 'info' | 'good' | 'warning' | 'danger';

export type NoticeProps = {
  text: string;
  tone?: NoticeTone;
  icon?: IconName;
  style?: ViewStyle;
};

const NOTICE: Record<NoticeTone, { bg: ColorName; fg: ColorName; icon: IconName }> = {
  info: { bg: 'neutralBg', fg: 'neutralText', icon: 'info' },
  good: { bg: 'sageSoft', fg: 'sageText', icon: 'checkCircle' },
  warning: { bg: 'fill', fg: 'text', icon: 'warning' },
  danger: { bg: 'dangerBg', fg: 'dangerText', icon: 'alert' },
};

/** Inline one-line callout. */
export function Notice({ text, tone = 'info', icon, style }: NoticeProps) {
  const t = useTheme();
  const s = NOTICE[tone];
  return (
    <View
      style={[styles.row, { backgroundColor: t.c[s.bg], borderRadius: t.radius.md, paddingHorizontal: t.space.md, paddingVertical: t.space.sm + 2, gap: t.space.sm }, style]}
      accessible
      accessibilityLabel={text}
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : 'text'}
    >
      <Icon name={icon ?? s.icon} size={16} color={s.fg} />
      <Text variant="subhead" color={s.fg} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ WaitingForApproval */

export function WaitingForApproval({ action, style }: { action?: EmptyProps['action']; style?: ViewStyle }) {
  return (
    <Empty
      icon="waiting"
      title="Waiting for approval"
      message="Dyuknow is checking your profile. We'll let you know here when you're approved."
      action={action}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
