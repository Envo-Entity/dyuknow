// The talent home: the Shifts tab (§4, web TalentHome in Discovery.tsx).
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { LiveGate, useRefresh } from '@/data';
import {
  activeDays,
  bookingServices,
  offeredDates,
  relativeDay,
  shiftLabel,
  whenLine,
  type Booking,
  type Data,
  type Member,
  type Response,
} from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Disclosure,
  Empty,
  GroupHeading,
  Icon,
  Photo,
  Row,
  Screen,
  Section,
  Text,
  TextLink,
  Ticket,
  type BadgeTone,
} from '@/ui';

import { endedStatus, findMember, talentHome, venueName } from './logic';
import { Group, ShiftCard, TicketWithLink, VenueCard } from './parts';

export function ShiftsScreen() {
  const header = (
    <>
      <Stack.Screen options={{ title: 'Shifts' }} />
      <HeaderActions />
    </>
  );
  return (
    <LiveGate header={header} title="Shifts">
      {({ data, me }) => (
        <>
          {header}
          <Home data={data} me={me} />
        </>
      )}
    </LiveGate>
  );
}

function Home({ data, me }: { data: Data; me: Member }) {
  const home = talentHome(data, me);
  const refresh = useRefresh();

  return (
    <Screen title="Shifts" {...refresh} gap="xxxl">
      {home.upcoming.length > 0 ? (
        <Group title="Upcoming shifts">
          {home.upcoming.map((b) => (
            <UpcomingTicket key={b.id} data={data} b={b} />
          ))}
        </Group>
      ) : null}

      {home.invites.length > 0 ? (
        <Group title="Booking requests">
          {home.invites.map((r) => (
            <ResponseTicket key={r.id} data={data} r={r} lit status="Waiting for you" tone="attention" />
          ))}
        </Group>
      ) : null}

      {home.waiting.length > 0 ? (
        <Group title="Waiting to be booked">
          {home.waiting.map((r) => (
            <ResponseTicket key={r.id} data={data} r={r} status="Waiting" tone="neutral" icon="waiting" />
          ))}
        </Group>
      ) : null}

      <Group title="Open jobs">
        {home.feed.length ? (
          home.feed.map((s) => {
            const free = home.free(s);
            return (
              <ShiftCard
                key={s.id}
                data={data}
                shift={s}
                label={free < s.days.length ? `You can do ${free} of ${s.days.length} days` : undefined}
              />
            );
          })
        ) : (
          <Ticket padding={0}>
            <Empty
              icon="shifts"
              title="No open jobs in your positions right now"
              message="Venues can still book you straight from your profile. Keep your availability up to date."
              action={{ label: 'Update availability', onPress: () => router.navigate('/t/availability') }}
            />
          </Ticket>
        )}
      </Group>

      {home.venues.length > 0 ? <Venues venues={home.venues} /> : null}

      {home.history > 0 ? (
        <Disclosure title="Past and closed" count={home.history}>
          <Section separatorInset={68}>
            {home.pastBookings.map((b) => (
              <PastBookingRow key={b.id} data={data} b={b} />
            ))}
            {home.ended.map((r) => (
              <EndedRow key={r.id} data={data} r={r} />
            ))}
          </Section>
        </Disclosure>
      ) : null}
    </Screen>
  );
}

/** A booking that's coming up: settled, so a plain ticket with the sage "You’re booked". Ink is only for what waits on you. */
function UpcomingTicket({ data, b }: { data: Data; b: Booking }) {
  const t = useTheme();
  const s = data.shifts.find((x) => x.id === b.shift)!;
  const v = findMember(data, s.venue);
  const name = venueName(data, s);
  const first = bookingServices(data, b)[0];
  const line = first
    ? `${relativeDay(first.date, data.now)} · ${first.start}–${first.end}${b.days.length > 1 ? ` · ${b.days.length} days` : ''} · ${shiftLabel(s)}`
    : shiftLabel(s);
  const openVenue = () => router.push({ pathname: '/venue/[id]', params: { id: s.venue } });
  const openBooking = () => router.push({ pathname: '/booking/[id]', params: { id: b.id } });
  const venueLink = `View ${name}’s public profile`;
  const photoW = Math.round(64 * Math.min(t.scale, 1.15));
  return (
    <TicketWithLink label={`You’re booked, ${name}, ${line}`} hint="View booking details" onPress={openBooking} link={{ label: venueLink, onPress: openVenue }}>
      <Ticket onPress={openBooking}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <Pressable onPress={openVenue} hitSlop={8}>
            <Photo uri={v?.photo} name={name} width={photoW} radius={t.radius.sm} accessibilityLabel="" />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: t.space.xs }}>
            <Badge label="You’re booked" tone="good" />
            <TextLink label={name} onPress={openVenue} variant="title3" underline={false} />
            <Text variant="footnote" color="muted" tabular>
              {line}
            </Text>
          </View>
          <Icon name="forward" size={14} weight="semibold" />
        </View>
      </Ticket>
    </TicketWithLink>
  );
}

/** A booking request (lit) or a yes waiting to be booked (quiet). */
function ResponseTicket({
  data,
  r,
  lit,
  status,
  tone,
  icon,
}: {
  data: Data;
  r: Response;
  lit?: boolean;
  status: string;
  tone: BadgeTone;
  icon?: 'waiting';
}) {
  const t = useTheme();
  const s = data.shifts.find((x) => x.id === r.shift)!;
  const v = findMember(data, s.venue);
  const name = venueName(data, s);
  const when = whenLine(data, s, offeredDates(s, r));
  const openVenue = () => router.push({ pathname: '/venue/[id]', params: { id: s.venue } });
  const openShift = () => router.push({ pathname: '/shift/[id]', params: { id: s.id } });
  const photoW = Math.round(56 * Math.min(t.scale, 1.15));
  return (
    <TicketWithLink
      label={`${status}, ${name}, ${shiftLabel(s)}, ${when}`}
      hint="Open the shift"
      onPress={openShift}
      link={{ label: `View ${name}’s public profile`, onPress: openVenue }}
    >
      <Ticket lit={lit} onPress={openShift}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <Pressable onPress={openVenue} hitSlop={8}>
            <Photo uri={v?.photo} name={name} width={photoW} radius={t.radius.sm} accessibilityLabel="" />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
            <TextLink label={name} onPress={openVenue} variant="footnote" color="muted" underline={false} />
            <Text variant="headline" numberOfLines={2}>
              {shiftLabel(s)}
            </Text>
            <Text variant="footnote" color="muted" tabular>
              {when}
            </Text>
            <Badge label={status} tone={tone} icon={icon} style={{ marginTop: t.space.xs }} />
          </View>
          <Icon name="forward" size={14} color="faint" weight="semibold" />
        </View>
      </Ticket>
    </TicketWithLink>
  );
}

/** Every approved venue, hiring first, as a horizontal carousel. */
function Venues({ venues }: { venues: { v: Member; open: number }[] }) {
  const t = useTheme();
  const width = Math.round(176 * Math.min(t.scale, 1.15));
  return (
    <View style={{ gap: t.space.md }}>
      <GroupHeading title="Venues on Dyuknow" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width + t.space.md}
        snapToAlignment="start"
        style={{ marginHorizontal: -gutter, overflow: 'visible' }}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: t.space.md, paddingBottom: t.space.sm, alignItems: 'stretch' }}
        accessibilityLabel="Venues on Dyuknow"
      >
        {venues.map(({ v, open }) => (
          <VenueCard key={v.id} venue={v} openJobs={open} width={width} />
        ))}
      </ScrollView>
    </View>
  );
}

function PastBookingRow({ data, b }: { data: Data; b: Booking }) {
  const s = data.shifts.find((x) => x.id === b.shift)!;
  const v = findMember(data, s.venue);
  const name = venueName(data, s);
  const past = (bookingServices(data, b).at(-1)?.to ?? '') <= data.now;
  const status = b.cancelled ? 'Cancelled' : past ? 'Past' : 'Booked';
  const sub = whenLine(data, s, b.cancelled ? b.days : activeDays(b));
  return (
    <Row
      photo={{ uri: v?.photo, name }}
      title={name}
      subtitle={`${shiftLabel(s)} · ${sub}`}
      trailing={
        <Badge
          label={status}
          tone={status === 'Booked' ? 'good' : 'neutral'}
          icon={status === 'Cancelled' ? 'cancelled' : status === 'Past' ? 'check' : undefined}
        />
      }
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}
      accessibilityLabel={`${name}, ${shiftLabel(s)}, ${sub}, ${status}`}
    />
  );
}

function EndedRow({ data, r }: { data: Data; r: Response }) {
  const s = data.shifts.find((x) => x.id === r.shift)!;
  const v = findMember(data, s.venue);
  const name = venueName(data, s);
  const status = endedStatus(data, r);
  const sub = whenLine(data, s, offeredDates(s, r));
  return (
    <Row
      photo={{ uri: v?.photo, name }}
      title={name}
      subtitle={`${shiftLabel(s)} · ${sub}`}
      trailing={<Badge label={status} icon="cancelled" />}
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
      accessibilityLabel={`${name}, ${shiftLabel(s)}, ${sub}, ${status}`}
    />
  );
}
