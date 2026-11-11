import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LiveGate, useRefresh } from '@/data';
import { activeDays, bookingServices, sentTo, shiftLabel, teamOf, venueSummary, whenLine, type Booking, type Data, type Shift } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Badge, Disclosure, Empty, GroupHeading, Icon, Photo, Row, Screen, Section, Text, Ticket, WaitingForApproval, type IconName } from '@/ui';

const TEAM_ICON: Record<string, IconName> = { Kitchen: 'kitchen', Pastry: 'pastry', Bar: 'bar', Sommelier: 'sommelier', Floor: 'floor' };

const head = (
  <>
    <Stack.Screen options={{ title: 'Bookings' }} />
    <HeaderActions />
  </>
);

/** The venue's Bookings tab (web WorkHub, spec §5). */
export function WorkHub() {
  return (
    // Under the gate only when the venue has no shifts of its own yet.
    <LiveGate header={head} title="Bookings" approval={false}>
      {({ data, me, live }) => <Hub data={data} actor={me.id} approved={live.approved} />}
    </LiveGate>
  );
}

function Hub({ data, actor, approved }: { data: Data; actor: string; approved: boolean }) {
  const refresh = useRefresh();
  const mine = data.shifts.filter((s) => s.venue === actor);
  if (!approved && !mine.length) {
    return (
      <Screen title="Bookings">
        {head}
        <WaitingForApproval />
      </Screen>
    );
  }

  const lastEnd = (b: Booking) => bookingServices(data, b).at(-1)?.to ?? '';
  const bookings = data.bookings.filter((b) => mine.some((s) => s.id === b.shift));
  // Days that have finished and still need their hours confirmed.
  const toConfirm = bookings.filter((b) => !b.cancelled && bookingServices(data, b).some((d) => d.to <= data.now && !b.log[d.date]));
  // A booking shows once: under Needs you when it needs you, otherwise Upcoming or Past (spec §10.11).
  const rest = bookings.filter((b) => !toConfirm.includes(b));
  const coming = rest
    .filter((b) => !b.cancelled && lastEnd(b) > data.now)
    .sort((a, b) => (bookingServices(data, a)[0]?.from ?? '').localeCompare(bookingServices(data, b)[0]?.from ?? ''));
  const pastBookings = rest.filter((b) => b.cancelled || lastEnd(b) <= data.now);
  const open = mine.filter((s) => s.status === 'open').sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  // A yes to book, or a cancelled day to fill: the venue's move.
  const decide = open.filter((s) => venueSummary(data, s).needs);
  const waiting = open.filter((s) => !decide.includes(s));
  const closed = mine.filter((s) => ['closed', 'expired'].includes(s.status) && !bookings.some((b) => b.shift === s.id));
  const history = pastBookings.length + closed.length;
  const nothing = !open.length && !coming.length && !toConfirm.length;

  return (
    <Screen title="Bookings" {...refresh}>
      {head}

      {nothing ? (
        <Empty icon="bookings" title="No bookings yet" action={{ label: 'Find cover', onPress: () => router.navigate('/v/book') }} />
      ) : null}

      {decide.length || toConfirm.length ? (
        <Group label="Needs you" count={decide.length + toConfirm.length}>
          {decide.map((s) => (
            <ShiftTicket key={s.id} data={data} s={s} lit />
          ))}
          {toConfirm.map((b) => (
            <BookingTicket key={b.id} data={data} b={b} lit />
          ))}
        </Group>
      ) : null}

      {coming.length ? (
        <Group label="Upcoming" count={coming.length}>
          {coming.map((b) => (
            <BookingTicket key={b.id} data={data} b={b} />
          ))}
        </Group>
      ) : null}

      {waiting.length ? (
        <Group label="Waiting for replies" count={waiting.length}>
          {waiting.map((s) => (
            <ShiftTicket key={s.id} data={data} s={s} />
          ))}
        </Group>
      ) : null}

      {history > 0 ? (
        <Disclosure title="Past and cancelled" count={history}>
          <Section separatorInset={68}>
            {pastBookings.map((b) => (
              <BookingHistoryRow key={b.id} data={data} b={b} />
            ))}
            {closed.map((s) => (
              <ShiftHistoryRow key={s.id} data={data} s={s} />
            ))}
          </Section>
        </Disclosure>
      ) : null}
    </Screen>
  );
}

function Group({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <GroupHeading title={label} count={count} />
      {children}
    </View>
  );
}

function bookingStatus(data: Data, b: Booking) {
  const past = (bookingServices(data, b).at(-1)?.to ?? '') <= data.now;
  return b.cancelled
    ? { label: 'Cancelled', tone: 'neutral' as const, icon: 'cancelled' as const }
    : past
      ? { label: 'Past', tone: 'neutral' as const, icon: 'worked' as const }
      : { label: 'Booked', tone: 'good' as const, icon: undefined };
}

/** VenueShiftRow as a ticket: the team, positions, who it went to and when, and where it stands. */
function ShiftTicket({ data, s, lit }: { data: Data; s: Shift; lit?: boolean }) {
  const t = useTheme();
  const summary = venueSummary(data, s);
  const team = teamOf(s.roles);
  const sub = `${sentTo(data, s)} · ${whenLine(data, s)}`;
  return (
    <Ticket
      lit={lit}
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
      accessibilityLabel={`${shiftLabel(s)}, ${sub}, ${summary.text}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <View
          style={{
            width: Math.round(40 * t.scale),
            height: Math.round(40 * t.scale),
            borderRadius: t.radius.sm,
            backgroundColor: lit ? 'transparent' : t.c.fill,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name={TEAM_ICON[team] ?? 'kitchen'} size={20} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          <Text variant="headline" numberOfLines={2}>
            {shiftLabel(s)}
          </Text>
          <Text variant="subhead" color="muted" numberOfLines={2} tabular>
            {sub}
          </Text>
        </View>
        <Icon name="forward" size={13} color="faint" weight="semibold" />
      </View>
      <View style={{ alignItems: 'flex-start' }}>
        <Badge label={summary.text} tone={summary.needs ? 'attention' : summary.good ? 'good' : 'neutral'} />
      </View>
    </Ticket>
  );
}

/** BookingRow as a ticket: the talent, positions, the booked days, and its status. */
function BookingTicket({ data, b, lit }: { data: Data; b: Booking; lit?: boolean }) {
  const t = useTheme();
  const s = data.shifts.find((x) => x.id === b.shift);
  if (!s) return null;
  const person = data.members.find((m) => m.id === b.talent);
  const st = bookingStatus(data, b);
  const sub = whenLine(data, s, b.cancelled ? b.days : activeDays(b));
  return (
    <Ticket
      lit={lit}
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}
      accessibilityLabel={`${person?.name ?? 'Someone'}, ${shiftLabel(s)}, ${sub}, ${st.label}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <Photo circle size={Math.round(40 * Math.min(t.scale, 1.1))} uri={person?.photo} name={person?.name} accessibilityLabel="" />
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          <Text variant="title3" numberOfLines={1}>
            {person?.name ?? 'Someone'}
          </Text>
          <Text variant="subhead" color="muted" numberOfLines={2} tabular>
            {`${shiftLabel(s)} · ${sub}`}
          </Text>
        </View>
        <Icon name="forward" size={13} color="faint" weight="semibold" />
      </View>
      <View style={{ alignItems: 'flex-start' }}>
        <Badge label={st.label} tone={st.tone} icon={st.icon} />
      </View>
    </Ticket>
  );
}

function BookingHistoryRow({ data, b }: { data: Data; b: Booking }) {
  const s = data.shifts.find((x) => x.id === b.shift);
  if (!s) return null;
  const person = data.members.find((m) => m.id === b.talent);
  const st = bookingStatus(data, b);
  return (
    <Row
      photo={{ uri: person?.photo, name: person?.name }}
      title={shiftLabel(s)}
      subtitle={`${person?.name ?? 'Someone'} · ${whenLine(data, s, b.cancelled ? b.days : activeDays(b))}`}
      subtitleLines={2}
      subtitleTabular
      trailing={<Badge label={st.label} tone={st.tone} icon={st.icon} />}
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}
    />
  );
}

function ShiftHistoryRow({ data, s }: { data: Data; s: Shift }) {
  const summary = venueSummary(data, s);
  return (
    <Row
      icon={TEAM_ICON[teamOf(s.roles)] ?? 'kitchen'}
      title={shiftLabel(s)}
      subtitle={`${sentTo(data, s)} · ${whenLine(data, s)}`}
      subtitleLines={2}
      subtitleTabular
      trailing={<Badge label={summary.text} tone="neutral" icon={s.status === 'closed' ? 'cancelled' : 'clock'} />}
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
    />
  );
}
