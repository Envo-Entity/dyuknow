// Notifications (FEATURES.md §7.6, web Notifications). The server writes the
// wording of every notice; this screen lists them and opens their targets.
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LiveGate, useLive, useRefresh } from '@/data';
import { clockLabel, londonDate, type Data, type Member, type Notice } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Button, Empty, Icon, Screen, Section, Text } from '@/ui';

import { noticeRoute } from './format';

const header = <Stack.Screen options={{ title: 'Notifications' }} />;

export function NotificationsScreen() {
  return (
    <LiveGate approval={false} header={header} loading={{ variant: 'rows', count: 6 }}>
      {({ data, me, side }) => <NotificationsList data={data} me={me} side={side} />}
    </LiveGate>
  );
}

function NotificationsList({ data, me, side }: { data: Data; me: Member; side: 'talent' | 'venue' }) {
  const { readNotice } = useLive();
  const refresh = useRefresh();

  const mine = data.notices.filter((n) => n.to === me.id).sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  const today = londonDate(data.now);
  const groups = [
    { label: 'Today', list: mine.filter((n) => londonDate(n.time) === today) },
    { label: 'Earlier', list: mine.filter((n) => londonDate(n.time) !== today) },
  ].filter((g) => g.list.length);
  const anyUnread = mine.some((n) => !n.read);

  const open = (n: Notice) => {
    void readNotice(n.id);
    const to = noticeRoute(n.target, side);
    if (!to) return;
    // Tab roots: go back to the tabs already underneath and switch tab.
    if (to.tab) router.navigate(to.href);
    else router.push(to.href);
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

  return (
    <>
      {header}
      {toolbar}
      <Screen {...refresh}>
        {groups.length ? (
          groups.map((g) => (
            <Section key={g.label} label={g.label} separatorInset={36}>
              {g.list.map((n) => (
                <NoticeRow key={n.id} n={n} onPress={() => open(n)} />
              ))}
            </Section>
          ))
        ) : (
          <Empty
            icon="bell"
            title="You’re all caught up"
            action={
              side === 'venue'
                ? { label: 'Find people', onPress: () => router.navigate('/v/book') }
                : { label: 'See open jobs', onPress: () => router.navigate('/t/shifts') }
            }
          />
        )}
      </Screen>
    </>
  );
}

/**
 * One notice: unread dot, title, body, "{time} · London". Tapping reads it and
 * opens its target. Not a kit Row: the title and body must wrap in full at
 * larger text sizes, and an unread title is bold.
 */
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
