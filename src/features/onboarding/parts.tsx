// Small onboarding parts the kit doesn't have yet (kit candidates): a round
// icon button, the step footer with its reason underneath, a stacked text
// field for long labels, chip sections and the "add your own" row.
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions, type TextInputInstance, type TextInputProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button, Chip, ChipGroup, Icon, Section, Text, TextRow, haptics, type ButtonProps, type IconName } from '@/ui';

const GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/* ------------------------------------------------------------------ RoundButton */

export function RoundButton({ icon, label, onPress, hidden }: { icon: IconName; label: string; onPress: () => void; hidden?: boolean }) {
  const t = useTheme();
  const size = Math.round(40 * t.scale);
  return (
    <Pressable
      onPress={onPress}
      disabled={hidden}
      hitSlop={(t.hit - size) / 2 + 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={({ pressed }) => ({
        width: t.hit,
        height: t.hit,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: hidden ? 0 : 1,
        transform: [{ scale: pressed && !t.reduceMotion ? 0.94 : 1 }],
      })}
    >
      {({ pressed }) => (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.c.borderStrong : t.c.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: t.c.border,
          }}
        >
          <Icon name={icon} size={16} weight="semibold" />
        </View>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ StepFooter */

export type StepAction = Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;

/** StickyAction's look, with room for a reason of any length under the button. */
export function StepFooter({ primary, reason }: { primary: StepAction; reason?: string | null }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: insets.bottom + t.space.md, gap: t.space.sm }}>
      <Button {...primary} variant="primary" size="large" fullWidth accessibilityHint={reason ?? primary.accessibilityHint} />
      {reason ? (
        <Animated.View entering={FadeIn.duration(t.motion.fast)} exiting={FadeOut.duration(t.motion.fast)}>
          <Text variant="footnote" color="muted" center accessibilityLiveRegion="polite">
            {reason}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
  if (GLASS) {
    return (
      <View>
        <GlassView glassEffectStyle="regular" colorScheme={t.scheme} style={StyleSheet.absoluteFill} />
        {content}
      </View>
    );
  }
  return <View style={{ backgroundColor: t.c.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.c.border }}>{content}</View>;
}

/* ------------------------------------------------------------------ Field */

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  /** Shown before the value ("£"). */
  prefix?: string;
  editable?: boolean;
};

/**
 * A form row inside a Section. Short labels sit inline (the kit's TextRow);
 * long ones sit above the input so they never truncate.
 */
export function Field({ label, value, onChangeText, prefix, ...rest }: FieldProps) {
  const t = useTheme();
  const ref = useRef<TextInputInstance>(null);
  const stacked = label.length > 16 || !!prefix;
  if (!stacked) return <TextRow label={label} value={value} onChangeText={onChangeText} returnKeyType="done" {...rest} />;
  const font = t.text('body');
  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      accessible={false}
      style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm + 2, paddingBottom: t.space.sm + 2, gap: t.space.xxs, minHeight: t.hit + 4 }}
    >
      <Text variant="subhead" color="muted">
        {label}
      </Text>
      <View style={styles.inputRow}>
        {prefix ? (
          <Text variant="body" color={value ? 'text' : 'faint'} style={{ marginRight: t.space.xxs }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={t.c.faint}
          selectionColor={t.c.focus}
          accessibilityLabel={label}
          returnKeyType="done"
          {...rest}
          editable={rest.editable ?? true}
          style={[font, { fontFamily: fonts.sans, color: rest.editable === false ? t.c.muted : t.c.text, paddingVertical: 0, flex: 1 }]}
        />
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ ChipField */

/** A labelled group of chips on a card. Single choice keeps one value; multiple toggles. */
export function ChipField(
  props: { label: string; footer?: string; options: readonly string[] } & (
    | { multiple: true; value: string[]; onChange: (v: string[]) => void; max?: number }
    | { multiple?: false; value: string; onChange: (v: string) => void }
  ),
) {
  const t = useTheme();
  const options = props.options.map((o) => ({ value: o, label: o }));
  return (
    <Section label={props.label} footer={props.footer}>
      <View style={{ padding: t.space.lg }}>
        {props.multiple ? (
          <ChipGroup multiple options={options} value={props.value} onChange={props.onChange} max={props.max} accessibilityLabel={props.label} />
        ) : (
          <ChipGroup
            options={options}
            value={props.value || null}
            onChange={(v) => v && props.onChange(v)}
            allowDeselect={false}
            accessibilityLabel={props.label}
          />
        )}
      </View>
    </Section>
  );
}

/* ------------------------------------------------------------------ AddRow */

/** "Add your own": a text input and an Add button, as one row of a Section. */
export function AddRow({
  label,
  onAdd,
  maxLength,
  disabled,
}: {
  label: string;
  onAdd: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) {
  const t = useTheme();
  const [text, setText] = useState('');
  const commit = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText('');
  };
  return (
    <View style={[styles.inputRow, { paddingLeft: t.space.lg, paddingRight: t.space.sm, minHeight: t.hit + 4, gap: t.space.sm, opacity: disabled ? 0.42 : 1 }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Add your own"
        placeholderTextColor={t.c.faint}
        selectionColor={t.c.focus}
        maxLength={maxLength}
        editable={!disabled}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={commit}
        accessibilityLabel={label}
        style={[t.text('body'), { fontFamily: fonts.sans, color: t.c.text, flex: 1, paddingVertical: t.space.sm }]}
      />
      <Button label="Add" variant="quiet" icon="add" onPress={commit} disabled={disabled || !text.trim()} accessibilityLabel={label} />
    </View>
  );
}

/** Chips for values the person added themselves: each is selected; tapping one removes it. */
export function CustomChips({ values, onRemove }: { values: string[]; onRemove: (v: string) => void }) {
  const t = useTheme();
  if (!values.length) return null;
  return (
    <View style={[styles.wrap, { padding: t.space.lg, gap: t.space.sm }]}>
      {values.map((v) => (
        <Chip
          key={v}
          label={v}
          selected
          icon="close"
          accessibilityLabel={`Remove ${v}`}
          onPress={() => {
            haptics.select();
            onRemove(v);
          }}
        />
      ))}
    </View>
  );
}

/** A plain heading for a group of Sections ("Recent employers"). */
export function GroupHeading({ title, tag, children }: { title: string; tag?: ReactNode; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.xs, paddingHorizontal: t.space.xs }}>
      <View style={[styles.inputRow, { gap: t.space.sm }]}>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
        {tag}
      </View>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ files */

/**
 * Copies a picked file out of the cache into the app's documents, so a draft
 * left for days still has its photo and documents. Falls back to the original.
 */
export function keepFile(uri: string, ext: string): string {
  try {
    const dir = new Directory(Paths.document, 'join');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${randomUUID()}.${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
