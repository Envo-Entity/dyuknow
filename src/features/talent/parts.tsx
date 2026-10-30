// Small pieces the talent screens share: the shift and venue cards, section
// headings, the verified line and opening a conversation.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';

import { openConversation, useLive } from '@/data';
import {
  areaOf,
  datesSummary,
  relativeDay,
  shiftLabel,
  teamOf,
  teamPhoto,
  threadBetween,
  verifiedDocs,
  type Data,
  type Member,
  type Shift,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Icon, Photo, Text, Ticket } from '@/ui';

import { findMember, pounds, venueKinds } from './logic';

/** The bundled team tile as a uri the kit's Photo can show. */
export function teamPhotoUri(roles: string[]) {
  return Image.resolveAssetSource(teamPhoto(teamOf(roles)))?.uri ?? null;
}

/** A serif heading over a group of tickets. */
export function GroupHeading({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: t.space.md, paddingHorizontal: t.space.xxs }}>
      <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** A heading and its tickets. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <GroupHeading title={title} />
      {children}
    </View>
  );
}

/** `Verified by Dyuknow · Business registration · Premises licence`. */
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

/** The when line on a shift card: `{main} · {sub}` or `Tomorrow`, then the hours. */
function cardWhen(data: Data, s: Shift) {
  const first = s.days[0];
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
      accessibilityLabel={[name, shiftLabel(shift), when, multi ? `${shift.days.length} days needed` : '', `${pounds(shift.rate)} per hour`, label ?? '']
        .filter(Boolean)
        .join(', ')}
    >
      <View style={{ flexDirection: 'row', gap: t.space.md }}>
        <Photo uri={venue?.photo || teamPhotoUri(shift.roles)} name={name} width={photoW} radius={t.radius.md} accessibilityLabel="" />
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          {area ? (
            <Text variant="footnote" color="muted" numberOfLines={1}>
              {area}
            </Text>
          ) : null}
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
          {label ? <Badge label={label} icon="info" style={{ marginTop: t.space.xs }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: t.space.xs }}>
            <Text variant="headline" tabular style={{ flex: 1 }}>
              {pounds(shift.rate)}
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

/** A plain text link with a 44pt target. */
export function TextLink({
  label,
  onPress,
  variant = 'footnote',
  color = 'muted',
  accessibilityLabel,
  children,
}: {
  label?: string;
  onPress: () => void;
  variant?: 'footnote' | 'subhead' | 'largeTitle';
  color?: 'muted' | 'text';
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => ({ minHeight: variant === 'largeTitle' ? undefined : t.hit * 0.6, justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}
    >
      {children ?? (
        <Text variant={variant} color={color}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Message a venue: push the conversation that exists, or open one first
 * (route contract: open_conversation, then chat/[id]).
 */
export function useMessageVenue() {
  const { data, me, run } = useLive();
  return async (venueId: string) => {
    const existing = data && me ? threadBetween(data, venueId, me.id) : undefined;
    if (existing) {
      router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
      return;
    }
    const r = await run(`open:${venueId}`, () => openConversation(venueId));
    if (r?.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: r.conversation_id } });
  };
}
