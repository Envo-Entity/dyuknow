import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { Button, type ButtonProps } from './Button';
import { useFooterInsetHandled, useKeyboardOverlap } from './KeyboardFooter';
import { Text } from './Text';

const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

type ActionProps = Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;

export type StickyActionProps = {
  /** The one primary action: large, full width. `variant: 'danger'` for a destructive one (Cancel days). */
  primary: ActionProps & { variant?: 'primary' | 'danger' };
  /** Optional secondary action shown beside it. */
  secondary?: ActionProps;
  /** Optional quiet action under the buttons ("Mark as a no-show"). */
  tertiary?: ActionProps;
  /** A short note above the buttons ("3 days · £540"); wraps up to 3 lines. */
  note?: string;
  /**
   * Add the bottom safe-area inset. Default: yes, except inside
   * `<Screen insideTabs>` (the tab bar already clears it).
   */
  safeArea?: boolean;
  style?: ViewStyle;
};

/**
 * Bottom action bar. Pass it to `<Screen footer>` / `<SheetScreen footer>` so
 * it pins above the safe area (and the keyboard) and the scroll content clears it.
 */
export function StickyAction({ primary, secondary, tertiary, note, safeArea, style }: StickyActionProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const handled = useFooterInsetHandled();
  const bottomInset = (safeArea ?? !handled) ? insets.bottom : 0;
  // The inset may hide behind the keyboard; the buttons sit right on it.
  useKeyboardOverlap(bottomInset);
  const { variant: primaryVariant = 'primary', ...primaryRest } = primary;

  const content = (
    <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: bottomInset + (tertiary ? t.space.xs : t.space.md), gap: t.space.sm }}>
      {note ? (
        <Text variant="footnote" color="muted" center tabular numberOfLines={3}>
          {note}
        </Text>
      ) : null}
      <View style={[styles.buttons, { gap: t.space.sm }]}>
        {secondary ? <Button {...secondary} variant="secondary" size="large" style={{ flex: 1 }} fullWidth /> : null}
        <Button {...primaryRest} variant={primaryVariant} size="large" fullWidth style={{ flex: secondary ? 1.6 : 1 }} />
      </View>
      {tertiary ? <Button {...tertiary} variant="quiet" style={{ alignSelf: 'center' }} /> : null}
    </View>
  );

  if (GLASS) {
    return (
      <View style={style}>
        <GlassView glassEffectStyle="regular" colorScheme={t.scheme} style={StyleSheet.absoluteFill} />
        {content}
      </View>
    );
  }
  return (
    <View style={[{ backgroundColor: t.c.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.c.border }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', alignItems: 'center' },
});
