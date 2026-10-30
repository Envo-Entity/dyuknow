import { Pressable, View, type ViewStyle } from 'react-native';

import type { ColorName, TypeName } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';
import { alpha, LitContext, useLit } from './tone';

/* ------------------------------------------------------------------ TextLink */

export type TextLinkProps = {
  label: string;
  onPress: () => void;
  /** Type style; default 'callout'. */
  variant?: TypeName;
  /** Default 'text'. */
  color?: ColorName;
  /** Danger colour (Request deletion, Remove). */
  destructive?: boolean;
  /** Underlined (default true), so it reads as tappable without an accent colour. */
  underline?: boolean;
  disabled?: boolean;
  /** Centre it in its row (default: starts at the leading edge). */
  center?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

/** An inline text button ("Keep my account", "Use a different email"). Its hit area reaches 44pt. */
export function TextLink({
  label,
  onPress,
  variant = 'callout',
  color = 'text',
  destructive,
  underline = true,
  disabled,
  center,
  accessibilityLabel,
  accessibilityHint,
  style,
}: TextLinkProps) {
  const t = useTheme();
  const line = Number(t.text(variant).lineHeight ?? 20);
  const v = Math.max(0, Math.ceil((t.hit - line) / 2));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: v, bottom: v, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{ alignSelf: center ? 'center' : 'flex-start', opacity: disabled ? 0.42 : pressed ? 0.55 : 1 }, style]}
    >
      <Text
        variant={variant}
        weight="600"
        color={destructive ? 'danger' : color}
        style={underline ? { textDecorationLine: 'underline' } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ IconButton */

export type IconButtonVariant = 'plain' | 'filled' | 'ink';

export type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  /** Required: what the button does ("Close", "Remove Poppy"). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** plain: no fill · filled (default): soft grey disc · ink: the ink disc (send). */
  variant?: IconButtonVariant;
  /** Disc diameter in points before scale; default 32. The hit area is always 44pt or more. */
  size?: number;
  /** Symbol size; default ~45% of `size`. */
  iconSize?: number;
  /** Symbol colour for plain/filled; default 'muted'. */
  color?: ColorName;
  disabled?: boolean;
  style?: ViewStyle;
};

/** A round, icon-only control for universally known actions (close, remove, send). */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'filled',
  size = 32,
  iconSize,
  color = 'muted',
  disabled,
  style,
}: IconButtonProps) {
  const t = useTheme();
  const lit = useLit();
  const d = Math.round(size * t.scale);
  const slop = Math.max(0, Math.ceil((t.hit - d) / 2));
  const ink = variant === 'ink';
  const fill = lit ? alpha(t.c.onInk, 0.16) : t.c.fill;
  const pressedFill = lit ? alpha(t.c.onInk, 0.26) : t.c.borderStrong;
  const inkBg = lit ? t.c.onInk : t.c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ink ? inkBg : variant === 'filled' ? (pressed ? pressedFill : fill) : pressed ? fill : 'transparent',
          opacity: disabled ? 0.42 : ink && pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {ink ? (
        <LitContext.Provider value={false}>
          <View>
            <Icon name={icon} size={iconSize ?? Math.round(size * 0.45)} color={lit ? 'ink' : 'onInk'} weight="bold" />
          </View>
        </LitContext.Provider>
      ) : (
        <Icon name={icon} size={iconSize ?? Math.round(size * 0.42)} color={color} weight="bold" />
      )}
    </Pressable>
  );
}
