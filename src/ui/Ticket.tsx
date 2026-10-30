import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/useTheme';

import { alpha, LitContext } from './tone';

export type TicketProps = {
  children: ReactNode;
  /** Ink ticket under the lamp: waiting on you. Children Text/Icon/Badge/Button adapt. */
  lit?: boolean;
  /** Done and settled: flat on the shelf, no shadow. */
  spiked?: boolean;
  onPress?: () => void;
  /** Padding inside; default theme.space.lg (16). Pass 0 for edge-to-edge content. */
  padding?: number;
  gap?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
};

export function Ticket({ children, lit = false, spiked, onPress, padding, gap, accessibilityLabel, accessibilityHint, style, testID }: TicketProps) {
  const t = useTheme();
  const { c } = t;
  const litP = useSharedValue(lit ? 1 : 0);
  const pressed = useSharedValue(0);
  const rm = t.reduceMotion;

  useEffect(() => {
    litP.value = withTiming(lit ? 1 : 0, { duration: t.motion.slow });
  }, [lit, litP, t.motion.slow]);

  const card = c.card;
  const ink = c.ink;
  const border = c.border;
  const anim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(litP.value, [0, 1], [card, ink]),
    borderColor: interpolateColor(litP.value, [0, 1], [border, ink]),
    transform: [{ scale: rm ? 1 : 1 - pressed.value * 0.015 }],
    opacity: rm ? 1 - pressed.value * 0.15 : 1,
  }));

  const shadow =
    spiked || t.scheme === 'dark'
      ? undefined
      : [{ offsetX: 0, offsetY: lit ? 8 : 3, blurRadius: lit ? 24 : 12, color: alpha(c.shadow, lit ? 0.18 : 0.06) }];

  const body = (
    <Animated.View
      style={[
        styles.ticket,
        {
          borderRadius: t.radius.card,
          padding: padding ?? t.space.lg,
          gap: gap ?? t.space.sm,
          boxShadow: shadow,
        },
        anim,
        style,
      ]}
    >
      <LitContext.Provider value={lit}>{children}</LitContext.Provider>
    </Animated.View>
  );

  if (!onPress) {
    return (
      <Animated.View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} testID={testID}>
        {body}
      </Animated.View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, t.motion.spring);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, t.motion.spring);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ticket: { borderWidth: StyleSheet.hairlineWidth, overflow: 'visible' },
});
