import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter, type space as spaceTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Text } from './Text';

type SpaceName = keyof typeof spaceTokens;

export type ScreenProps = {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Gap between direct children; default 'xl' (20). */
  gap?: SpaceName;
  /** 16pt side gutter (default true). */
  padded?: boolean;
  /** Pinned bottom bar, typically `<StickyAction>`. Content scrolls clear of it. */
  footer?: ReactNode;
  /** Set false for a non-scrolling screen. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
};

/**
 * A pushed or tab screen. The ScrollView is the first child so native large
 * titles collapse; the header/tab insets are automatic.
 */
export function Screen({ children, onRefresh, refreshing = false, gap = 'xl', padded = true, footer, scroll = true, contentStyle, testID }: ScreenProps) {
  const t = useTheme();
  const [footerH, setFooterH] = useState(0);
  const inner: ViewStyle = {
    paddingHorizontal: padded ? gutter : 0,
    paddingTop: t.space.md,
    paddingBottom: (footer ? footerH : 0) + t.space.xxxl,
    gap: t.space[gap],
  };

  const body = scroll ? (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: t.c.page }}
      contentContainerStyle={[inner, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.c.muted} colors={[t.c.ink]} progressBackgroundColor={t.c.card} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[{ flex: 1, backgroundColor: t.c.page }, inner, contentStyle]}>
      {children}
    </View>
  );

  if (!footer) return body;
  return (
    <View style={{ flex: 1, backgroundColor: t.c.page }} collapsable={false}>
      {body}
      <View style={styles.footer} onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}>
        {footer}
      </View>
    </View>
  );
}

export type SheetScreenProps = {
  /** Rendered inside the sheet (Android sheets have no header). Hide the native header for these routes. */
  title: string;
  subtitle?: string;
  /** Shows a close button (top right) when set. */
  onClose?: () => void;
  children: ReactNode;
  /** Bottom action area, e.g. `<StickyAction>` or a Button. */
  footer?: ReactNode;
  /** Set false for `fitToContents` sheets. */
  scroll?: boolean;
  gap?: SpaceName;
};

export function SheetScreen({ title, subtitle, onClose, children, footer, scroll = true, gap = 'lg' }: SheetScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const header = (
    <View style={[styles.sheetHeader, { paddingTop: t.space.xxl, paddingBottom: t.space.md, gap: t.space.md }]}>
      <View style={{ flex: 1, gap: t.space.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => ({
            width: Math.round(32 * t.scale),
            height: Math.round(32 * t.scale),
            borderRadius: t.radius.pill,
            backgroundColor: pressed ? t.c.borderStrong : t.c.fill,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: t.space.xs,
          })}
        >
          <Icon name="close" size={13} color="muted" weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
  const content: ViewStyle = { paddingHorizontal: gutter, paddingBottom: footer ? t.space.lg : insets.bottom + t.space.xl, gap: t.space[gap] };

  return (
    <View style={{ flex: scroll ? 1 : undefined, backgroundColor: t.c.page }} collapsable={false}>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View>
          <View style={{ paddingHorizontal: gutter }}>{header}</View>
          <View style={content}>{children}</View>
        </View>
      )}
      {footer ? <View>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start' },
});
