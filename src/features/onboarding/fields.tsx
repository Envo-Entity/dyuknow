// Onboarding's composite fields: the photo step, document uploads, the
// employer repeater and dated availability. Each is arranged from kit parts.
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  displayDate,
  londonToday,
  upcomingDates,
  validateDatedAvailability,
  datePlus,
  type DatedAvailability,
  type EmployerEntry,
  type UploadedFile,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Button,
  DateRow,
  DayPager,
  Notice,
  GroupHeading,
  Photo,
  PhotoCropModal,
  Row,
  Section,
  Segmented,
  SelectSheet,
  Text,
  TextRow,
  TimeRow,
  pickPhoto,
  type PickedPhoto,
} from '@/ui';

import { keepFile } from './parts';

/* ------------------------------------------------------------------ PhotoStep */

const READ_IMAGE_ERROR = "Couldn't read that image — try another, or take a new photo.";

/** A 4:5 tile and two buttons; picking opens the cropper full screen. */
export function PhotoStep({ photo, name, onPhoto }: { photo: string | null; name: string; onPhoto: (uri: string) => void }) {
  const t = useTheme();
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (source: 'library' | 'camera') => {
    const r = await pickPhoto(source);
    if (r.status === 'cancelled') return;
    if (r.status === 'error') {
      // Permission problems keep their own line; anything else is the website's.
      setError(/Settings|camera/i.test(r.error) ? r.error : READ_IMAGE_ERROR);
      return;
    }
    setError(null);
    setPicked(r.photo);
  };

  return (
    <View style={{ alignItems: 'center', gap: t.space.lg }}>
      <Pressable
        onPress={() => choose('library')}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Change photo' : 'Tap to add a photo'}
        style={({ pressed }) => ({
          width: Math.round(176 * t.scale),
          borderRadius: t.radius.card,
          borderWidth: photo ? 0 : 1.5,
          borderStyle: 'dashed',
          borderColor: t.c.borderStrong,
          overflow: 'hidden',
          transform: [{ scale: pressed && !t.reduceMotion ? 0.98 : 1 }],
        })}
      >
        {photo ? (
          <Animated.View key={photo} entering={FadeIn.duration(t.motion.normal)}>
            <Photo uri={photo} name={name} radius={t.radius.card} accessibilityLabel="" />
          </Animated.View>
        ) : (
          <View style={{ aspectRatio: 4 / 5, alignItems: 'center', justifyContent: 'center', gap: t.space.sm, backgroundColor: t.c.card, padding: t.space.lg }}>
            <Text variant="title3" color="faint" style={{ fontSize: Math.round(34 * t.scale), lineHeight: Math.round(38 * t.scale) }}>
              {name.trim() ? name.trim()[0].toUpperCase() : '?'}
            </Text>
            <Text variant="footnote" weight="600" color="muted" center>
              Tap to add a photo
            </Text>
          </View>
        )}
      </Pressable>
      <View style={{ alignSelf: 'stretch', gap: t.space.sm }}>
        <Button label={photo ? 'Change photo' : 'Choose a photo'} variant="secondary" icon="photo" fullWidth onPress={() => choose('library')} />
        <Button label="Take a photo" variant="quiet" icon="camera" fullWidth onPress={() => choose('camera')} />
      </View>
      {error ? <Notice tone="danger" text={error} style={{ alignSelf: 'stretch' }} /> : null}

      <PhotoCropModal
        photo={picked}
        hint="Drag to move it. This is how it will look everywhere on Dyuknow."
        quality={0.92}
        onCancel={() => setPicked(null)}
        onDone={(out) => {
          setPicked(null);
          onPhoto(keepFile(out.uri, 'jpg'));
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ Uploads */

const READ_FILE_ERROR = "Couldn't read that file — try another.";
type Source = 'files' | 'library' | 'camera' | 'remove';

function extensionOf(name: string, mimeType: string) {
  if (mimeType === 'application/pdf') return 'pdf';
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : mimeType.split('/')[1] || 'jpg';
}

export type UploadItem = {
  label: string;
  optional?: boolean;
  note?: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
};

/** Document rows: file name and an "Added" badge; tapping offers a file, a photo or the camera. */
export function UploadRows({ items }: { items: UploadItem[] }) {
  const t = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<{ index: number; text: string } | null>(null);
  const item = open != null ? items[open] : null;

  const pick = async (index: number, source: Source) => {
    const target = items[index];
    if (source === 'remove') {
      target.onChange(null);
      return;
    }
    // Let the choice sheet finish closing before the system picker opens.
    await new Promise((r) => setTimeout(r, 350));
    try {
      if (source === 'files') {
        const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
        if (r.canceled || !r.assets?.length) return;
        const a = r.assets[0];
        const mimeType = a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        setError(null);
        target.onChange({ name: a.name, uri: keepFile(a.uri, extensionOf(a.name, mimeType)), mimeType, size: a.size });
        return;
      }
      const r = await pickPhoto(source);
      if (r.status === 'cancelled') return;
      if (r.status === 'error') {
        setError({ index, text: /Settings|camera/i.test(r.error) ? r.error : READ_FILE_ERROR });
        return;
      }
      const name = r.photo.uri.split('/').pop() || 'Photo.jpg';
      setError(null);
      target.onChange({ name, uri: keepFile(r.photo.uri, extensionOf(name, 'image/jpeg')), mimeType: /\.png$/i.test(name) ? 'image/png' : 'image/jpeg' });
    } catch {
      setError({ index, text: READ_FILE_ERROR });
    }
  };

  return (
    <View style={{ gap: t.space.sm }}>
      <Section>
        {items.map((it, i) => {
          const marks = [it.optional && 'optional', it.note].filter(Boolean).join(' · ');
          return (
            <Row
              key={it.label}
              title={it.label}
              subtitle={it.value ? it.value.name : ['Tap to upload', marks].filter(Boolean).join(' · ')}
              icon="document"
              value={it.value ? undefined : 'Upload'}
              trailing={it.value ? <Badge label="Added" tone="good" icon="check" /> : undefined}
              onPress={() => setOpen(i)}
              accessibilityLabel={[it.label, marks, it.value ? `${it.value.name}, added` : 'not added'].filter(Boolean).join(', ')}
              accessibilityHint={it.value ? 'Change or remove this file' : 'Upload a photo or PDF'}
            />
          );
        })}
      </Section>
      {error ? <Notice tone="danger" text={error.text} /> : null}
      <SelectSheet<Source>
        visible={open != null}
        title={item?.label}
        value={null}
        options={[
          { value: 'files', label: 'Choose a file', subtitle: 'A PDF or an image' },
          { value: 'library', label: 'Choose from photos' },
          { value: 'camera', label: 'Take a photo' },
          ...(item?.value ? [{ value: 'remove' as const, label: 'Remove' }] : []),
        ]}
        onSelect={(v) => open != null && void pick(open, v)}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ Employers */

const MAX_EMPLOYERS = 3;
const EMPTY_EMPLOYER: EmployerEntry = { restaurant: '', position: '', dates: '' };

export function EmployerRepeater({ value, onChange }: { value: EmployerEntry[]; onChange: (next: EmployerEntry[]) => void }) {
  const t = useTheme();
  const set = (i: number, patch: Partial<EmployerEntry>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <View style={{ gap: t.space.lg }}>
      <GroupHeading title="Recent employers" />
      {value.map((e, i) => (
        <Animated.View key={i} entering={FadeIn.duration(t.motion.normal)} exiting={FadeOut.duration(t.motion.fast)} layout={t.reduceMotion ? undefined : LinearTransition.duration(t.motion.normal)}>
          <Section label={`Employer ${i + 1}`}>
            <TextRow label="Restaurant" value={e.restaurant} onChangeText={(v) => set(i, { restaurant: v })} placeholder="e.g. The Larkspur" autoCapitalize="words" returnKeyType="done" />
            <TextRow label="Position" value={e.position} onChangeText={(v) => set(i, { position: v })} placeholder="e.g. Sous Chef" autoCapitalize="words" returnKeyType="done" />
            <TextRow label="Dates" value={e.dates} onChangeText={(v) => set(i, { dates: v })} placeholder="e.g. 2022–2024" returnKeyType="done" />
            <Row title="Remove" destructive chevron={false} onPress={() => onChange(value.filter((_, j) => j !== i))} accessibilityLabel={`Remove employer ${i + 1}`} />
          </Section>
        </Animated.View>
      ))}
      {value.length < MAX_EMPLOYERS ? (
        <Button
          label={value.length ? 'Add another employer' : 'Add an employer'}
          variant="secondary"
          icon="add"
          fullWidth
          onPress={() => onChange([...value, { ...EMPTY_EMPLOYER }])}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Dated availability */

type Mode = 'all' | 'range' | 'off';
const MODES: { value: Mode; label: string }[] = [
  { value: 'all', label: 'Free all day' },
  { value: 'range', label: 'Free from–to' },
  { value: 'off', label: 'Not free' },
];

function modeOf(e: DatedAvailability): Mode {
  return e.kind === 'not-free' ? 'off' : e.start === e.end ? 'all' : 'range';
}
function entryLabel(e: DatedAvailability) {
  if (e.kind === 'not-free') return 'Not free';
  if (e.start === e.end) return 'Free all day';
  return `${e.start}–${e.end}${e.end < e.start ? ' (+1 day)' : ''}`;
}

/** Specific dates and hours, one entry per date, all optional. */
export function DatedAvailabilityField({ value, onChange }: { value: DatedAvailability[]; onChange: (next: DatedAvailability[]) => void }) {
  const t = useTheme();
  const today = londonToday();
  const days = upcomingDates(today, 14);
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<Mode>('range');
  const [start, setStart] = useState('16:00');
  const [end, setEnd] = useState('23:59');
  const [error, setError] = useState<string | null>(null);
  const existing = value.find((v) => v.date === date);

  const select = (next: string) => {
    setDate(next);
    setError(null);
    const entry = value.find((v) => v.date === next);
    if (entry) {
      setMode(modeOf(entry));
      setStart(entry.start);
      setEnd(entry.end);
    } else {
      setMode('range');
      setStart('16:00');
      setEnd('23:59');
    }
  };

  const add = () => {
    const entry: DatedAvailability = {
      date,
      kind: mode === 'off' ? 'not-free' : 'free',
      start: mode === 'range' ? start : '00:00',
      end: mode === 'range' ? end : '00:00',
    };
    const problem = validateDatedAvailability([entry]);
    setError(problem);
    if (problem) return;
    onChange([...value.filter((v) => v.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)));
  };

  return (
    <View style={{ gap: t.space.lg }}>
      <View style={{ gap: t.space.sm }}>
        <View style={[styles.trail, { gap: t.space.sm }]}>
          <GroupHeading title="When are you free?" style={{ flexShrink: 1, marginBottom: 0 }} />
          <Badge label="Optional" icon={null} />
        </View>
        <Text variant="subhead" color="muted">
          Add specific dates and hours in London time. Your general availability preferences above stay as they are.
        </Text>
      </View>

      <Section>
        <View style={{ padding: t.space.lg }}>
          <DayPager
            days={days}
            value={[date]}
            hideClear
            onChange={(v) => {
              const picked = v.find((d) => d !== date);
              if (picked) select(picked);
            }}
            describe={(d) => {
              const e = value.find((v) => v.date === d);
              if (!e) return undefined;
              return { note: e.kind === 'not-free' ? 'Not free' : 'Free', tone: e.kind === 'not-free' ? 'notFree' : 'free' };
            }}
          />
        </View>
        <DateRow label="Availability date" value={date} onChange={select} minimumDate={today} maximumDate={datePlus(today, 55)} />
      </Section>

      <Section label="Availability on this date" footer={mode === 'range' && end < start ? 'Ends the following day.' : undefined}>
        <View style={{ padding: t.space.md }}>
          <Segmented options={MODES} value={mode} onChange={(m) => { setMode(m); setError(null); }} />
        </View>
        {mode === 'range' ? <TimeRow label="Free from" value={start} onChange={(v) => { setStart(v); setError(null); }} /> : null}
        {mode === 'range' ? <TimeRow label="Free until" value={end} onChange={(v) => { setEnd(v); setError(null); }} /> : null}
      </Section>

      {error ? <Notice tone="danger" text={error} /> : null}
      <Button label={existing ? 'Update date' : 'Add date'} variant="secondary" icon={existing ? 'refresh' : 'add'} fullWidth onPress={add} />

      {value.length ? (
        <Animated.View entering={FadeIn.duration(t.motion.normal)} layout={t.reduceMotion ? undefined : LinearTransition.duration(t.motion.normal)}>
          <Section label="Your dates">
            {value.map((e) => (
              <Row
                key={e.date}
                title={displayDate(e.date)}
                subtitle={entryLabel(e)}
                onPress={() => select(e.date)}
                chevron={false}
                accessibilityHint="Edit this date"
                trailing={
                  <View style={styles.trail}>
                    <Badge label={e.kind === 'not-free' ? 'Not free' : 'Free'} tone={e.kind === 'not-free' ? 'neutral' : 'good'} icon={e.kind === 'not-free' ? 'cancelled' : 'check'} />
                    <Button
                      label="Remove"
                      variant="quiet"
                      onPress={() => onChange(value.filter((v) => v.date !== e.date))}
                      accessibilityLabel={`Remove availability for ${displayDate(e.date)}`}
                    />
                  </View>
                }
              />
            ))}
          </Section>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trail: { flexDirection: 'row', alignItems: 'center' },
});
