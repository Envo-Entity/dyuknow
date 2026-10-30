import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { Button } from './Button';
import { select as tick } from './haptics';
import { Icon } from './Icon';
import { Separator } from './Section';
import { Text } from './Text';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  subtitle?: string;
  disabled?: boolean;
};

export type SelectSheetProps<T extends string = string> = {
  visible: boolean;
  title?: string;
  options: SelectOption<T>[];
  value: T | null | undefined;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** A bottom sheet of choices with a check on the current one. Closes on pick. */
export function SelectSheet<T extends string = string>({ visible, title, options, value, onSelect, onClose }: SelectSheetProps<T>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const entering = t.reduceMotion
    ? FadeIn.duration(t.motion.fast)
    : SlideInDown.springify().damping(t.motion.springSoft.damping).stiffness(t.motion.springSoft.stiffness);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.fill, { backgroundColor: t.c.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        {visible ? (
          <Animated.View
            entering={entering}
            style={{
              backgroundColor: t.c.raised,
              borderTopLeftRadius: t.radius.sheet,
              borderTopRightRadius: t.radius.sheet,
              paddingTop: t.space.sm,
              paddingBottom: insets.bottom + t.space.sm,
              maxHeight: '80%',
            }}
            accessibilityViewIsModal
          >
            <View style={[styles.grabber, { backgroundColor: t.c.borderStrong }]} />
            {title ? (
              <Text variant="title3" accessibilityRole="header" style={{ paddingHorizontal: t.space.xl, paddingVertical: t.space.md }}>
                {title}
              </Text>
            ) : null}
            <ScrollView bounces={false} style={{ flexGrow: 0 }}>
              {options.map((o, i) => {
                const on = o.value === value;
                return (
                  <View key={o.value}>
                    {i > 0 ? <Separator inset={t.space.xl} /> : null}
                    <Pressable
                      disabled={o.disabled}
                      onPress={() => {
                        tick();
                        onSelect(o.value);
                        onClose();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: !!o.disabled }}
                      accessibilityLabel={[o.label, o.subtitle].filter(Boolean).join(', ')}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          minHeight: t.hit + 6,
                          paddingHorizontal: t.space.xl,
                          paddingVertical: t.space.sm + 2,
                          backgroundColor: pressed ? t.c.fill : 'transparent',
                          opacity: o.disabled ? 0.42 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight={on ? '600' : '400'} numberOfLines={1}>
                          {o.label}
                        </Text>
                        {o.subtitle ? (
                          <Text variant="subhead" color="muted" numberOfLines={1}>
                            {o.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {on ? <Icon name="check" size={17} weight="semibold" /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md }}>
              <Button label="Cancel" variant="secondary" fullWidth onPress={onClose} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
