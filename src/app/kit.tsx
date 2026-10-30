import { useState } from 'react';
import { Modal, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import {
  Avatar,
  Badge,
  Button,
  CheckRow,
  ChipGroup,
  ChoiceRow,
  commit,
  CountBadge,
  DateRow,
  DayPager,
  Empty,
  ErrorState,
  Headline,
  Icon,
  KeyValue,
  Loading,
  Notice,
  Pass,
  Photo,
  PhotoCropper,
  pickPhoto,
  PickerRow,
  Row,
  Screen,
  Section,
  Segmented,
  SheetScreen,
  StepperRow,
  StickyAction,
  SwitchRow,
  Text,
  TextRow,
  Ticket,
  TimeRow,
  useToast,
  WaitingForApproval,
  type PassStatus,
  type PickedPhoto,
} from '@/ui';

const SAMPLE = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800';

function nextDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 12);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <Text variant="title2">{title}</Text>
      {children}
    </View>
  );
}

export default function Kit() {
  const t = useTheme();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lit, setLit] = useState(true);
  const [name, setName] = useState('Camille Laurent');
  const [bio, setBio] = useState('');
  const [push, setPush] = useState(true);
  const [role, setRole] = useState<string | null>('sous');
  const [start, setStart] = useState<string | null>('17:00');
  const [date, setDate] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const [checks, setChecks] = useState<string[]>(['a']);
  const [choice, setChoice] = useState('week');
  const [chips, setChips] = useState<string[]>(['kitchen']);
  const [single, setSingle] = useState<string | null>('all');
  const [seg, setSeg] = useState('upcoming');
  const days = nextDays(28);
  const [picked, setPicked] = useState<string[]>([days[2], days[3]]);
  const [status, setStatus] = useState<PassStatus>('pending');
  const [source, setSource] = useState<PickedPhoto | null>(null);
  const [cropped, setCropped] = useState<PickedPhoto | null>(null);
  const [sheet, setSheet] = useState(false);

  return (
    <Screen
      footer={
        <StickyAction
          note="3 days · £540"
          secondary={{ label: 'Later', onPress: () => toast.show('Saved for later') }}
          primary={{ label: 'Book Camille · 3 days', onPress: () => toast.show('Booked Camille', { tone: 'good' }) }}
        />
      }
    >
      <Headline parts={['Who do you need ', { em: 'for service?' }]} />

      <Group title="Text size">
        <Segmented
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'large', label: 'Larger' },
          ]}
          value={t.textSize}
          onChange={(v) => t.setTextSize(v as 'standard' | 'large')}
        />
        <Text variant="footnote" color="muted">
          {`Scheme: ${t.scheme} · scale ${t.scale} · reduce motion ${t.reduceMotion ? 'on' : 'off'}`}
        </Text>
      </Group>

      <Group title="Type">
        <Text variant="display">Display</Text>
        <Text variant="largeTitle">Large title</Text>
        <Text variant="title">Title</Text>
        <Text variant="title2">Title 2</Text>
        <Text variant="title3">Title 3</Text>
        <Text variant="headline">Headline</Text>
        <Text variant="body">Body — the quick brown fox.</Text>
        <Text variant="callout" color="muted">
          Callout muted
        </Text>
        <Text variant="subhead">Subhead</Text>
        <Text variant="footnote" color="faint">
          Footnote faint
        </Text>
        <Text variant="caption">Caption</Text>
        <Text variant="label" style={{ textTransform: 'uppercase' }}>
          Label
        </Text>
        <Text variant="title" tabular>
          17:00–23:30 · £1,240
        </Text>
      </Group>

      <Group title="Icons">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
          {(['shifts', 'book', 'bookings', 'bell', 'messages', 'check', 'clock', 'alert', 'money', 'kitchen', 'bar', 'floor'] as const).map((n) => (
            <Icon key={n} name={n} size={22} />
          ))}
          <Icon name="bell" size={22} selected color="danger" />
        </View>
      </Group>

      <Group title="Buttons">
        <Button label="Book" onPress={() => setDone((d) => !d)} done={done ? 'Booked' : false} />
        <Button label="Accept" size="large" fullWidth onPress={() => { setDone(true); commit(); }} done={done ? 'Accepted' : false} />
        <Button label="Send" icon="send" loading={loading} onPress={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }} />
        <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Quiet" variant="quiet" onPress={() => {}} />
          <Button label="Cancel days" variant="danger" onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
        </View>
      </Group>

      <Group title="Tickets">
        <Ticket lit={lit} onPress={() => setLit((l) => !l)} accessibilityLabel="Booking request from The Clove Club">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <Avatar uri={SAMPLE} name="The Clove Club" size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="title3">The Clove Club</Text>
              <Text variant="subhead" color="muted">
                Sous chef · 3 days
              </Text>
            </View>
            <Badge label={lit ? 'Your answer' : 'Booked'} tone={lit ? 'attention' : 'good'} />
          </View>
          <KeyValue label="When" value="Fri 14 – Sun 16 Nov" />
          <KeyValue label="Pay" value="£180 a day" tabular />
          {lit ? <Button label="Accept" fullWidth onPress={() => setLit(false)} /> : null}
        </Ticket>
        <Ticket spiked>
          <Text variant="headline">Spiked ticket</Text>
          <Badge label="Worked 6.25 h" tone="good" icon="check" />
        </Ticket>
      </Group>

      <Group title="Badges">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, alignItems: 'center' }}>
          <Badge label="Draft" />
          <Badge label="Available" tone="good" />
          <Badge label="Waiting on you" tone="attention" />
          <Badge label="Cancelled" tone="danger" />
          <CountBadge count={3} />
          <CountBadge count={14} />
        </View>
      </Group>

      <Group title="Photos">
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <View style={{ flex: 1 }}>
            <Photo uri={SAMPLE} name="Camille" />
          </View>
          <View style={{ flex: 1 }}>
            <Photo uri={null} name="Camille" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center' }}>
          <Avatar uri={SAMPLE} name="A" size={28} />
          <Avatar uri={null} name="Bao" size={40} />
          <Avatar uri={SAMPLE} name="C" size={56} />
          <Avatar uri={null} name="Dani" size={96} />
        </View>
      </Group>

      <Group title="Rows">
        <Section label="Account" footer="Rows are two lines at most.">
          <Row title="Camille Laurent" subtitle="Sous chef" photo={{ uri: SAMPLE, name: 'Camille' }} onPress={() => {}} />
          <Row title="Notifications" icon="bell" trailing={<CountBadge count={2} />} onPress={() => {}} />
          <Row title="Text size" icon="textSize" value="Larger" onPress={() => {}} />
          <Row title="Status" trailing={<Badge label="Verified" tone="good" />} />
          <Row title="Sign out" icon="logout" destructive onPress={() => {}} chevron={false} />
        </Section>
      </Group>

      <Group title="Form">
        <Section label="Profile">
          <TextRow label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          <TextRow label="Phone" value="" onChangeText={() => {}} placeholder="07…" keyboardType="phone-pad" error="Enter a UK mobile number." />
          <TextRow label="About" value={bio} onChangeText={setBio} placeholder="A line or two about your cooking" multiline maxLength={160} />
        </Section>
        <Section label="Settings">
          <SwitchRow label="Push notifications" value={push} onValueChange={setPush} />
          <PickerRow
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'head', label: 'Head chef' },
              { value: 'sous', label: 'Sous chef' },
              { value: 'cdp', label: 'Chef de partie' },
              { value: 'pastry', label: 'Pastry chef', subtitle: 'Kitchen' },
            ]}
          />
          <TimeRow label="Start" value={start} onChange={setStart} />
          <DateRow label="Date" value={date} onChange={setDate} minimumDate={days[0]} />
          <StepperRow label="People" value={people} onChange={setPeople} min={1} max={6} />
        </Section>
        <Section label="Which days">
          <CheckRow title="Fri 14 Nov" checked={checks.includes('a')} onToggle={(on) => setChecks((c) => (on ? [...c, 'a'] : c.filter((x) => x !== 'a')))} />
          <CheckRow title="Sat 15 Nov" subtitle="17:00–23:00" checked={checks.includes('b')} onToggle={(on) => setChecks((c) => (on ? [...c, 'b'] : c.filter((x) => x !== 'b')))} />
          <CheckRow title="Sun 16 Nov" checked={false} onToggle={() => {}} disabled disabledReason="Already booked" />
        </Section>
        <Section label="Repeat">
          <ChoiceRow title="Every week" selected={choice === 'week'} onSelect={() => setChoice('week')} />
          <ChoiceRow title="Every two weeks" selected={choice === 'two'} onSelect={() => setChoice('two')} />
          <ChoiceRow title="Once" subtitle="Just this service" selected={choice === 'once'} onSelect={() => setChoice('once')} />
        </Section>
      </Group>

      <Group title="Chips">
        <ChipGroup
          multiple
          max={2}
          value={chips}
          onChange={setChips}
          onMaxReached={() => toast.show('Pick up to 2', { tone: 'error' })}
          options={[
            { value: 'kitchen', label: 'Kitchen', count: 12, icon: 'kitchen' },
            { value: 'pastry', label: 'Pastry', count: 4 },
            { value: 'bar', label: 'Bar', count: 7 },
            { value: 'floor', label: 'Floor', count: 9 },
          ]}
        />
        <ChipGroup
          value={single}
          onChange={setSingle}
          options={[
            { value: 'all', label: 'All' },
            { value: 'free', label: 'Free this week' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
      </Group>

      <Group title="Segmented">
        <Segmented
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          value={seg}
          onChange={setSeg}
        />
      </Group>

      <Group title="Day pager">
        <Ticket>
          <DayPager
            days={days}
            value={picked}
            onChange={setPicked}
            max={5}
            onMaxReached={() => toast.show('Up to 5 days', { tone: 'error' })}
            describe={(d) => {
              const i = days.indexOf(d);
              if (i % 7 === 5) return { tone: 'booked', note: 'Booked', disabled: true };
              if (i % 5 === 1) return { tone: 'notFree', note: 'Away' };
              if (i % 3 === 0) return { tone: 'free', note: 'Free' };
              return undefined;
            }}
          />
        </Ticket>
      </Group>

      <Group title="Pass">
        <View style={{ flexDirection: 'row', gap: t.space.sm }}>
          {(['pending', 'success', 'error'] as const).map((s) => (
            <Button key={s} label={s} variant={status === s ? 'primary' : 'secondary'} onPress={() => setStatus(s)} />
          ))}
        </View>
        <Pass
          kind="member"
          name="Camille Laurent"
          role="Sous chef · Kitchen"
          photo={SAMPLE}
          status={status}
          facts={[
            { label: 'Member', value: 'Since Oct 2026' },
            { label: 'Worked', value: '14 services', tabular: true },
          ]}
        />
      </Group>

      <Group title="States">
        <Notice text="You're offline. Showing what was saved." />
        <Notice tone="good" text="Your hours are confirmed." />
        <Notice tone="warning" text="This shift starts in 2 hours." />
        <Notice tone="danger" text="This venue cancelled." />
        <Loading count={2} />
        <Loading count={3} variant="rows" />
        <Ticket>
          <Empty title="No bookings yet" message="When a venue books you, it shows here." action={{ label: 'Set availability', onPress: () => {} }} icon="bookings" />
        </Ticket>
        <Ticket>
          <ErrorState onRetry={() => toast.show("Couldn't reach Dyuknow", { tone: 'error' })} />
        </Ticket>
        <Ticket>
          <WaitingForApproval />
        </Ticket>
      </Group>

      <Group title="Toasts">
        <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
          <Button label="Good toast" variant="secondary" onPress={() => toast.show('Request sent to Camille')} />
          <Button label="Error toast" variant="secondary" onPress={() => toast.show("Couldn't send. Try again.", { tone: 'error' })} />
          <Button label="Bottom" variant="secondary" onPress={() => toast.show('Saved', { position: 'bottom' })} />
        </View>
      </Group>

      <Group title="Photo cropper">
        <Button
          label="Pick a photo"
          icon="photo"
          variant="secondary"
          onPress={async () => {
            const r = await pickPhoto();
            if (r.status === 'picked') setSource(r.photo);
            else if (r.status === 'error') toast.show(r.error, { tone: 'error' });
          }}
        />
        {cropped ? (
          <View style={{ width: 160 }}>
            <Photo uri={cropped.uri} name="Cropped" />
            <Text variant="caption" color="muted" tabular>{`${cropped.width}×${cropped.height}`}</Text>
          </View>
        ) : null}
      </Group>

      <Group title="Sheet screen">
        <Button label="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
      </Group>

      <Modal visible={!!source} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSource(null)}>
        {source ? (
          <SheetScreen title="Crop photo" onClose={() => setSource(null)} scroll={false}>
            <View style={{ height: 560 }}>
              <PhotoCropper
                {...source}
                onCancel={() => setSource(null)}
                onDone={(p) => {
                  setCropped(p);
                  setSource(null);
                  commit();
                }}
              />
            </View>
          </SheetScreen>
        ) : null}
      </Modal>

      <Modal visible={sheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(false)}>
        <SheetScreen
          title="Confirm hours"
          subtitle="Fri 14 Nov · The Clove Club"
          onClose={() => setSheet(false)}
          footer={<StickyAction primary={{ label: 'Confirm 6.25 h', onPress: () => setSheet(false) }} />}
        >
          <Section>
            <TimeRow label="Started" value="17:00" onChange={() => {}} />
            <TimeRow label="Finished" value="23:15" onChange={() => {}} />
            <StepperRow label="Break (min)" value={30} onChange={() => {}} step={15} max={120} />
          </Section>
        </SheetScreen>
      </Modal>
    </Screen>
  );
}
