import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { Button, type ButtonProps } from './Button';
import { Text } from './Text';

const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type StickyActionProps = {
  /** The one primary action. Variant is forced to primary, size large, full width. */
  primary: Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;
  /** Optional secondary action shown beside it. */
  secondary?: Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;
  /** One short line above the buttons ("3 days · £540"). */
  note?: string;
  /** Add the bottom safe-area inset (default true). Set false inside a tab screen. */
  safeArea?: boolean;
  style?: ViewStyle;
};

/**
 * Bottom action bar. Pass it to `<Screen footer>` / `<SheetScreen footer>` so
 * it pins above the safe area and the scroll content clears it.
 */
export function StickyAction({ primary, secondary, note, safeArea = true, style }: StickyActionProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: (safeArea ? insets.bottom : 0) + t.space.md, gap: t.space.sm }}>
      {note ? (
        <Text variant="footnote" color="muted" center tabular numberOfLines={1}>
          {note}
        </Text>
      ) : null}
      <View style={[styles.buttons, { gap: t.space.sm }]}>
        {secondary ? <Button {...secondary} variant="secondary" size="large" style={{ flex: 1 }} fullWidth /> : null}
        <Button {...primary} variant="primary" size="large" fullWidth style={{ flex: secondary ? 1.6 : 1 }} />
      </View>
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
