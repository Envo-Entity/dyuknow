// Small onboarding parts the kit doesn't have (kit candidates): chip
// sections, the "add your own" row and the custom chips; plus the copies of
// picked files that a draft keeps on the device.
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button, Chip, ChipGroup, Section, haptics, type ButtonProps } from '@/ui';

/** What the step footer's one button does (StickyAction's primary). */
export type StepAction = Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;

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

/* ------------------------------------------------------------------ files */

/**
 * Copies a picked file out of the cache into the app's documents, so a draft
 * left for days still has its photo and documents. Falls back to the original.
 */
const keptDir = () => new Directory(Paths.document, 'join');

export function keepFile(uri: string, ext: string): string {
  try {
    const dir = keptDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${randomUUID()}.${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/**
 * Deletes every file `keepFile` copied (after a successful submit, and on log
 * out from "Who are you?"): the drafts that pointed at them are gone too.
 */
export function clearKeptFiles() {
  try {
    const dir = keptDir();
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to clean up.
  }
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
