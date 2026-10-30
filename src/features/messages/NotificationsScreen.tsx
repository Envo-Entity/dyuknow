// Notifications (FEATURES.md §7.6, web Notifications). The server writes the
// wording of every notice; this screen lists them and opens their targets.
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLive } from '@/data';
import { clockLabel, londonDate, type Notice } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Button, Empty, ErrorState, Icon, Loading, Screen, Section, Text } from '@/ui';

import { noticeRoute } from './format';

export function NotificationsScreen() {
  const { status, data, me, side, error, reload, readNotice } = useLive();
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(() => {
    if (!data || !me) return [];
    const mine = data.notices.filter((n) => n.to === me.id).sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
    const today = londonDate(data.now);
    const now = mine.filter((n) => londonDate(n.time) === today);
    const earlier = mine.filter((n) => londonDate(n.time) !== today);
    return [
      { label: 'Today', list: now },
      { label: 'Earlier', list: earlier },
    ].filter((g) => g.list.length);
  }, [data, me]);
  const anyUnread = groups.some((g) => g.list.some((n) => !n.read));

  const refresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const open = (n: Notice) => {
    void readNotice(n.id);
    const to = noticeRoute(n.target, side);
    if (to) router.push(to);
  };

  const markAll = () => void readNotice();

  const toolbar =
    process.env.EXPO_OS === 'ios' ? (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={markAll} disabled={!anyUnread} accessibilityLabel="Mark all read">
          Mark all read
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    ) : (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <Button label="Mark all read" variant="quiet" onPress={markAll} disabled={!anyUnread} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );

  let body;
  if (!data || !me) {
    body = status === 'error' ? <ErrorState message={error ?? undefined} onRetry={() => void reload()} /> : <Loading variant="rows" count={6} />;
  } else if (!groups.length) {
    body = <Empty icon="bell" title="You’re all caught up" />;
  } else {
    body = groups.map((g) => (
      <Section key={g.label} label={g.label} separatorInset={36}>
        {g.list.map((n) => (
          <NoticeRow key={n.id} n={n} onPress={() => open(n)} />
        ))}
      </Section>
    ));
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      {toolbar}
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {body}
      </Screen>
    </>
  );
}

/** One notice: unread dot, title, body, "{time} · London". Tapping reads it and opens its target. */
function NoticeRow({ n, onPress }: { n: Notice; onPress: () => void }) {
  const t = useTheme();
  const dot = Math.round(8 * t.scale);
  const when = `${clockLabel(n.time)} · London`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[n.read ? null : 'Unread', n.title, n.text, when].filter(Boolean).join('. ')}
      accessibilityHint="View"
      style={({ pressed }) => [
        styles.row,
        {
          gap: t.space.md,
          paddingLeft: t.space.lg - 2,
          paddingRight: t.space.lg,
          paddingVertical: t.space.md,
          minHeight: t.hit,
          backgroundColor: pressed ? t.c.fill : 'transparent',
        },
      ]}
    >
      <View style={{ width: dot + 4, paddingTop: Math.round(7 * t.scale), alignItems: 'center' }}>
        {n.read ? null : <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: t.c.danger }} />}
      </View>
      <View style={[styles.main, { gap: 2 }]}>
        <Text variant="body" weight={n.read ? undefined : '600'}>
          {n.title}
        </Text>
        {n.text ? (
          <Text variant="subhead" color="muted">
            {n.text}
          </Text>
        ) : null}
        <Text variant="footnote" color="faint" tabular style={{ marginTop: 2 }}>
          {when}
        </Text>
      </View>
      <View style={{ alignSelf: 'center' }}>
        <Icon name="forward" size={13} color="faint" weight="semibold" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
});
