// The talent home: the Shifts tab (§4, web TalentHome in Discovery.tsx).
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useLive } from '@/data';
import {
  activeDays,
  bookingServices,
  offeredDates,
  relativeDay,
  shiftLabel,
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
  Empty,
  ErrorState,
  Icon,
  Loading,
  Photo,
  Row,
  Screen,
  Section,
  Text,
  Ticket,
  WaitingForApproval,
  type BadgeTone,
} from '@/ui';

import { endedStatus, findMember, talentHome, venueName, whenLine } from './logic';
import { Group, GroupHeading, ShiftCard, TextLink, VenueCard } from './parts';

export function ShiftsScreen() {
  const { status, data, me, approved, error, reload } = useLive();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <>
      <Stack.Screen options={{ title: 'Shifts' }} />
      <HeaderActions />
    </>
  );

  if (!data || !me) {
    return (
      <>
        {header}
        <Screen>
          {status === 'error' ? (
            <ErrorState message={error ?? 'Couldn’t load Dyuknow.'} onRetry={() => void reload()} />
          ) : (
            <Loading count={3} />
          )}
        </Screen>
      </>
    );
  }

  if (!approved) {
    return (
      <>
        {header}
        <Screen onRefresh={refresh} refreshing={refreshing}>
          <WaitingForApproval />
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Home data={data} me={me} refreshing={refreshing} onRefresh={refresh} />
    </>
  );
}

function Home({ data, me, refreshing, onRefresh }: { data: Data; me: Member; refreshing: boolean; onRefresh: () => void }) {
  const t = useTheme();
  const home = talentHome(data, me);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} gap="xxxl">
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
          <Ticket spiked padding={0}>
            <Empty
              icon="shifts"
              title="No open jobs in your positions right now"
              message="Venues can still book you straight from your profile. Keep your availability up to date."
            />
          </Ticket>
        )}
      </Group>

      {home.venues.length > 0 ? <Venues venues={home.venues} /> : null}

      {home.history > 0 ? (
        <View style={{ gap: t.space.md }}>
          <HistoryToggle count={home.history} open={historyOpen} onToggle={() => setHistoryOpen((o) => !o)} />
          {historyOpen ? (
            <Animated.View entering={t.reduceMotion ? undefined : FadeIn.duration(t.motion.normal)} exiting={t.reduceMotion ? undefined : FadeOut.duration(t.motion.fast)}>
              <Section separatorInset={68}>
                {home.pastBookings.map((b) => (
                  <PastBookingRow key={b.id} data={data} b={b} />
                ))}
                {home.ended.map((r) => (
                  <EndedRow key={r.id} data={data} r={r} />
                ))}
              </Section>
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

/** A booking that's coming up: the lit ticket with the venue and the first day. */
function UpcomingTicket({ data, b }: { data: Data; b: Booking }) {
  const t = useTheme();
  const s = data.shifts.find((x) => x.id === b.shift)!;
  const v = findMember(data, s.venue);
  const name = venueName(data, s);
  const first = bookingServices(data, b)[0];
  const line = `${relativeDay(first.date, data.now)} · ${first.start}–${first.end}${b.days.length > 1 ? ` · ${b.days.length} days` : ''} · ${shiftLabel(s)}`;
  const openVenue = () => router.push({ pathname: '/venue/[id]', params: { id: s.venue } });
  const photoW = Math.round(64 * Math.min(t.scale, 1.15));
  return (
    <Ticket
      lit
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}
      accessibilityLabel={`You’re booked, ${name}, ${line}`}
      accessibilityHint="View booking details"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <Pressable onPress={openVenue} accessibilityRole="link" accessibilityLabel={`View ${name}’s public profile`}>
          <Photo uri={v?.photo} name={name} width={photoW} radius={t.radius.sm} accessibilityLabel="" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xs }}>
          <Badge label="You’re booked" tone="good" />
          <TextLink onPress={openVenue} accessibilityLabel={`View ${name}’s public profile`}>
            <Text variant="title3" numberOfLines={2}>
              {name}
            </Text>
          </TextLink>
          <Text variant="footnote" color="muted" tabular>
            {line}
          </Text>
        </View>
        <Icon name="forward" size={14} weight="semibold" accessibilityLabel="View booking details" />
      </View>
    </Ticket>
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
  const photoW = Math.round(56 * Math.min(t.scale, 1.15));
  return (
    <Ticket
      lit={lit}
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
      accessibilityLabel={`${status}, ${name}, ${shiftLabel(s)}, ${when}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <Pressable onPress={openVenue} accessibilityRole="link" accessibilityLabel={`View ${name}’s public profile`}>
          <Photo uri={v?.photo} name={name} width={photoW} radius={t.radius.sm} accessibilityLabel="" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          <TextLink onPress={openVenue} accessibilityLabel={`View ${name}’s public profile`}>
            <Text variant="footnote" color="muted" numberOfLines={1}>
              {name}
            </Text>
          </TextLink>
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

function HistoryToggle({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  const t = useTheme();
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '90deg' : '0deg', { duration: t.reduceMotion ? 0 : t.motion.fast }) }],
  }));
  const title = `Past and closed (${count})`;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => ({ minHeight: t.hit, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <GroupHeading
        title={title}
        trailing={
          <Animated.View style={chevron}>
            <Icon name="forward" size={14} color="muted" weight="semibold" />
          </Animated.View>
        }
      />
    </Pressable>
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
