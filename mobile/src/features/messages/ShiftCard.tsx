// A booking request, job post or yes, shown as a ticket in the conversation
// (FEATURES.md §7.3.1, web ShiftMessage). Every card for a shift reads its
// current status; only the newest card for that shift carries an action, so
// a thread never offers the same Book twice.
import { router } from 'expo-router';
import { View } from 'react-native';

import {
  bookableDates,
  clockLabel,
  datesLabel,
  firstName,
  hoursLabel,
  hoursOf,
  member,
  money,
  offeredDates,
  responseLabel,
  shiftLabel,
  type Data,
  type Message,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, KeyValue, Text, Ticket, type BadgeTone } from '@/ui';

type Props = {
  data: Data;
  m: Message;
  /** The thread's talent member. */
  talent: string;
  /** This conversation, so compose can come back to it. */
  conversationId: string;
  side: 'talent' | 'venue';
  latest: boolean;
};

export function ShiftCard({ data, m, talent, conversationId, side, latest }: Props) {
  const t = useTheme();
  const s = data.shifts.find((x) => x.id === m.shift);
  if (!s || !s.days.length) return null;
  const venue = member(data, s.venue);
  const person = member(data, talent);
  const first = person ? firstName(person) : 'Someone';
  const venueName = venue?.name ?? 'Another venue';
  const r = data.responses.find((x) => x.shift === s.id && x.talent === talent);
  const b = data.bookings.find((x) => x.shift === s.id && x.talent === talent && !x.cancelled);
  const fromTalent = m.from === talent;
  const dates = fromTalent && r ? offeredDates(s, r) : s.days.map((d) => d.date);
  const perDay = hoursOf(s.days[0]);
  const open = s.status === 'open';

  const status = !r
    ? open
      ? 'Open'
      : s.status === 'filled'
        ? 'Filled'
        : 'Cancelled'
    : r.status === 'invited'
      ? side === 'talent'
        ? 'Waiting for you'
        : `Waiting for ${first}`
      : r.status === 'can-cover'
        ? side === 'venue'
          ? `${first} said yes`
          : `Waiting for ${venueName}`
        : responseLabel(r);
  const canBook = side === 'venue' && r?.status === 'can-cover' && open && bookableDates(data, s, r).length > 0;
  const attention = (side === 'talent' && r?.status === 'invited') || canBook;
  const tone: BadgeTone = r?.status === 'booked' ? 'good' : attention ? 'attention' : 'neutral';

  const head = fromTalent
    ? `${first} said yes`
    : s.mode === 'request'
      ? `Booking request · ${venueName}`
      : `Job post · ${venueName}`;

  const totalHours = perDay * dates.length;
  const when = `${datesLabel(dates)} · ${s.days[0].start}–${s.days[0].end}`;
  const pay = `${money(s.rate)}/hour`;
  const payMore = `About ${money(Math.round(s.rate * totalHours))} in all · ${hoursLabel(totalHours)}`;

  // The first action that applies (§7.3.1).
  let action: { label: string; onPress: () => void; kind: 'button' | 'secondary' | 'link' };
  if (latest && canBook) {
    action = {
      kind: 'button',
      label: `Book ${first}`,
      onPress: () => router.push({ pathname: '/sheet/book-confirm', params: { shiftId: s.id, talentId: talent } }),
    };
  } else if (b) {
    action = { kind: 'link', label: 'View booking', onPress: () => router.push(`/booking/${b.id}`) };
  } else if (latest && side === 'talent' && r?.status === 'invited' && open) {
    action = { kind: 'button', label: 'Answer', onPress: () => router.push(`/shift/${s.id}`) };
  } else if (latest && side === 'venue' && s.mode === 'request' && r?.status === 'declined') {
    // Not waiting on anyone: a secondary button, never a second ink one.
    action = {
      kind: 'secondary',
      label: 'Send new request',
      onPress: () =>
        router.push({ pathname: '/compose', params: { again: s.id, to: talent, from: 'chat', chat: conversationId } }),
    };
  } else {
    action = {
      kind: 'link',
      label: s.mode === 'request' ? 'View request' : 'View job post',
      onPress: () => router.push(`/shift/${s.id}`),
    };
  }

  return (
    <Ticket lit={latest && attention} spiked={r?.status === 'booked'} gap={t.space.md}>
      <View style={{ gap: t.space.sm }}>
        <Text variant="footnote" color="muted" tabular>
          {head} · {clockLabel(m.time)}
        </Text>
        <Badge label={status} tone={tone} />
      </View>
      <Text variant="title3">{shiftLabel(s)}</Text>
      <View style={{ gap: t.space.sm }}>
        <Fact label="When" value={when} more={dates.length > 1 ? `${dates.length} days · same hours` : undefined} />
        <Fact label="Pay" value={pay} more={payMore} />
        {s.note && !fromTalent ? <KeyValue label="Note" value={s.note} /> : null}
      </View>
      <Button
        label={action.label}
        onPress={action.onPress}
        variant={action.kind === 'button' ? 'primary' : action.kind === 'secondary' ? 'secondary' : 'quiet'}
        fullWidth={action.kind !== 'link'}
        style={action.kind === 'link' ? { alignSelf: 'flex-start' } : undefined}
      />
    </Ticket>
  );
}

/** A KeyValue fact with an optional muted line under the value, both read aloud. */
function Fact({ label, value, more }: { label: string; value: string; more?: string }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={[label, value, more].filter(Boolean).join(', ')} style={{ gap: 1 }}>
      <KeyValue label={label} value={value} tabular />
      {more ? (
        <Text variant="footnote" color="muted" tabular style={{ marginLeft: Math.round(72 * t.scale) + t.space.md }}>
          {more}
        </Text>
      ) : null}
    </View>
  );
}
