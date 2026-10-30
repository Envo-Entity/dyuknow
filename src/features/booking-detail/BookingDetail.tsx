// booking/[id]: the ticket on the rail. Who's coming, when, what each day
// came to, how to get there, and what either side can still do.
// FEATURES.md §7.1 (web BookingDetail in components/preview/ShiftDetail.tsx).
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { openConversation } from '@/data/actions';
import { useLive } from '@/data/store';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, Empty, haptics, Headline, Loading, Row, Screen, Section, Text, Ticket, useToast } from '@/ui';

import { addToCalendar, CALENDAR_COPY } from './calendar';
import { DetailRow } from './DetailRow';
import { bookingView, findBooking } from './model';

/** Back to where the person came from, else their side's home tab (§10.12). */
export function goBack(side: 'talent' | 'venue' | null) {
  if (router.canGoBack()) router.back();
  else router.replace(side === 'venue' ? '/v/book' : '/t/shifts');
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}
function call(phone: string) {
  openUrl(`tel:${phone.replace(/[^\d+]/g, '')}`);
}
function directions(address: string) {
  const q = encodeURIComponent(address);
  openUrl(Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
}

export function BookingDetail({ id }: { id: string }) {
  const { data, me, side, run, reload, readTarget } = useLive();
  const t = useTheme();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [calendar, setCalendar] = useState<'idle' | 'busy' | 'added'>('idle');

  // Opening a booking reads the notices that point at it, quietly.
  useEffect(() => {
    void readTarget(`booking/${id}`);
  }, [id, readTarget]);

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Loading count={2} />
      </Screen>
    );
  }

  const found = findBooking(data, me?.id, id);
  const view = found ? bookingView(data, found) : null;
  if (!found || !view) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ title: '' }} />
        <Empty icon="bookings" title="Booking not found" action={{ label: 'Go back', onPress: () => goBack(side) }} />
      </Screen>
    );
  }
  const { b, s, venueView } = found;

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };
  const openPerson = () =>
    router.push({ pathname: venueView ? '/talent/[id]' : '/venue/[id]', params: { id: view.person.id } });
  const message = async () => {
    if (view.threadId) {
      router.push({ pathname: '/chat/[id]', params: { id: view.threadId } });
      return;
    }
    const r = await run(`open:${view.person.id}`, () => openConversation(view.person.id));
    if (r?.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: r.conversation_id } });
  };
  const toCalendar = async () => {
    if (calendar !== 'idle') return;
    setCalendar('busy');
    const result = await addToCalendar(view.calendarEvents);
    setCalendar(result === 'added' ? 'added' : 'idle');
    if (result === 'added') haptics.commit();
    else haptics.warn();
    toast.show(CALENDAR_COPY[result], { tone: result === 'added' ? 'good' : 'error' });
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: view.headerTitle }} />

      <Ticket lit={view.lit} spiked={view.settled} gap={t.space.sm} accessibilityLabel={`${view.title}. ${view.whenLine}`}>
        <Text variant="footnote" color="muted" tabular>
          {view.whenLine}
        </Text>
        <Headline parts={view.titleParts} variant="title" />
      </Ticket>

      <Section separatorInset={68}>
        <Row
          photo={{ uri: view.person.photo, name: view.person.name }}
          title={view.person.name}
          subtitle={view.personLine || undefined}
          onPress={openPerson}
          accessibilityHint="Opens their profile"
        />
        {venueView && view.phone ? (
          <Row icon="call" title="Call" value={view.phone} valueTabular chevron={false} onPress={() => call(view.phone)} accessibilityLabel={`Call ${view.first}, ${view.phone}`} />
        ) : null}
      </Section>

      {view.cancelledBy ? (
        <Ticket spiked gap={t.space.xs + 2}>
          <Badge label="Cancelled" icon="cancelled" />
          <Text variant="headline">{view.cancelledBy}</Text>
          {view.cancelReason ? (
            <Text variant="callout" color="muted">
              {view.cancelReason}
            </Text>
          ) : null}
        </Ticket>
      ) : null}

      <Section label="Days" footer={view.footer}>
        {view.days.map((d) => (
          <DetailRow
            key={d.date}
            title={d.title}
            detail={d.detail}
            tabular
            trailing={<Badge label={d.badge.label} tone={d.badge.tone} icon={d.badge.icon} />}
            onPress={
              d.confirm
                ? () => router.push({ pathname: '/sheet/confirm-hours', params: { bookingId: b.id, date: d.date } })
                : undefined
            }
            accessibilityLabel={`${d.title}, ${d.detail}, ${d.badge.label}`}
            accessibilityHint={d.confirm ? 'Opens the hours for this day' : undefined}
          />
        ))}
      </Section>

      {view.reopened ? (
        <Ticket lit gap={t.space.md}>
          <Text variant="headline">{view.reopened}</Text>
          <Button label="Find someone" onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })} style={{ alignSelf: 'flex-start' }} />
        </Ticket>
      ) : null}

      {view.showArrival ? (
        <Section label={view.arrivalTitle}>
          {view.address ? <DetailRow labelled title="Address" detail={view.address} /> : null}
          {!venueView && view.address ? (
            <Row icon="directions" title="Directions" chevron={false} onPress={() => directions(view.address)} accessibilityHint="Opens Maps" />
          ) : null}
          {view.contact ? <DetailRow labelled title="On-site contact" detail={view.contact} tabular /> : null}
          {!venueView && view.phone ? (
            <Row icon="call" title="Call" value={view.phone} valueTabular chevron={false} onPress={() => call(view.phone)} accessibilityLabel={`Call ${view.first}, ${view.phone}`} />
          ) : null}
          <DetailRow labelled title="Note" detail={view.note} />
        </Section>
      ) : null}

      <Section>
        <Row icon="message" title={`Message ${view.first}`} onPress={message} />
        {view.showArrival ? (
          <Row
            icon="calendarAdd"
            title="Add to calendar"
            value={calendar === 'added' ? 'Added' : undefined}
            chevron={false}
            disabled={calendar !== 'idle'}
            onPress={toCalendar}
            accessibilityHint="Adds each day to your calendar"
          />
        ) : null}
        {view.bookAgain ? (
          <Row
            icon="add"
            title={`Book ${view.first} again`}
            onPress={() => router.push({ pathname: '/compose', params: view.bookAgain! })}
          />
        ) : null}
      </Section>

      {view.canCancel ? (
        <Section>
          <Row
            title={view.cancelLabel}
            destructive
            chevron={false}
            onPress={() => router.push({ pathname: '/sheet/cancel-days', params: { bookingId: b.id } })}
          />
        </Section>
      ) : null}
    </Screen>
  );
}
