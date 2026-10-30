import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { LiveGate, sendToMore, useLive, useMessage, useRefresh } from '@/data';
import {
  activeDays,
  areaOf,
  availableDates,
  bookableDates,
  coverage,
  datesLabel,
  daysPhrase,
  declinedByAll,
  endedLabel,
  firstName,
  joinNames,
  money,
  offeredDates,
  openDates,
  people,
  serviceLabel,
  shiftLabel,
  shortDay,
  venueSummary,
  whenLine,
  type Data,
  type Member,
  type Response,
  type Shift,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, Empty, GroupHeading, Row, Screen, Section, Text, Ticket, type BadgeTone } from '@/ui';

import { ResponseCard } from './ResponseCard';
import { ShiftMenu } from './ShiftMenu';

const ENDED = ['declined', 'withdrawn', 'lapsed', 'not-selected'];

/** First name of anyone in the snapshot, or "Someone". */
function nameOf(data: Data, id: string) {
  const m = data.members.find((x) => x.id === id);
  return m ? firstName(m) : 'Someone';
}

/** The venue's view of a shift (spec §6.2). Read-only when the shift isn't theirs. */
export function VenueShift({ id }: { id: string }) {
  return (
    <LiveGate header={<Stack.Screen options={{ title: '' }} />} approval={false} loading={{ count: 2 }}>
      {({ data, me, side }) => {
        const s = data.shifts.find((x) => x.id === id);
        if (!s) {
          return (
            <Screen>
              <Stack.Screen options={{ title: '' }} />
              <Empty
                title="Shift not found"
                action={{ label: 'Go home', onPress: () => router.dismissTo(side === 'venue' ? '/v/book' : '/t/shifts') }}
              />
            </Screen>
          );
        }
        return <VenueShiftBody data={data} s={s} readOnly={s.venue !== me.id} />;
      }}
    </LiveGate>
  );
}

function VenueShiftBody({ data, s, readOnly }: { data: Data; s: Shift; readOnly: boolean }) {
  const t = useTheme();
  const { run } = useLive();
  const refresh = useRefresh();
  const message = useMessage();
  const person = (tid: string) => data.members.find((m) => m.id === tid);

  const multi = s.days.length > 1;
  const open = s.status === 'open';
  const owned = !readOnly;
  const responses = data.responses.filter((r) => r.shift === s.id);
  const canCover = responses.filter((r) => r.status === 'can-cover');
  const everyDay = canCover.filter((r) => offeredDates(s, r).length === s.days.length);
  const someDays = canCover.filter((r) => !everyDay.includes(r));
  const invited = responses.filter((r) => r.status === 'invited');
  const ended = responses.filter((r) => ENDED.includes(r.status));
  const bookings = data.bookings.filter((b) => b.shift === s.id);
  const c = coverage(data, s);
  const summary = venueSummary(data, s);
  const anyBookableYes = responses.some((r) => ['can-cover', 'booked'].includes(r.status) && bookableDates(data, s, r).length > 0);
  // People whose yes ended because the shift filled, who could take a day
  // that reopened: the venue can ask them again with one tap.
  const earlier = open
    ? ended.filter(
        (r) =>
          r.status === 'not-selected' &&
          (r.endReason ?? 'filled') === 'filled' &&
          person(r.talent)?.approved !== false &&
          availableDates(data, r.talent, s).length > 0,
      )
    : [];
  const venueName = person(s.venue)?.name;
  const allDeclined = declinedByAll(data, s);

  const askAgain = (tid: string) =>
    run(`ask-again:${s.id}:${tid}`, (ref) => sendToMore(s.id, [tid], ref), {
      args: { shift: s.id, to: [tid] },
      success: `Sent to ${nameOf(data, tid)}.`,
    });
  const book = (tid: string, dates?: string[]) =>
    router.push({
      pathname: '/sheet/book-confirm',
      params: dates?.length ? { shiftId: s.id, talentId: tid, dates: dates.join(',') } : { shiftId: s.id, talentId: tid },
    });
  const sendMore = () => router.push({ pathname: '/sheet/send-more', params: { shiftId: s.id } });
  const closeShift = () => router.push({ pathname: '/sheet/close-shift', params: { shiftId: s.id } });
  const profile = (tid: string) => router.push({ pathname: '/talent/[id]', params: { id: tid } });

  const endedText = (r: Response) =>
    earlier.includes(r)
      ? 'Said yes earlier'
      : (endedLabel(r, venueName) ??
        ({ declined: 'Declined', withdrawn: 'Withdrew', lapsed: 'Booked elsewhere', 'not-selected': 'Filled by someone else' } as Record<string, string>)[
          r.status
        ]);

  // ---- Header status: a badge for where it stands, and the venue's one line.
  const showStatus = responses.length > 0 || bookings.length > 0 || !open;
  const badge: { label: string; tone: BadgeTone; icon?: 'cancelled' | 'clock' } = open
    ? summary.needs
      ? { label: 'Needs you', tone: 'attention' }
      : { label: 'Open', tone: 'neutral', icon: 'clock' }
    : s.status === 'filled'
      ? { label: summary.text, tone: 'good' }
      : s.status === 'expired'
        ? { label: summary.text, tone: 'neutral', icon: 'clock' }
        : { label: summary.text, tone: 'neutral', icon: 'cancelled' };

  const meta = `${whenLine(data, s)} · ${money(s.rate)}/h · ${people(s.capacity)}${multi ? ' each day' : ''}`;

  const saidYesTitle = multi && someDays.length && everyDay.length ? 'Can do every day' : multi && someDays.length ? 'Can do some days' : 'Said yes';
  const firstList = everyDay.length ? everyDay : someDays;

  const others: { r: Response; status: string }[] = [
    ...invited.map((r) => ({ r, status: 'No reply yet' })),
    ...ended.map((r) => ({ r, status: endedText(r) ?? 'Ended' })),
  ];
  const othersTitle = canCover.length || bookings.length ? 'Others' : s.mode === 'request' ? 'Sent to' : 'Others';

  return (
    <Screen {...refresh}>
      {/* The eyebrow and title live in the content; the bar stays clear. */}
      <Stack.Screen options={{ title: '' }} />
      {owned && open ? (
        <ShiftMenu closeLabel={s.mode === 'request' ? 'Cancel request' : 'Remove job post'} onSendMore={sendMore} onClose={closeShift} />
      ) : null}

      {/* Header */}
      <View style={{ gap: t.space.sm }}>
        <Text variant="label" color="muted" style={{ textTransform: 'uppercase' }}>
          {s.mode === 'request' ? 'Booking request' : 'Job post'}
        </Text>
        <Text variant="largeTitle" accessibilityRole="header">
          {shiftLabel(s)}
        </Text>
        <Text variant="subhead" color="muted" tabular>
          {meta}
        </Text>
        {showStatus ? (
          <View style={{ gap: t.space.xs, alignItems: 'flex-start', marginTop: t.space.xs }}>
            <Badge label={badge.label} tone={badge.tone} icon={badge.icon} />
            {open && summary.text ? (
              <Text variant="callout" color={summary.good ? 'sageText' : 'text'}>
                {summary.text}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Day tracker */}
      {multi ? (
        <View style={{ gap: t.space.md }}>
          {s.days.map((d) => {
            const here = c[d.date] ?? [];
            const left = s.capacity - here.length;
            const can = responses.filter(
              (r) => ['can-cover', 'booked'].includes(r.status) && bookableDates(data, s, r).includes(d.date),
            );
            const names = here.map((tid) => nameOf(data, tid)).join(', ');
            const label = here.length
              ? `Booked · ${names}${left > 0 ? ` · ${left} more needed` : ''}`
              : s.capacity > 1
                ? `Open · ${s.capacity} needed`
                : 'Open';
            const lit = owned && open && left > 0 && can.length > 0;
            const canLine = can
              .map((r) => {
                const o = offeredDates(s, r);
                const which = o.length === s.days.length || o.length === 1 ? daysPhrase(o, s.days.length) : o.map(shortDay).join(', ');
                return `${nameOf(data, r.talent)} (${which})`;
              })
              .join(', ');
            return (
              <Ticket key={d.date} lit={lit} spiked={left <= 0} gap={t.space.sm}>
                <Text variant="headline" tabular>
                  {serviceLabel(d)}
                </Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <Badge label={label} tone={left <= 0 ? 'good' : 'neutral'} icon={left <= 0 ? 'check' : undefined} />
                </View>
                {left > 0 ? (
                  can.length ? (
                    <>
                      <Text variant="footnote" color="muted">
                        {`${can.length} can do it: ${canLine}`}
                      </Text>
                      {owned ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                          {can.map((r) => (
                            <Button
                              key={r.id}
                              variant="secondary"
                              label={`Book ${nameOf(data, r.talent)}`}
                              accessibilityHint={`Books them for ${serviceLabel(d)}`}
                              onPress={() => book(r.talent, [d.date])}
                            />
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text variant="footnote" color="muted">
                      No one yet.
                    </Text>
                  )
                ) : null}
              </Ticket>
            );
          })}
        </View>
      ) : null}

      {/* Booked */}
      {bookings.length > 0 ? (
        <Section label="Booked" separatorInset={68}>
          {bookings.map((b) => {
            const m = person(b.talent);
            const br = responses.find((r) => r.talent === b.talent);
            const more = br && !b.cancelled ? bookableDates(data, s, br) : [];
            return (
              <Row
                key={b.id}
                photo={{ uri: m?.photo, name: m?.name }}
                title={m?.name ?? 'Someone'}
                titleSerif
                subtitle={`${whenLine(data, s, b.cancelled ? b.days : activeDays(b))}${more.length ? ` · can also do ${more.map(shortDay).join(', ')}` : ''}`}
                subtitleLines={2}
                subtitleTabular
                trailing={<Badge label={b.cancelled ? 'Cancelled' : 'Booked'} tone={b.cancelled ? 'neutral' : 'good'} icon={b.cancelled ? 'cancelled' : undefined} />}
                onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}
              />
            );
          })}
        </Section>
      ) : null}

      {/* Said yes */}
      {canCover.length > 0 ? (
        readOnly ? (
          <Section label={saidYesTitle}>
            {firstList.map((r) => (
              <Row key={r.id} title={person(r.talent)?.name ?? 'Someone'} titleSerif />
            ))}
          </Section>
        ) : (
          <View style={{ gap: t.space.md }}>
            <GroupHeading title={saidYesTitle} />
            {firstList.map((r) => (
              <ResponseCard key={r.id} s={s} r={r} />
            ))}
          </View>
        )
      ) : null}
      {everyDay.length > 0 && someDays.length > 0 ? (
        readOnly ? (
          <Section label="Can do some days">
            {someDays.map((r) => (
              <Row key={r.id} title={person(r.talent)?.name ?? 'Someone'} titleSerif />
            ))}
          </Section>
        ) : (
          <View style={{ gap: t.space.md }}>
            <GroupHeading title="Can do some days" />
            {someDays.map((r) => (
              <ResponseCard key={r.id} s={s} r={r} />
            ))}
          </View>
        )
      ) : null}

      {/* Everyone declined */}
      {owned && s.mode === 'request' && s.status === 'closed' && allDeclined ? (
        <Ticket gap={t.space.md}>
          <Text variant="headline">
            {invited.length + ended.length > 1 || !ended[0] ? 'Everyone declined.' : `${nameOf(data, ended[0].talent)} declined.`}
          </Text>
          <View style={{ alignItems: 'flex-start' }}>
            <Button label="Send new request" variant="secondary" onPress={() => router.push({ pathname: '/compose', params: { again: s.id } })} />
          </View>
        </Ticket>
      ) : null}

      {/* No one to book yet */}
      {open && owned && !anyBookableYes ? (
        <Ticket gap={t.space.md}>
          <Text variant="headline">
            {bookings.length > 0 ? `Find someone for ${datesLabel(openDates(data, s))}` : 'No replies yet.'}
          </Text>
          {earlier.length > 0 ? (
            <Text variant="subhead" color="muted">
              {`${joinNames(earlier.map((r) => nameOf(data, r.talent)))} said yes before it filled. Ask again and they can accept in one tap.`}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
            {earlier.map((r) => (
              <Button key={r.talent} label={`Ask ${nameOf(data, r.talent)} again`} variant="secondary" onPress={() => void askAgain(r.talent)} />
            ))}
            <Button label="Send to more people" variant="secondary" onPress={sendMore} />
          </View>
        </Ticket>
      ) : null}

      {/* Others / Sent to */}
      {others.length > 0 ? (
        <View style={{ gap: t.space.md }}>
          <GroupHeading title={othersTitle} />
          {others.map(({ r, status }) => {
            const m = person(r.talent);
            const newRequest = owned && status === 'Declined' && s.mode === 'request' && !allDeclined;
            const again = owned && status === 'Said yes earlier';
            return (
              <Ticket key={r.id} padding={0} gap={0}>
                <PersonHead m={m} status={status} onPress={m ? () => profile(m.id) : undefined} />
                {owned ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.space.lg, paddingBottom: t.space.lg }}>
                    {newRequest ? (
                      <Button label="New request" variant="secondary" onPress={() => router.push({ pathname: '/compose', params: { again: s.id, to: r.talent } })} />
                    ) : null}
                    {again ? <Button label="Ask again" variant="secondary" onPress={() => void askAgain(r.talent)} /> : null}
                    <Button
                      label="Message"
                      variant="secondary"
                      accessibilityLabel={`Message ${nameOf(data, r.talent)}`}
                      onPress={() => void message(r.talent)}
                    />
                  </View>
                ) : null}
              </Ticket>
            );
          })}
        </View>
      ) : null}

      {/* Note */}
      <Section label="Note">
        <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md }}>
          <Text variant="body" color={s.note ? 'text' : 'muted'}>
            {s.note || 'No note.'}
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

/** Photo, name, positions · area and where their answer stands. */
function PersonHead({ m, status, onPress }: { m: Member | undefined; status: string; onPress?: () => void }) {
  const facts = m ? [m.roles.join(' · '), areaOf(m)].filter(Boolean).join(' · ') : '';
  const tone: BadgeTone = status === 'Said yes earlier' ? 'attention' : 'neutral';
  return (
    <Row
      photo={{ uri: m?.photo, name: m?.name }}
      title={m?.name ?? 'Someone'}
      titleSerif
      subtitle={facts || undefined}
      subtitleLines={2}
      trailing={<Badge label={status} tone={tone} icon={status === 'No reply yet' ? 'waiting' : undefined} />}
      onPress={onPress}
      chevron={false}
      accessibilityLabel={[m?.name ?? 'Someone', facts, status].filter(Boolean).join(', ')}
      accessibilityHint={onPress ? 'Opens their profile' : undefined}
    />
  );
}
