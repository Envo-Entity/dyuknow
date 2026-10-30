// The date-and-time picker for asking for cover (web `DateTimeBar`): up to 14
// dates, a service preset, From/To. Collapsible on Book and a team list (a
// ticket folded to one line), open inside the composer.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { datesLabel, datesSummary, londonToday, upcomingDates } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Chip, DayPager, Icon, Section, Separator, Text, Ticket, TimeRow, useToast } from '@/ui';

import { DAYS_AHEAD, MAX_DATES, PRESETS, presetOf, whenDays, type When } from './when';

type Props = {
  value: When;
  onChange: (next: When) => void;
};

function useDays() {
  // Today in London, then eight weeks.
  return upcomingDates(londonToday(), DAYS_AHEAD);
}

/** The open form's summary line (FEATURES §1.9). */
export function whenSummary(value: When) {
  const full = value.dates.length >= MAX_DATES;
  if (!value.dates.length) return 'Choose a date';
  if (!whenDays(value).length) return 'Choose different start and end times';
  return `${datesLabel(value.dates)} · ${value.start}–${value.end}${full ? ` · up to ${MAX_DATES} dates` : ''}`;
}

function DatesAndPresets({ value, onChange }: Props) {
  const t = useTheme();
  const toast = useToast();
  const days = useDays();
  const set = (patch: Partial<When>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: t.space.lg }}>
      <DayPager
        days={days}
        value={value.dates}
        max={MAX_DATES}
        onMaxReached={() => toast.show(`Choose between 1 and ${MAX_DATES} dates.`, { tone: 'error' })}
        onChange={(dates) => set({ dates })}
      />
      <View style={[styles.wrap, { gap: t.space.sm }]} accessibilityLabel="Service">
        {PRESETS.map((p) => {
          const on = value.start === p.start && value.end === p.end;
          return (
            <Chip
              key={p.name}
              label={`${p.name} ${p.start}–${p.end}`}
              accessibilityLabel={`${p.name}, ${p.start} to ${p.end}`}
              selected={on}
              onPress={() => set({ start: p.start, end: p.end })}
            />
          );
        })}
      </View>
    </View>
  );
}

/** The open form, as Settings-style sections (used by the composer). */
export function WhenSection({ value, onChange, label = 'When' }: Props & { label?: string }) {
  const t = useTheme();
  const set = (patch: Partial<When>) => onChange({ ...value, ...patch });
  return (
    <Section label={label} footer={whenSummary(value)}>
      <View style={{ padding: t.space.lg }}>
        <DatesAndPresets value={value} onChange={onChange} />
      </View>
      <TimeRow label="From" value={value.start} onChange={(start) => set({ start })} />
      <TimeRow label="To" value={value.end} onChange={(end) => set({ end })} />
    </Section>
  );
}

/** The folded ticket: "When Thu 8 Oct" · "Dinner 17:00–23:00" · Change. */
export function WhenBar({ value, onChange }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<When>) => onChange({ ...value, ...patch });
  const valid = whenDays(value).length > 0;
  const glance = datesSummary(value.dates);
  const preset = presetOf(value)?.name ?? 'Hours';
  const datesText = value.dates.length ? glance.main : 'Choose a date';
  const headDisabled = open && !valid;
  const layout = t.reduceMotion ? undefined : LinearTransition.duration(t.motion.normal);

  return (
    <Animated.View layout={layout}>
      <Ticket padding={0} gap={0}>
        <Pressable
          onPress={() => setOpen(!open)}
          disabled={headDisabled}
          accessibilityRole="button"
          accessibilityLabel={`When, ${datesText}${glance.sub ? `, ${glance.sub}` : ''}. ${preset}, ${value.start} to ${value.end}`}
          accessibilityHint={open ? 'Done' : 'Change'}
          accessibilityState={{ expanded: open, disabled: headDisabled }}
          style={({ pressed }) => [
            styles.head,
            {
              padding: t.space.lg,
              gap: t.space.md,
              minHeight: t.hit + t.space.lg,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={{ flex: 1.3, minWidth: 0, gap: 1 }}>
            <Text variant="caption" color="muted">
              When
            </Text>
            <Text variant="headline" tabular numberOfLines={1}>
              {datesText}
            </Text>
            {glance.sub ? (
              <Text variant="footnote" color="muted" tabular numberOfLines={1}>
                {glance.sub}
              </Text>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="caption" color="muted">
              {preset}
            </Text>
            <Text variant="headline" tabular numberOfLines={1}>
              {`${value.start}–${value.end}`}
            </Text>
          </View>
          <View style={[styles.change, { gap: t.space.xs, opacity: headDisabled ? 0.42 : 1 }]}>
            <Animated.View key={open ? 'done' : 'change'} entering={FadeIn.duration(t.motion.fast)} exiting={FadeOut.duration(t.motion.fast)}>
              <Text variant="subhead" weight="600">
                {open ? 'Done' : 'Change'}
              </Text>
            </Animated.View>
            <Icon name="chevronUpDown" size={13} color="muted" weight="semibold" />
          </View>
        </Pressable>
        {open ? (
          <Animated.View entering={FadeIn.duration(t.motion.normal)} exiting={FadeOut.duration(t.motion.fast)}>
            <Separator inset={0} />
            <View style={{ padding: t.space.lg, gap: t.space.lg }}>
              <DatesAndPresets value={value} onChange={onChange} />
              <View style={[styles.times, { borderRadius: t.radius.md, borderColor: t.c.border }]}>
                <TimeRow label="From" value={value.start} onChange={(start) => set({ start })} />
                <Separator />
                <TimeRow label="To" value={value.end} onChange={(end) => set({ end })} />
              </View>
              {!valid ? (
                <Text variant="footnote" color="dangerText" accessibilityLiveRegion="polite">
                  {whenSummary(value)}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </Ticket>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  change: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  times: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
