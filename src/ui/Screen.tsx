import { useState, type ReactNode } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView as ScreensSafeAreaView } from 'react-native-screens/experimental';

import { gutter, type space as spaceTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { KeyboardFooter, KeyboardSpacer } from './KeyboardFooter';
import { Text } from './Text';

type SpaceName = keyof typeof spaceTokens;

export type ScreenProps = {
  children: ReactNode;
  /**
   * The serif page title, drawn as the first thing in the content (largeTitle,
   * header role). Use on tab roots, where native large titles are off.
   */
  title?: string;
  /** One muted line under `title`. */
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Gap between direct children; default 'xl' (20). */
  gap?: SpaceName;
  /** 16pt side gutter (default true). The title keeps the gutter either way. */
  padded?: boolean;
  /**
   * Pinned bottom bar, typically `<StickyAction>`. Content scrolls clear of it,
   * and it rises above the keyboard on both platforms.
   */
  footer?: ReactNode;
  /**
   * A tab root: the footer sits above the floating tab bar (and StickyAction
   * then skips its own bottom inset).
   */
  insideTabs?: boolean;
  /** Set false for a non-scrolling screen. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
};

function PageTitle({ title, subtitle, padded }: { title: string; subtitle?: string; padded: boolean }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.xxs, paddingHorizontal: padded ? 0 : gutter, marginBottom: -t.space.xs }}>
      <Text variant="largeTitle" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" color="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A pushed or tab screen. The ScrollView is the first child so native large
 * titles collapse (and iOS tabs inset it); the header/tab insets are automatic.
 */
export function Screen({
  children,
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  gap = 'xl',
  padded = true,
  footer,
  insideTabs = false,
  scroll = true,
  contentStyle,
  testID,
}: ScreenProps) {
  const t = useTheme();
  const [footerH, setFooterH] = useState(0);
  const [frameH, setFrameH] = useState(0);
  const inner: ViewStyle = {
    paddingHorizontal: padded ? gutter : 0,
    paddingTop: title ? t.space.sm : t.space.md,
    paddingBottom: (footer ? footerH : 0) + t.space.xxxl,
    gap: t.space[gap],
  };
  const heading = title ? <PageTitle title={title} subtitle={subtitle} padded={padded} /> : null;

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
      {heading}
      {children}
      {Platform.OS === 'android' ? <KeyboardSpacer /> : null}
    </ScrollView>
  ) : (
    <View testID={testID} style={[{ flex: 1, backgroundColor: t.c.page }, inner, contentStyle]}>
      {heading}
      {children}
    </View>
  );

  if (!footer) return body;

  // Android tabs already wrap the screen above the tab bar; iOS tabs float
  // over the content, so the footer takes the tab bar's inset itself.
  const bar = (
    <View onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} collapsable={false}>
      {footer}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.c.page }} collapsable={false}>
      {body}
      <KeyboardFooter
        style={styles.footer}
        insetHandled={insideTabs}
        // The tab bar's inset under the bar may go behind the keyboard.
        overlap={Math.max(0, frameH - footerH)}
        onLayout={(e) => setFrameH(e.nativeEvent.layout.height)}
      >
        {insideTabs && Platform.OS === 'ios' ? <ScreensSafeAreaView edges={{ bottom: true }} style={{ flex: 0 }}>{bar}</ScreensSafeAreaView> : bar}
      </KeyboardFooter>
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
  /** Bottom action area, e.g. `<StickyAction>` or a Button. Rises above the keyboard. */
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
      {/* iOS sheets stay pinned to the bottom edge, so the footer rises with the
          keyboard; Android sheets move themselves above it (react-native-screens). */}
      {footer ? Platform.OS === 'ios' ? <KeyboardFooter anchored>{footer}</KeyboardFooter> : <View>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start' },
});
