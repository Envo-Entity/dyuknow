import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { dateToHm, dateToYmd, formatDay, hmToDate, ymdToDate } from './dates';
import { select as tick } from './haptics';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { SelectSheet, type SelectOption } from './SelectSheet';
import { Text } from './Text';

/* ------------------------------------------------------------------ shared */

function useRowStyle() {
  const t = useTheme();
  return {
    minHeight: t.hit + 4,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm + 2,
    gap: t.space.md,
  } satisfies ViewStyle;
}

function RowLabel({ label, subtitle, color }: { label: string; subtitle?: string; color?: 'text' | 'muted' | 'faint' }) {
  return (
    <View style={styles.labelCol}>
      <Text variant="body" color={color ?? 'text'} numberOfLines={2}>
        {label}
      </Text>
      {subtitle ? (
        <Text variant="subhead" color="muted" numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function ErrorLine({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={[styles.errorLine, { gap: t.space.xs, paddingHorizontal: t.space.lg, paddingBottom: t.space.sm }]} accessibilityLiveRegion="polite">
      <Icon name="alert" size={13} color="dangerText" />
      <Text variant="footnote" color="dangerText" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ TextRow */

export type TextRowProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Multiline: label above, input below, with a counter when maxLength is set. */
  multiline?: boolean;
  maxLength?: number;
  error?: string | null;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
  /** Single line with the label above the input (long labels, emails, names). */
  stacked?: boolean;
  /** Muted text before the input ("£"). */
  prefix?: string;
  /** Muted text after the input ("/ hour"). */
  suffix?: string;
};

export function TextRow({ label, value, onChangeText, placeholder, multiline, maxLength, error, editable = true, stacked, prefix, suffix, ...input }: TextRowProps) {
  const t = useTheme();
  const row = useRowStyle();
  const ref = useRef<TextInputInstance>(null);
  const font = t.text('body');
  const inputStyle = {
    ...font,
    fontFamily: fonts.sans,
    color: t.c.text,
    paddingVertical: 0,
  };

  if (multiline) {
    return (
      <View>
        <Pressable onPress={() => ref.current?.focus()} style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, gap: t.space.xs }} accessible={false}>
          <Text variant="subhead" color="muted">
            {label}
          </Text>
          <TextInput
            ref={ref}
            {...input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={t.c.faint}
            maxLength={maxLength}
            multiline
            editable={editable}
            textAlignVertical="top"
            accessibilityLabel={label}
            accessibilityHint={error ?? undefined}
            selectionColor={t.c.focus}
            style={[inputStyle, { minHeight: Math.round(96 * t.scale), paddingBottom: t.space.sm }]}
          />
        </Pressable>
        <View style={[styles.counterRow, { paddingHorizontal: t.space.lg, paddingBottom: t.space.sm }]}>
          {maxLength ? (
            <Text variant="caption" color={value.length >= maxLength ? 'dangerText' : 'faint'} tabular>
              {`${value.length}/${maxLength}`}
            </Text>
          ) : null}
        </View>
        {error ? <ErrorLine text={error} /> : null}
      </View>
    );
  }

  const affix = (text: string | undefined) =>
    text ? (
      <Text variant="body" color="muted" tabular importantForAccessibility="no" accessibilityElementsHidden>
        {text}
      </Text>
    ) : null;
  const spoken = [prefix ? `${label}, ${prefix}` : label, suffix].filter(Boolean).join(' ');

  if (stacked) {
    return (
      <View>
        <Pressable onPress={() => ref.current?.focus()} style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm + 2, paddingBottom: t.space.sm, gap: t.space.xxs }} accessible={false}>
          <Text variant="subhead" color="muted">
            {label}
          </Text>
          <View style={[styles.row, { gap: t.space.xs }]}>
            {affix(prefix)}
            <TextInput
              ref={ref}
              {...input}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={t.c.faint}
              maxLength={maxLength}
              editable={editable}
              accessibilityLabel={spoken}
              accessibilityHint={error ?? undefined}
              selectionColor={t.c.focus}
              style={[inputStyle, { flex: 1, color: editable ? t.c.text : t.c.muted, minHeight: t.hit - 12 }]}
            />
            {affix(suffix)}
          </View>
        </Pressable>
        {error ? <ErrorLine text={error} /> : null}
      </View>
    );
  }

  return (
    <View>
      <Pressable onPress={() => ref.current?.focus()} style={[styles.row, row]} accessible={false}>
        <Text variant="body" numberOfLines={1} style={{ flexShrink: 0, maxWidth: '45%' }}>
          {label}
        </Text>
        {affix(prefix)}
        <TextInput
          ref={ref}
          {...input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.c.faint}
          maxLength={maxLength}
          editable={editable}
          accessibilityLabel={spoken}
          accessibilityHint={error ?? undefined}
          selectionColor={t.c.focus}
          style={[inputStyle, { flex: 1, textAlign: 'right', color: editable ? t.c.text : t.c.muted, minHeight: t.hit - 8 }]}
        />
        {affix(suffix)}
      </Pressable>
      {error ? <ErrorLine text={error} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ SwitchRow */

export type SwitchRowProps = {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
};

export function SwitchRow({ label, subtitle, value, onValueChange, disabled }: SwitchRowProps) {
  const t = useTheme();
  const row = useRowStyle();
  // In dark mode ink is near-white, which would swallow the white thumb; use sage there.
  const on = t.scheme === 'dark' ? t.c.sageDot : t.c.ink;
  return (
    <View style={[styles.row, row, { opacity: disabled ? 0.42 : 1 }]}>
      <RowLabel label={label} subtitle={subtitle} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: on, false: t.c.borderStrong }}
        ios_backgroundColor={t.c.borderStrong}
        thumbColor={Platform.OS === 'android' ? t.c.card : undefined}
        accessibilityLabel={label}
        accessibilityHint={subtitle}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ PickerRow */

export type PickerRowProps<T extends string = string> = {
  label: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Shown when nothing is chosen. Default "Choose". */
  placeholder?: string;
  /** Sheet title; defaults to label. */
  title?: string;
  disabled?: boolean;
  error?: string | null;
};

export function PickerRow<T extends string = string>({ label, value, options, onChange, placeholder = 'Choose', title, disabled, error }: PickerRowProps<T>) {
  const t = useTheme();
  const row = useRowStyle();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${current?.label ?? placeholder}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={({ pressed }) => [styles.row, row, { backgroundColor: pressed ? t.c.fill : 'transparent', opacity: disabled ? 0.42 : 1 }]}
      >
        <Text variant="body" numberOfLines={1} style={{ flexShrink: 0, maxWidth: '50%' }}>
          {label}
        </Text>
        <View style={[styles.trail, { gap: t.space.xs + 2 }]}>
          <Text variant="body" color={current ? 'muted' : 'faint'} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
            {current?.label ?? placeholder}
          </Text>
          <Icon name="chevronUpDown" size={12} color="faint" weight="semibold" />
        </View>
      </Pressable>
      {error ? <ErrorLine text={error} /> : null}
      <SelectSheet visible={open} title={title ?? label} options={options} value={value} onSelect={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}

/* ------------------------------------------------------------------ Time / Date */

type PickerShellProps = {
  label: string;
  display: string | null;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  error?: string | null;
  tabular?: boolean;
  children: ReactNode;
};

function PickerShell({ label, display, placeholder, open, onToggle, disabled, error, tabular, children }: PickerShellProps) {
  const t = useTheme();
  const row = useRowStyle();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display ?? placeholder}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={({ pressed }) => [styles.row, row, { backgroundColor: pressed ? t.c.fill : 'transparent', opacity: disabled ? 0.42 : 1 }]}
      >
        <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        <View
          style={{
            backgroundColor: open ? t.c.ink : t.c.fill,
            borderRadius: t.radius.sm - 2,
            paddingHorizontal: t.space.sm + 2,
            paddingVertical: t.space.xs + 1,
          }}
        >
          <Text variant="body" tabular={tabular} color={open ? 'onInk' : display ? 'text' : 'faint'}>
            {display ?? placeholder}
          </Text>
        </View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(t.motion.normal)} style={{ alignItems: 'center', paddingBottom: t.space.sm }}>
          {children}
        </Animated.View>
      ) : null}
      {error ? <ErrorLine text={error} /> : null}
    </View>
  );
}

export type TimeRowProps = {
  label: string;
  /** 'HH:MM' or null. */
  value: string | null | undefined;
  onChange: (hm: string) => void;
  placeholder?: string;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  disabled?: boolean;
  error?: string | null;
};

/** Tap to expand a wheel (iOS) or open the clock dialog (Android). 24-hour. */
export function TimeRow({ label, value, onChange, placeholder = 'Set', minuteInterval = 5, disabled, error }: TimeRowProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'time',
        value: hmToDate(value),
        is24Hour: true,
        onValueChange: (_e, d) => {
          tick();
          onChange(dateToHm(d, minuteInterval));
        },
      });
      return;
    }
    setOpen((o) => !o);
  };
  return (
    <PickerShell label={label} display={value || null} placeholder={placeholder} open={open} onToggle={toggle} disabled={disabled} error={error} tabular>
      <DateTimePicker
        value={hmToDate(value)}
        mode="time"
        display="spinner"
        minuteInterval={minuteInterval}
        locale="en-GB"
        themeVariant={t.scheme}
        textColor={t.c.text}
        onValueChange={(_e, d) => onChange(dateToHm(d, minuteInterval))}
        accessibilityLabel={label}
      />
    </PickerShell>
  );
}

export type DateRowProps = {
  label: string;
  /** 'YYYY-MM-DD' or null. */
  value: string | null | undefined;
  onChange: (ymd: string) => void;
  placeholder?: string;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
  error?: string | null;
};

/** Tap to expand an inline calendar (iOS) or open the date dialog (Android). Shows "Fri 14 Nov". */
export function DateRow({ label, value, onChange, placeholder = 'Set', minimumDate, maximumDate, disabled, error }: DateRowProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const initial = value ? ymdToDate(value) : minimumDate ? ymdToDate(minimumDate) : new Date();
  const min = minimumDate ? ymdToDate(minimumDate) : undefined;
  const max = maximumDate ? ymdToDate(maximumDate) : undefined;
  const toggle = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: initial,
        minimumDate: min,
        maximumDate: max,
        firstDayOfWeek: 1,
        onValueChange: (_e, d) => onChange(dateToYmd(d)),
      });
      return;
    }
    setOpen((o) => !o);
  };
  return (
    <PickerShell label={label} display={value ? formatDay(value) : null} placeholder={placeholder} open={open} onToggle={toggle} disabled={disabled} error={error}>
      <DateTimePicker
        value={initial}
        mode="date"
        display="inline"
        locale="en-GB"
        minimumDate={min}
        maximumDate={max}
        themeVariant={t.scheme}
        accentColor={t.scheme === 'dark' ? t.c.sage : t.c.ink}
        onValueChange={(_e, d) => {
          onChange(dateToYmd(d));
          setOpen(false);
        }}
        accessibilityLabel={label}
        style={{ alignSelf: 'stretch', marginHorizontal: t.space.sm }}
      />
    </PickerShell>
  );
}

/* ------------------------------------------------------------------ StepperRow */

export type StepperRowProps = {
  label: string;
  subtitle?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Display text for the value, e.g. (n) => `${n} people`. */
  format?: (n: number) => string;
  disabled?: boolean;
};

export function StepperRow({ label, subtitle, value, onChange, min = 0, max = 99, step = 1, format, disabled }: StepperRowProps) {
  const t = useTheme();
  const row = useRowStyle();
  const shown = format ? format(value) : String(value);
  const canDec = !disabled && value - step >= min;
  const canInc = !disabled && value + step <= max;
  const set = (n: number) => {
    tick();
    onChange(Math.min(max, Math.max(min, n)));
  };
  const btn = (kind: 'minus' | 'add', enabled: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={kind === 'add' ? `Increase ${label}` : `Decrease ${label}`}
      accessibilityState={{ disabled: !enabled }}
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={({ pressed }) => ({
        width: Math.round(36 * t.scale),
        height: Math.round(36 * t.scale),
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.c.borderStrong : t.c.fill,
        opacity: enabled ? 1 : 0.35,
      })}
    >
      <Icon name={kind} size={15} weight="semibold" />
    </Pressable>
  );
  return (
    <View
      style={[styles.row, row]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: shown }}
      accessibilityHint={subtitle}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canInc) set(value + step);
        if (e.nativeEvent.actionName === 'decrement' && canDec) set(value - step);
      }}
    >
      <RowLabel label={label} subtitle={subtitle} />
      <View style={[styles.trail, { gap: t.space.sm }]}>
        {btn('minus', canDec, () => set(value - step))}
        <Text variant="headline" tabular center style={{ minWidth: Math.round(32 * t.scale) }}>
          {shown}
        </Text>
        {btn('add', canInc, () => set(value + step))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ CheckRow / ChoiceRow */

export type CheckRowProps = {
  title: string;
  subtitle?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  /** Shown as the subtitle when disabled ("Already booked"). */
  disabledReason?: string;
  /** A person's avatar after the check (pick-people lists). */
  photo?: { uri?: string | null; source?: number; name?: string };
};

/** Multi-select row: leading circle that fills with a check, then an optional avatar. */
export function CheckRow({ title, subtitle, checked, onToggle, disabled, disabledReason, photo }: CheckRowProps) {
  const t = useTheme();
  const row = useRowStyle();
  const sub = disabled && disabledReason ? disabledReason : subtitle;
  return (
    <Pressable
      onPress={() => {
        tick();
        onToggle(!checked);
      }}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={[title, sub].filter(Boolean).join(', ')}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={({ pressed }) => [styles.row, row, { backgroundColor: pressed ? t.c.fill : 'transparent' }]}
    >
      <Icon name={checked ? 'checkCircle' : 'circle'} size={22} color={disabled ? 'faint' : checked ? 'ink' : 'faint'} />
      {photo ? (
        <Photo
          circle
          size={Math.round(40 * Math.min(t.scale, 1.1))}
          uri={photo.uri}
          source={photo.source}
          name={photo.name ?? title}
          accessibilityLabel=""
          style={disabled ? { opacity: 0.5 } : undefined}
        />
      ) : null}
      <RowLabel label={title} subtitle={sub} color={disabled ? 'faint' : 'text'} />
    </Pressable>
  );
}

export type ChoiceRowProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

/** Single choice within a Section: trailing check on the chosen row. */
export function ChoiceRow({ title, subtitle, selected, onSelect, disabled }: ChoiceRowProps) {
  const t = useTheme();
  const row = useRowStyle();
  return (
    <Pressable
      onPress={() => {
        if (!selected) tick();
        onSelect();
      }}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      accessibilityState={{ selected, disabled: !!disabled }}
      style={({ pressed }) => [styles.row, row, { backgroundColor: pressed ? t.c.fill : 'transparent', opacity: disabled ? 0.42 : 1 }]}
    >
      <RowLabel label={title} subtitle={subtitle} />
      {selected ? <Icon name="check" size={17} weight="semibold" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  labelCol: { flex: 1, minWidth: 0, gap: 1 },
  trail: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, justifyContent: 'flex-end' },
  errorLine: { flexDirection: 'row', alignItems: 'center' },
  counterRow: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 4 },
});
