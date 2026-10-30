// The one form for asking for cover (web `ShiftComposer`, FEATURES §7.2).
// With people in To it sends them a booking request; with nobody it posts a
// job to everyone in the position.
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LiveGate, postShift, postShiftMessage, sendToMore, useLive } from '@/data';
import {
  FAMILIES,
  alreadyAsked,
  datePlus,
  datesLabel,
  firstName,
  joinNames,
  lastAsk,
  londonDate,
  makeDays,
  money,
  openAnswer,
  openDates,
  serviceLabel,
  similarShift,
  teamOf,
  type Data,
  type Member,
  type Service,
  type Shift,
  type ShiftDraft,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import {
  Button,
  ChipGroup,
  Empty,
  IconButton,
  Notice,
  Row,
  Screen,
  Section,
  StepperRow,
  StickyAction,
  Text,
  TextLink,
  TextRow,
} from '@/ui';

import { SectionBody } from './parts';
import { savedWhen, setWhen as keepWhen, type When } from './when';
import { WhenSection } from './WhenBar';

const NATIONAL_LIVING_WAGE = 12.71;
const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export type ComposeParams = {
  team?: string | string[];
  to?: string | string[];
  position?: string | string[];
  again?: string | string[];
  from?: string | string[];
  chat?: string | string[];
};

export function Compose(params: ComposeParams) {
  return (
    <LiveGate header={<Stack.Screen options={{ title: '' }} />} loading={{ count: 2, variant: 'rows' }}>
      {({ data, me, side }) => <ComposeReady params={params} data={data} me={me} side={side} />}
    </LiveGate>
  );
}

function ComposeReady({ params, data, me, side }: { params: ComposeParams; data: Data; me: Member; side: 'talent' | 'venue' }) {
  const againId = one(params.again);
  const toParam = one(params.to);
  const fromChat = one(params.from) === 'chat';

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/v/book'));
  let family: string | undefined;
  let source: Shift | undefined;
  let to: string[];
  if (againId) {
    source = data.shifts.find((s) => s.id === againId && s.venue === me.id);
    family = source ? teamOf(source.roles) : undefined;
    // `to` defaults to everyone the original request went to.
    to = toParam
      ? toParam.split(',')
      : data.responses.filter((r) => r.shift === againId && r.source === 'invite').map((r) => r.talent);
  } else {
    const t = one(params.team);
    family = t && FAMILIES[t] ? t : undefined;
    to = toParam ? toParam.split(',') : [];
  }

  if (side !== 'venue' || !family)
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Empty
          title={againId ? 'Shift not found' : 'Team not found'}
          action={{ label: 'Back to Book', onPress: back }}
        />
      </Screen>
    );

  const position = one(params.position);
  return (
    <ComposerForm
      // From the params only: `to` for "again" is read from the snapshot, and a reload must not reset the form.
      key={[againId, family, toParam, position, fromChat].join('/')}
      data={data}
      venue={me.id}
      family={family}
      initialTo={to}
      role={position && position !== '-' ? position : undefined}
      source={source}
      fromChat={fromChat}
    />
  );
}

type Draft = {
  roles: string[];
  dates: string[];
  start: string;
  end: string;
  capacity: number;
  rate: string; // as typed, without the £
  note: string;
  to: string[];
};

function initialDraft(data: Data, venue: string, family: string, initialTo: string[], role?: string, source?: Shift): Draft {
  // Unknown ids and non-talent ids are dropped.
  const to = [...new Set(initialTo)].filter((id) => data.members.some((m) => m.id === id && m.side === 'talent'));
  if (source)
    return {
      roles: source.roles,
      dates: source.days.map((d) => d.date),
      start: source.days[0].start,
      end: source.days[0].end,
      capacity: source.capacity,
      rate: source.rate ? String(source.rate) : '',
      note: source.note,
      to,
    };
  // Start from what this venue asked for last time in this team: pay and
  // note carry over, so nothing needs setting up in advance.
  const last = lastAsk(data, venue, family);
  const anyLast = last || lastAsk(data, venue);
  const inTeam = FAMILIES[family].roles;
  const theirs = [
    ...new Set(to.flatMap((id) => data.members.find((m) => m.id === id)?.roles.filter((r) => inTeam.includes(r)) ?? [])),
  ];
  const when = savedWhen();
  const tomorrow = datePlus(londonDate(data.now), 1);
  return {
    roles: role && inTeam.includes(role) ? [role] : theirs.length ? theirs : last?.roles ?? [],
    dates: when.dates.length ? when.dates : [tomorrow],
    start: when.start,
    end: when.end,
    capacity: 1,
    rate: last?.rate ? String(last.rate) : '',
    note: anyLast?.note || '',
    to,
  };
}

/** Digits and one decimal point, at most two decimals. */
function cleanRate(text: string) {
  const digits = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = digits.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

function ComposerForm({
  data,
  venue,
  family,
  initialTo,
  role,
  source,
  fromChat,
}: {
  data: Data;
  venue: string;
  family: string;
  initialTo: string[];
  role?: string;
  source?: Shift;
  fromChat: boolean;
}) {
  const t = useTheme();
  const { run } = useLive();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(data, venue, family, initialTo, role, source));
  const [editingNote, setEditingNote] = useState(false);
  const [sending, setSending] = useState(false);
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const rate = Number(draft.rate) || 0;
  const people: Member[] = draft.to.map((id) => data.members.find((m) => m.id === id)).filter((m): m is Member => !!m);
  const request = draft.to.length > 0;
  const names = joinNames(people.map(firstName));

  // ---- validation, the first that applies (§7.2) ----
  let days: Service[] = [];
  let validation = '';
  try {
    days = makeDays({ dates: draft.dates, start: draft.start, end: draft.end });
    if (days[0].from <= data.now) validation = 'That start time has passed.';
  } catch (e) {
    validation = (e as Error).message;
  }
  if (!validation && !draft.roles.length) validation = 'Choose at least one position.';
  const duplicate = days.length && draft.roles.length ? similarShift(data, venue, draft.roles, days) : undefined;
  const lowest = Math.max(0, ...people.map((p) => p.minRate || 0));
  // People already answering one of this venue's asks for these hours.
  const taken = days.length
    ? people.map((p) => ({ p, r: openAnswer(data, venue, p.id, days) })).filter((x) => !!x.r)
    : [];
  if (!validation && taken.length) validation = alreadyAsked(taken[0].p, taken[0].r!.status);

  const remove = (id: string) => update({ to: draft.to.filter((x) => x !== id) });
  const when: When = { dates: draft.dates, start: draft.start, end: draft.end };
  const changeWhen = (w: When) => {
    update({ dates: w.dates, start: w.start, end: w.end });
    keepWhen(w);
  };

  async function send() {
    if (validation) return;
    const shiftDraft: ShiftDraft = {
      roles: draft.roles,
      family,
      date: draft.dates[0],
      count: 1,
      dates: draft.dates,
      start: draft.start,
      end: draft.end,
      capacity: draft.capacity,
      rate,
      note: draft.note,
      to: draft.to,
    };
    const single = people.length === 1 && draft.capacity === 1;
    const fallback = request
      ? single
        ? `Sent. ${firstName(people[0])} is booked as soon as they accept.`
        : `Sent to ${names}. Book whoever says yes.`
      : 'Job posted.';
    setSending(true);
    const r = await run('post-shift', (ref) => postShift(shiftDraft, ref), {
      args: shiftDraft,
      success: (res) => postShiftMessage(res) ?? fallback,
    });
    setSending(false);
    if (!r) return;
    // From a chat, the new card in the thread is the confirmation.
    if (fromChat) router.back();
    else router.replace(`/shift/${r.shift_id}`);
  }

  async function sendThatJob(dup: Shift) {
    const to = [...draft.to];
    const ok = await run(`send-more:${dup.id}`, (ref) => sendToMore(dup.id, to, ref), {
      args: { shift: dup.id, to: [...to].sort() },
      success: `Sent to ${names}.`,
    });
    if (ok !== undefined) router.replace(`/shift/${dup.id}`);
  }

  const dupOpen = duplicate ? openDates(data, duplicate) : [];
  const dupKind = duplicate?.mode === 'post' ? 'job post' : 'request';
  const submitLabel = request
    ? `Send booking request to ${people.length > 2 ? `${people.length} people` : names}`
    : 'Post job';
  const showValidation = !!validation && draft.roles.length > 0 && !taken.length;

  return (
    <Screen
      gap="xxl"
      footer={<StickyAction primary={{ label: submitLabel, onPress: send, disabled: !!validation, loading: sending }} />}
    >
      <Stack.Screen options={{ title: request ? 'Booking request' : `${family} job post` }} />

      {/* To */}
      <Section label="To" separatorInset={72}>
        {request ? (
          people.map((p) => (
            <Row
              key={p.id}
              photo={{ uri: p.photo, name: p.name }}
              title={p.name}
              subtitle={p.roles.join(' · ') || undefined}
              trailing={<IconButton icon="close" accessibilityLabel={`Remove ${p.name}`} onPress={() => remove(p.id)} />}
            />
          ))
        ) : (
          <SectionBody>
            <Text variant="body" color="muted">
              {`Everyone in ${draft.roles.length ? draft.roles.join(' or ') : 'the position you choose'}.`}
            </Text>
          </SectionBody>
        )}
      </Section>

      {/* Position */}
      <Section label="Position">
        <SectionBody>
          <ChipGroup
            multiple
            accessibilityLabel="Position"
            options={FAMILIES[family].roles.map((r) => ({
              value: r,
              label: r,
              count: request
                ? undefined
                : data.members.filter((m) => m.approved && m.side === 'talent' && m.roles.includes(r)).length,
            }))}
            value={draft.roles}
            onChange={(roles) => update({ roles: FAMILIES[family].roles.filter((r) => roles.includes(r)) })}
          />
        </SectionBody>
      </Section>

      {/* When */}
      <View style={{ gap: t.space.md }}>
        <WhenSection value={when} onChange={changeWhen} />
        {days.length > 0 ? (
          <Section footer={days.length > 1 ? 'Same hours each day' : undefined}>
            {days.map((d) => (
              <Row key={d.date} icon="bookings" title={serviceLabel(d)} />
            ))}
          </Section>
        ) : null}
        {taken.map(({ p, r }) => (
          <Warning
            key={p.id}
            text={alreadyAsked(p, r!.status)}
            actions={[
              { label: r!.status === 'can-cover' ? 'Book' : 'View', onPress: () => router.push(`/shift/${r!.shift}`) },
              { label: 'Remove', onPress: () => remove(p.id) },
            ]}
          />
        ))}
        {duplicate && request && dupOpen.length > 0 ? (
          // An open shift for these hours still needs someone: send that one
          // instead of starting a second shift for the same place.
          <View style={{ gap: t.space.sm }}>
            <Notice
              tone="warning"
              text={`Your ${duplicate.roles.join(' or ')} ${dupKind} for ${datesLabel(dupOpen)} still needs someone. Send it to ${names} instead?`}
            />
            <Button label={`Send that job to ${names}`} variant="secondary" onPress={() => void sendThatJob(duplicate)} fullWidth />
          </View>
        ) : duplicate ? (
          <Warning
            text={`You already have a ${dupKind} for ${duplicate.roles.join(' or ')} then.`}
            actions={[{ label: 'View', onPress: () => router.push(`/shift/${duplicate.id}`) }]}
          />
        ) : null}
      </View>

      {/* Pay and people */}
      <View style={{ gap: t.space.md }}>
        <Section label="Pay">
          <TextRow
            label="Pay"
            prefix="£"
            suffix="/ hour"
            value={draft.rate}
            onChangeText={(text) => update({ rate: cleanRate(text) })}
            placeholder="0"
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <StepperRow
            label={days.length > 1 ? 'People needed each day' : 'People needed'}
            value={draft.capacity}
            onChange={(capacity) => update({ capacity })}
            min={1}
            max={5}
          />
        </Section>
        {rate > 0 && rate < NATIONAL_LIVING_WAGE ? (
          <Notice tone="warning" text={`${money(rate)}/h is below the National Living Wage (£12.71).`} />
        ) : null}
        {request && rate >= NATIONAL_LIVING_WAGE && rate < lowest ? (
          <Notice
            tone="warning"
            text={`Below the minimum for ${joinNames(
              people.filter((p) => (p.minRate || 0) > rate).map((p) => `${firstName(p)} (${money(p.minRate!)}/h)`),
            )}.`}
          />
        ) : null}
      </View>

      {/* Note */}
      <Section label="Note">
        {editingNote ? (
          <TextRow
            label="Note to talent"
            value={draft.note}
            onChangeText={(note) => update({ note })}
            multiline
            maxLength={2000}
            autoFocus
            autoCapitalize="sentences"
          />
        ) : (
          <View style={[styles.noteRow, { paddingLeft: t.space.lg, paddingRight: t.space.sm, paddingVertical: t.space.sm, gap: t.space.md }]}>
            <Text variant="body" color={draft.note ? 'text' : 'muted'} style={{ flex: 1 }}>
              {draft.note || 'No note'}
            </Text>
            <TextLink label="Edit" underline={false} accessibilityLabel="Edit note" onPress={() => setEditingNote(true)} />
          </View>
        )}
      </Section>

      {showValidation ? <Notice tone="danger" text={validation} /> : null}
    </Screen>
  );
}

/** A warning line with its text links underneath ("View · Remove"). */
function Warning({ text, actions }: { text: string; actions: { label: string; onPress: () => void }[] }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.xxs }}>
      <Notice tone="warning" text={text} />
      <View style={[styles.links, { gap: t.space.xs, paddingHorizontal: t.space.xs }]}>
        {actions.map((a, i) => (
          <View key={a.label} style={[styles.links, { gap: t.space.xs }]}>
            {i > 0 ? (
              <Text variant="subhead" color="muted" accessibilityElementsHidden importantForAccessibility="no">
                ·
              </Text>
            ) : null}
            <TextLink label={a.label} variant="subhead" onPress={a.onPress} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noteRow: { flexDirection: 'row', alignItems: 'center' },
  links: { flexDirection: 'row', alignItems: 'center' },
});
