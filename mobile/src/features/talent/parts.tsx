// Small pieces the talent screens share: the shift and venue cards, a group of
// tickets, the verified line and the screen-reader actions for a ticket that
// holds a second link.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';

import {
  areaOf,
  datesSummary,
  money,
  relativeDay,
  shiftLabel,
  teamOf,
  teamPhoto,
  verifiedDocs,
  type Data,
  type Member,
  type Shift,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, GroupHeading, Icon, Photo, Text, Ticket } from '@/ui';

import { findMember, venueKinds } from './logic';

/** A heading and its tickets. */
export function Group({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <GroupHeading title={title} count={count} />
      {children}
    </View>
  );
}

/** `Verified by Dyuknow · Business registration · Premises licence`. Kit candidate. */
export function VerifiedLine({ m }: { m: Member }) {
  const t = useTheme();
  const docs = verifiedDocs(m);
  if (!docs.length) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs }}>
      <Icon name="verified" size={14} color="sageDot" />
      <Text variant="footnote" color="sageText" style={{ flex: 1 }}>
        Verified by Dyuknow · {docs.join(' · ')}
      </Text>
    </View>
  );
}

/**
 * A tappable ticket that also holds a second link (the venue). Touch keeps
 * both targets; a screen reader gets one element whose activation is the
 * ticket's own action and whose extra action opens the venue. Kit candidate
 * (`Ticket accessibilityActions`).
 */
export function TicketWithLink({
  label,
  hint,
  onPress,
  link,
  children,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  link: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate') onPress();
    else if (e.nativeEvent.actionName === 'link') link.onPress();
  };
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityActions={[
        { name: 'activate', label: hint },
        { name: 'link', label: link.label },
      ]}
      onAccessibilityAction={onAction}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
    </View>
  );
}

/** The when line on a shift card: `{main} · {sub}` or `Tomorrow`, then the hours. */
function cardWhen(data: Data, s: Shift) {
  const first = s.days[0];
  if (!first) return '';
  const head =
    s.days.length > 1
      ? (({ main, sub }) => (sub ? `${main} · ${sub}` : main))(datesSummary(s.days.map((d) => d.date)))
      : relativeDay(first.date, data.now);
  return `${head} · ${first.start}–${first.end}`;
}

/** An open job as a ticket: venue photo (or the team photo), where, when, pay. */
export function ShiftCard({ data, shift, label }: { data: Data; shift: Shift; label?: string }) {
  const t = useTheme();
  const venue = findMember(data, shift.venue);
  const name = venue?.name ?? 'Another venue';
  const area = venue ? areaOf(venue) : '';
  const when = cardWhen(data, shift);
  const multi = shift.days.length > 1;
  const photoW = Math.round(96 * Math.min(t.scale, 1.15));
  return (
    <Ticket
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
      padding={t.space.md}
      accessibilityLabel={[area, label ?? '', name, shiftLabel(shift), when, multi ? `${shift.days.length} days needed` : '', `${money(shift.rate)} per hour`]
        .filter(Boolean)
        .join(', ')}
    >
      <View style={{ flexDirection: 'row', gap: t.space.md }}>
        <Photo
          uri={venue?.photo}
          source={teamPhoto(teamOf(shift.roles))}
          name={name}
          width={photoW}
          radius={t.radius.md}
          accessibilityLabel=""
        />
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          {area ? (
            <Text variant="footnote" color="muted" numberOfLines={1}>
              {area}
            </Text>
          ) : null}
          {label ? <Badge label={label} icon="info" style={{ marginBottom: t.space.xxs }} /> : null}
          <Text variant="title3" numberOfLines={2}>
            {name}
          </Text>
          <Text variant="subhead" weight="600" numberOfLines={2}>
            {shiftLabel(shift)}
          </Text>
          <Text variant="footnote" color="muted" tabular>
            {when}
          </Text>
          {multi ? (
            <Text variant="footnote" color="muted" tabular>
              {shift.days.length} days needed
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: t.space.xs }}>
            <Text variant="headline" tabular style={{ flex: 1 }}>
              {money(shift.rate)}
              <Text variant="subhead" color="muted">
                {' / hour'}
              </Text>
            </Text>
            <Icon name="forward" size={14} color="faint" weight="semibold" />
          </View>
        </View>
      </View>
    </Ticket>
  );
}

/** A venue in the carousel: photo, area, open jobs, name, what it is. */
export function VenueCard({ venue, openJobs, width }: { venue: Member; openJobs: number; width: number }) {
  const t = useTheme();
  const kinds = venueKinds(venue);
  const jobs = openJobs === 1 ? '1 open job' : `${openJobs} open jobs`;
  return (
    <View style={{ width }}>
      <Ticket
        onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}
        padding={t.space.sm + 2}
        accessibilityLabel={[venue.name, areaOf(venue), openJobs > 0 ? jobs : '', kinds, 'See venue'].filter(Boolean).join(', ')}
        style={{ flex: 1 }}
      >
        <Photo uri={venue.photo} name={venue.name} radius={t.radius.md} accessibilityLabel="" />
        <View style={{ gap: t.space.xxs, paddingHorizontal: t.space.xxs, flex: 1 }}>
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {areaOf(venue)}
          </Text>
          <Text variant="title3" numberOfLines={2}>
            {venue.name}
          </Text>
          {kinds ? (
            <Text variant="footnote" color="muted" numberOfLines={2}>
              {kinds}
            </Text>
          ) : null}
          {openJobs > 0 ? <Badge label={jobs} tone="good" style={{ marginTop: t.space.xs }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: t.space.sm }}>
            <Text variant="subhead" weight="600" style={{ flex: 1 }}>
              See venue
            </Text>
            <Icon name="forward" size={13} color="faint" weight="semibold" />
          </View>
        </View>
      </Ticket>
    </View>
  );
}
