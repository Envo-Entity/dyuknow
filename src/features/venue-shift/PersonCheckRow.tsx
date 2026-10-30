import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { haptics, Icon, Photo, Text } from '@/ui';

export type PersonCheckRowProps = {
  name: string;
  photo: string;
  subtitle?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  /** Spoken label; default "Choose {name}". */
  accessibilityLabel?: string;
};

/**
 * Kit candidate: a CheckRow with the person's photo (the kit's CheckRow has
 * no leading photo). Same metrics as CheckRow, inside a Section.
 */
export function PersonCheckRow({ name, photo, subtitle, checked, onToggle, disabled, accessibilityLabel }: PersonCheckRowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onToggle(!checked);
      }}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? `Choose ${name}`}
      accessibilityHint={subtitle}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: t.hit + 12,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.sm + 2,
          gap: t.space.md,
          backgroundColor: pressed ? t.c.fill : 'transparent',
        },
      ]}
    >
      <Icon name={checked ? 'checkCircle' : 'circle'} size={22} color={disabled ? 'faint' : checked ? 'ink' : 'faint'} />
      <View style={{ opacity: disabled ? 0.5 : 1 }}>
        <Photo circle size={Math.round(40 * Math.min(t.scale, 1.1))} uri={photo} name={name} accessibilityLabel="" />
      </View>
      <View style={styles.main}>
        <Text variant="body" color={disabled ? 'faint' : 'text'} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minWidth: 0, gap: 1 },
});
