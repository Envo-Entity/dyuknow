// Kit candidate: a Section row whose second line can wrap and uses tabular
// numerals (a day's "6 hours · about £108", an address, a note). The kit's
// Row keeps its subtitle to one proportional line.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon, Text } from '@/ui';

export type DetailRowProps = {
  title: string;
  detail?: string;
  /** Tabular numerals on the detail line (times, hours, money). */
  tabular?: boolean;
  /** Small muted title over a value in body type (Address, Note). */
  labelled?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function DetailRow({ title, detail, tabular, labelled, trailing, onPress, accessibilityLabel, accessibilityHint }: DetailRowProps) {
  const t = useTheme();
  const spoken = accessibilityLabel ?? [title, detail].filter(Boolean).join(', ');
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        {
          minHeight: t.hit,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.sm + 3,
          gap: t.space.md,
          backgroundColor: pressed ? t.c.fill : 'transparent',
        },
      ]}
    >
      <View style={styles.main}>
        {labelled ? (
          <>
            <Text variant="subhead" color="muted">
              {title}
            </Text>
            {detail ? (
              <Text variant="body" tabular={tabular}>
                {detail}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="body" tabular>
              {title}
            </Text>
            {detail ? (
              <Text variant="subhead" color="muted" tabular={tabular}>
                {detail}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {trailing}
      {onPress ? <Icon name="forward" size={13} color="faint" weight="semibold" /> : null}
    </View>
  );
  if (!onPress)
    return (
      <View accessible accessibilityLabel={spoken}>
        {content(false)}
      </View>
    );
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={spoken} accessibilityHint={accessibilityHint}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
});
