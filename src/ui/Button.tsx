import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import type { ColorName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';
import { alpha, LitContext, useLit } from './tone';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'regular' | 'large';
  icon?: IconName;
  loading?: boolean;
  /** When set, the label morphs into a check + this word ("Booked"). The button stops taking presses. */
  done?: string | false | null;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  loading,
  done,
  disabled,
  fullWidth,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const { c } = t;
  const lit = useLit();
  const isDone = !!done;
  const pressed = useSharedValue(0);
  const doneP = useSharedValue(isDone ? 1 : 0);

  useEffect(() => {
    doneP.value = withTiming(isDone ? 1 : 0, { duration: t.motion.normal });
  }, [isDone, doneP, t.motion.normal]);

  // Colours per variant; a lit parent inverts ink.
  const ink = lit ? c.onInk : c.ink;
  const onInk = lit ? c.ink : c.onInk;
  let bg = 'transparent';
  let fg: string = lit ? c.onInk : c.text;
  let fgName: ColorName = 'text';
  let border: string | undefined;
  if (variant === 'primary') {
    bg = ink;
    fg = onInk;
    fgName = lit ? 'ink' : 'onInk';
  } else if (variant === 'secondary') {
    border = lit ? alpha(c.onInk, 0.4) : c.borderStrong;
  } else if (variant === 'danger') {
    bg = c.dangerBg;
    fg = c.dangerText;
    fgName = 'dangerText';
  }
  const doneBg = c.sageSoft;
  const rm = t.reduceMotion;
  const quiet = variant === 'quiet';

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: rm ? 1 : 1 - pressed.value * 0.03 }],
    opacity: rm || quiet ? 1 - pressed.value * 0.3 : 1,
    backgroundColor: quiet ? 'transparent' : interpolateColor(doneP.value, [0, 1], [bg, doneBg]),
    borderColor: border ? interpolateColor(doneP.value, [0, 1], [border, doneBg]) : 'transparent',
  }));

  const large = size === 'large';
  const minHeight = large ? Math.round(t.hit + 8 * t.scale) : t.hit;
  const inactive = disabled || loading || isDone;
  const entering = t.reduceMotion ? FadeIn.duration(t.motion.fast) : ZoomIn.springify().damping(t.motion.spring.damping).stiffness(t.motion.spring.stiffness);
  const exiting = FadeOut.duration(t.motion.fast);
  const textVariant = large ? 'headline' : 'callout';

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      onPressIn={() => {
        if (!inactive) pressed.value = withSpring(1, t.motion.spring);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, t.motion.spring);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={isDone ? `${done}` : (accessibilityLabel ?? label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      hitSlop={minHeight < 44 ? (44 - minHeight) / 2 : undefined}
      testID={testID}
      style={[fullWidth ? styles.full : styles.auto, { opacity: disabled ? 0.42 : 1 }, style]}
    >
      <Animated.View
        layout={t.reduceMotion ? undefined : LinearTransition.springify().damping(t.motion.springSoft.damping).stiffness(t.motion.springSoft.stiffness)}
        style={[
          styles.body,
          {
            minHeight,
            paddingHorizontal: variant === 'quiet' ? t.space.sm : large ? t.space.xxl : t.space.xl,
            borderRadius: t.radius.pill,
            borderWidth: border ? 1 : 0,
          },
          animated,
        ]}
      >
        <LitContext.Provider value={false}>
          {isDone ? (
            <Animated.View key="done" entering={entering} exiting={exiting} style={[styles.inner, { gap: t.space.xs }]}>
              <Icon name="check" size={large ? 17 : 15} color="sageText" weight="semibold" />
              <Text variant={textVariant} weight="600" color="sageText" numberOfLines={1}>
                {done}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View key="label" entering={FadeIn.duration(t.motion.fast)} exiting={exiting} style={[styles.inner, { gap: t.space.sm }]}>
              {icon ? <Icon name={icon} size={large ? 18 : 16} color={fgName} weight="semibold" style={{ opacity: loading ? 0 : 1 }} /> : null}
              <Text
                variant={textVariant}
                weight="600"
                color={fgName}
                numberOfLines={1}
                style={{ color: fg, opacity: loading ? 0 : 1 }}
              >
                {label}
              </Text>
              {loading ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <View style={styles.center}>
                    <ActivityIndicator color={fg} />
                  </View>
                </View>
              ) : null}
            </Animated.View>
          )}
        </LitContext.Provider>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  body: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
