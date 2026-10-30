// The Messages tab for both sides (FEATURES.md §4 "messages", web Messages).
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLive } from '@/data';
import { datesLabel, member, responseLabel, shiftLabel, type Data, type Member } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Avatar, Badge, Empty, ErrorState, Loading, Screen, Section, Text, WaitingForApproval, type BadgeTone } from '@/ui';

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

/** The latest shift card in a conversation: what the pair is talking about. */
function latestShift(data: Data, thread: string) {
  const id = data.messages.findLast((m) => m.thread === thread && m.shift)?.shift;
  return data.shifts.find((s) => s.id === id);
}

function threadRows(data: Data, me: string, side: 'talent' | 'venue', unreadIds: string[]): ThreadRow[] {
  return data.threads
    .filter((t) => (side === 'venue' ? t.venue : t.talent) === me)
    .map((t) => {
      const s = latestShift(data, t.id);
      const r = s && data.responses.find((x) => x.shift === s.id && x.talent === t.talent);
      const attention = side === 'talent' ? r?.status === 'invited' : r?.status === 'can-cover';
      const last = data.messages.findLast((m) => m.thread === t.id);
      return {
        id: t.id,
        other: member(data, side === 'venue' ? t.talent : t.venue),
        about: s ? `${shiftLabel(s)} · ${datesLabel(s.days.map((d) => d.date))}` : 'Message',
        preview: last?.text || 'No messages yet',
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
  const { status, data, me, side, approved, badges, error, reload } = useLive();
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(
    () => (data && me && side ? threadRows(data, me.id, side, badges.unreadConversationIds) : []),
    [data, me, side, badges.unreadConversationIds],
  );

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
      <Stack.Screen options={{ title: 'Messages' }} />
      <HeaderActions />
    </>
  );

  if (!data || !me || !side) {
    return (
      <>
        {header}
        <Screen>
          {status === 'error' ? <ErrorState message={error ?? undefined} onRetry={() => void reload()} /> : <Loading variant="rows" count={5} />}
        </Screen>
      </>
    );
  }

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
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {body}
      </Screen>
    </>
  );
}

/** One conversation: photo, name, what it's about, the last message and its status. */
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
          <Text variant="title3" numberOfLines={1} style={{ flexShrink: 1 }}>
            {row.other.name}
          </Text>
          {row.unread ? <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: t.c.danger }} /> : null}
        </View>
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {row.about}
        </Text>
        <Text variant="subhead" color={row.unread ? 'text' : 'muted'} weight={row.unread ? '600' : undefined} numberOfLines={1}>
          {row.preview}
        </Text>
        {row.status ? <Badge label={row.status} tone={row.tone} style={{ marginTop: t.space.xs }} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'center' },
});
