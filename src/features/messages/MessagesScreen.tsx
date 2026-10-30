// The Messages tab for both sides (FEATURES.md §4 "messages", web Messages).
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LiveGate, useLive, useRefresh } from '@/data';
import {
  datesLabel,
  member,
  offeredDates,
  responseLabel,
  shiftLabel,
  type Data,
  type Member,
  type Message,
} from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Avatar, Badge, Empty, Screen, Section, Text, WaitingForApproval, type BadgeTone } from '@/ui';

type ThreadRow = {
  id: string;
  other: Member;
  about: string;
  preview: string;
  status: string;
  tone: BadgeTone;
  unread: boolean;
  order: number;
};

const header = (
  <>
    <Stack.Screen options={{ title: 'Messages' }} />
    <HeaderActions />
  </>
);

/** The latest shift card in a conversation: what the pair is talking about. */
function latestShift(data: Data, thread: string) {
  const id = data.messages.findLast((m) => m.thread === thread && m.shift)?.shift;
  return data.shifts.find((s) => s.id === id);
}

/** A card as the last item previews the card itself: `{positions} · {dates}`. */
function cardPreview(data: Data, m: Message, talent: string) {
  const s = data.shifts.find((x) => x.id === m.shift);
  if (!s || !s.days.length) return null;
  const r = data.responses.find((x) => x.shift === s.id && x.talent === talent);
  const dates = m.from === talent && r ? offeredDates(s, r) : s.days.map((d) => d.date);
  return `${shiftLabel(s)} · ${datesLabel(dates)}`;
}

function threadRows(data: Data, me: string, side: 'talent' | 'venue', unreadIds: string[]): ThreadRow[] {
  return data.threads
    .filter((t) => (side === 'venue' ? t.venue : t.talent) === me)
    .map((t) => {
      const s = latestShift(data, t.id);
      const r = s && data.responses.find((x) => x.shift === s.id && x.talent === t.talent);
      const attention = side === 'talent' ? r?.status === 'invited' : r?.status === 'can-cover';
      const last = data.messages.findLast((m) => m.thread === t.id);
      const preview = (last?.shift ? cardPreview(data, last, t.talent) : null) || last?.text || 'No messages yet';
      return {
        id: t.id,
        other: member(data, side === 'venue' ? t.talent : t.venue),
        about: s ? `${shiftLabel(s)} · ${datesLabel(s.days.map((d) => d.date))}` : 'Message',
        preview,
        status: r ? responseLabel(r) : '',
        tone: r?.status === 'booked' ? 'good' : attention ? 'attention' : 'neutral',
        unread: unreadIds.includes(t.id),
        order: data.messages.findLastIndex((m) => m.thread === t.id),
      } satisfies ThreadRow;
    })
    .filter((row) => !!row.other)
    .sort((a, b) => b.order - a.order);
}

export function MessagesScreen() {
  // "Under the gate when there are no conversations": the list decides.
  return (
    <LiveGate approval={false} header={header} title="Messages" loading={{ variant: 'rows', count: 5 }}>
      {({ data, me, side }) => <MessagesList data={data} me={me} side={side} />}
    </LiveGate>
  );
}

function MessagesList({ data, me, side }: { data: Data; me: Member; side: 'talent' | 'venue' }) {
  const { approved, badges } = useLive();
  const refresh = useRefresh();
  const rows = threadRows(data, me.id, side, badges.unreadConversationIds);

  let body;
  if (rows.length) {
    body = (
      <Section separatorInset={84}>
        {rows.map((row) => (
          <ThreadItem key={row.id} row={row} />
        ))}
      </Section>
    );
  } else if (!approved) {
    body = <WaitingForApproval />;
  } else {
    body = (
      <Empty
        icon="messages"
        title="No conversations yet"
        action={
          side === 'venue'
            ? { label: 'Find people', onPress: () => router.navigate('/v/book') }
            : { label: 'See open jobs', onPress: () => router.navigate('/t/shifts') }
        }
      />
    );
  }

  return (
    <>
      {header}
      <Screen title="Messages" {...refresh}>
        {body}
      </Screen>
    </>
  );
}

/**
 * One conversation: photo, name, what it's about, the last message and its
 * status. Not a kit Row: it carries three lines and a badge, all of which
 * wrap at larger text sizes.
 */
function ThreadItem({ row }: { row: ThreadRow }) {
  const t = useTheme();
  const spoken = [
    row.unread ? 'New' : null,
    `Open conversation with ${row.other.name}`,
    row.about,
    row.preview,
    row.status || null,
  ]
    .filter(Boolean)
    .join('. ');
  const dot = Math.round(9 * t.scale);

  return (
    <Pressable
      onPress={() => router.push(`/chat/${row.id}`)}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => [
        styles.row,
        {
          gap: t.space.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          minHeight: t.hit,
          backgroundColor: pressed ? t.c.fill : 'transparent',
        },
      ]}
    >
      <Avatar uri={row.other.photo} name={row.other.name} size={56} accessibilityLabel="" />
      <View style={[styles.main, { gap: 2 }]}>
        <View style={[styles.line, { gap: t.space.sm }]}>
          <Text variant="title3" numberOfLines={2} style={{ flexShrink: 1 }}>
            {row.other.name}
          </Text>
          {row.unread ? <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: t.c.danger }} /> : null}
        </View>
        <Text variant="footnote" color="muted" tabular numberOfLines={2}>
          {row.about}
        </Text>
        <Text variant="subhead" color={row.unread ? 'text' : 'muted'} weight={row.unread ? '600' : undefined} numberOfLines={2}>
          {row.preview}
        </Text>
        {row.status ? (
          <View style={{ marginTop: t.space.xs, alignSelf: 'flex-start' }}>
            <Badge label={row.status} tone={row.tone} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'center' },
});
