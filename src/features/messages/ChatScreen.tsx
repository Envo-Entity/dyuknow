// One conversation between a venue and a talent member (FEATURES.md §7.3,
// web Thread + Conversation).
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveGate, readDraft, sendMessage, useLive, writeDraft } from '@/data';
import {
  areaOf,
  clockLabel,
  firstName,
  londonDate,
  member,
  money,
  relativeDay,
  teamOf,
  type Data,
  type Member,
  type Message,
} from '@/domain';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Avatar, Button, Empty, IconButton, KeyboardFooter, LitContext, Screen, Text, useKeyboardOverlap } from '@/ui';

import { thousands } from './format';
import { ShiftCard } from './ShiftCard';

/** The server refuses longer messages (`Keep messages under 2,000 characters.`). */
const MAX_LENGTH = 2000;
/** The counter shows from here. */
const COUNT_FROM = 1800;

type Pending = { id: string; text: string; time: string };
type Item =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; m: Message; latest: boolean; joined: boolean }
  | { kind: 'pending'; key: string; p: Pending; joined: boolean };

export function ChatScreen({ id }: { id: string }) {
  return (
    <LiveGate approval={false} header={<Stack.Screen options={{ title: '' }} />} loading={{ count: 2 }}>
      {({ data, me, side }) => {
        const thread = data.threads.find((t) => t.id === id);
        const otherId = thread && (thread.venue === me.id ? thread.talent : thread.talent === me.id ? thread.venue : undefined);
        const other = otherId ? member(data, otherId) : undefined;
        if (!thread || !other) {
          return (
            <Screen scroll={false}>
              <Stack.Screen options={{ title: '' }} />
              <Empty
                icon="messages"
                title="Conversation not found"
                action={{
                  label: 'Back to messages',
                  onPress: () => (router.canGoBack() ? router.back() : router.navigate(side === 'venue' ? '/v/messages' : '/t/messages')),
                }}
              />
            </Screen>
          );
        }
        return <Conversation key={id} id={id} data={data} me={me} side={side} other={other} talent={thread.talent} />;
      }}
    </LiveGate>
  );
}

function Conversation({
  id,
  data,
  me,
  side,
  other,
  talent,
}: {
  id: string;
  data: Data;
  me: Member;
  side: 'talent' | 'venue';
  other: Member;
  talent: string;
}) {
  const t = useTheme();
  const { runResult, readChat } = useLive();
  const [text, setText] = useState(() => readDraft(me.id, id));
  const [pending, setPending] = useState<Pending[]>([]);
  const textRef = useRef(text);

  const messages = useMemo(() => data.messages.filter((m) => m.thread === id), [data.messages, id]);
  const lastId = messages.at(-1)?.id;

  // Reading: on open, and whenever the newest message changes. Quiet.
  useEffect(() => {
    void readChat(id);
  }, [id, lastId, readChat]);

  const items = useMemo(() => buildItems(messages, pending, data.now, me.id), [messages, pending, data.now, me.id]);

  const change = (value: string) => {
    textRef.current = value;
    setText(value);
    writeDraft(me.id, id, value);
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const p: Pending = { id: `pending-${Date.now()}`, text: body, time: new Date().toISOString() };
    change('');
    setPending((list) => [...list, p]);
    // The same text retried reuses its client_ref, so a lost reply never sends twice.
    // No toast on success (§7.3); a refusal still toasts.
    const result = await runResult(`send:${id}:${body}`, (ref) => sendMessage(me.id, id, body, ref), { args: body, quiet: true });
    setPending((list) => list.filter((x) => x.id !== p.id));
    if (!result.ok) {
      // A second tap on text already being sent: the first is still going.
      if (result.skipped) return;
      change(textRef.current ? `${body}\n${textRef.current}` : body);
    } else if (textRef.current) {
      // sendMessage cleared the stored draft; keep what was typed since.
      writeDraft(me.id, id, textRef.current);
    }
  };

  const openProfile = () => router.push(side === 'venue' ? `/talent/${other.id}` : `/venue/${other.id}`);
  const canSend = text.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: other.name,
          headerTitle: () => (
            <Pressable
              onPress={openProfile}
              accessibilityRole="button"
              accessibilityLabel={other.name}
              accessibilityHint={side === 'venue' ? 'Opens their profile' : 'Opens the venue'}
              hitSlop={8}
              style={[styles.title, { gap: t.space.sm, minHeight: t.hit }]}
            >
              <Avatar uri={other.photo} name={other.name} size={28} accessibilityLabel="" />
              <Text variant="title3" numberOfLines={1} style={{ flexShrink: 1 }}>
                {other.name}
              </Text>
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: t.c.page }}>
        <Pinned other={other} side={side} conversationId={id} />

        {items.length ? (
          <FlatList
            inverted
            data={items}
            keyExtractor={(item) => item.key}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: t.space.lg }}
            // Inverted: the header sits at the bottom, under the newest message.
            ListHeaderComponent={<KeyboardGap />}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Conversation messages"
            renderItem={({ item }) => {
              if (item.kind === 'day') return <DayLine label={item.label} />;
              if (item.kind === 'pending')
                return <Bubble mine name="You" text={item.p.text} time="Sending…" joined={item.joined} sending />;
              const m = item.m;
              if (m.shift)
                return (
                  <View style={{ marginTop: t.space.md }}>
                    <ShiftCard data={data} m={m} talent={talent} conversationId={id} side={side} latest={item.latest} />
                  </View>
                );
              if (m.system) return <EventLine text={m.text} />;
              const mine = m.from === me.id;
              const name = mine ? 'You' : (member(data, m.from)?.name ?? other.name);
              return <Bubble mine={mine} name={name} text={m.text} time={clockLabel(m.time)} joined={item.joined} />;
            }}
          />
        ) : (
          <View style={[styles.center, { padding: t.space.xxl }]}>
            <Text variant="callout" color="muted" center>
              No messages yet.
            </Text>
          </View>
        )}

        <KeyboardFooter>
          <Composer text={text} onChange={change} canSend={canSend} onSend={() => void send()} />
        </KeyboardFooter>
      </View>
    </>
  );
}

/**
 * Chronological items (day lines, messages, pending sends), newest first for
 * the inverted list. `joined` = same sender as the item just above it.
 */
function buildItems(messages: Message[], pending: Pending[], now: string, meId: string): Item[] {
  const out: Item[] = [];
  let day = '';
  let prevFrom: string | null = null;
  const lastCard = new Map<string, string>();
  for (const m of messages) if (m.shift) lastCard.set(m.shift, m.id);
  const dayLine = (iso: string) => {
    const d = londonDate(iso);
    if (d !== day) {
      day = d;
      prevFrom = null;
      out.push({ kind: 'day', key: `day-${d}`, label: relativeDay(d, now) });
    }
  };
  for (const m of messages) {
    dayLine(m.time);
    const from = m.shift || m.system ? null : m.from;
    out.push({ kind: 'message', key: m.id, m, latest: !!m.shift && lastCard.get(m.shift) === m.id, joined: !!from && from === prevFrom });
    prevFrom = from;
  }
  for (const p of pending) {
    dayLine(p.time);
    out.push({ kind: 'pending', key: p.id, p, joined: prevFrom === meId });
    prevFrom = meId;
  }
  return out.reverse();
}

/** Under the header: who this is, and (for venues) the way to book them. */
function Pinned({ other, side, conversationId }: { other: Member; side: 'talent' | 'venue'; conversationId: string }) {
  const t = useTheme();
  const head =
    side === 'venue'
      ? `${firstName(other)} · ${other.minRate ? `from ${money(other.minRate)}/h` : 'no minimum set'}`
      : [other.name, areaOf(other)].filter(Boolean).join(' · ');
  const sub =
    side === 'venue'
      ? other.roles.length
        ? other.roles.join(' · ')
        : other.bio
      : // Talent view: the venue's kinds of place, else its bio (§7.3).
        other.venue?.types.length
        ? other.venue.types.join(' · ')
        : other.bio.trim();
  return (
    <View
      style={{
        paddingHorizontal: gutter,
        paddingVertical: t.space.md,
        gap: t.space.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.c.border,
        backgroundColor: t.c.page,
      }}
    >
      <View accessible style={{ gap: 2 }}>
        <Text variant="subhead" weight="600" tabular>
          {head}
        </Text>
        {sub ? (
          <Text variant="footnote" color="muted" numberOfLines={3}>
            {sub}
          </Text>
        ) : null}
      </View>
      {side === 'venue' ? (
        <Button
          label="Send booking request"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/compose',
              params: { team: teamOf(other.roles), to: other.id, from: 'chat', chat: conversationId },
            })
          }
        />
      ) : null}
    </View>
  );
}

function DayLine({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: t.space.xl, paddingBottom: t.space.xs }} accessibilityRole="header">
      <Text variant="caption" weight="600" color="faint">
        {label}
      </Text>
    </View>
  );
}

/** A status event ("Booked: …", "Filled by someone else."): a centred muted line. */
function EventLine({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.space.xl, paddingVertical: t.space.sm, marginTop: t.space.xs }}>
      <Text variant="footnote" color="muted" center>
        {text}
      </Text>
    </View>
  );
}

/** A text bubble: sender name (first of a run), text, `clockLabel(time)` (§7.3). */
function Bubble({
  mine,
  name,
  text,
  time,
  joined,
  sending,
}: {
  mine: boolean;
  name: string;
  text: string;
  time: string;
  joined: boolean;
  sending?: boolean;
}) {
  const t = useTheme();
  const spoken = `${name}: ${text}, ${sending ? 'sending' : time}`;
  const r = t.radius.lg;
  const tail = 6;
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        marginTop: joined ? t.space.xxs : t.space.sm,
        backgroundColor: mine ? t.c.ink : t.c.card,
        borderColor: mine ? t.c.ink : t.c.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: r,
        borderBottomRightRadius: mine ? tail : r,
        borderBottomLeftRadius: mine ? r : tail,
        paddingHorizontal: t.space.md + 2,
        paddingTop: t.space.sm,
        paddingBottom: t.space.sm - 1,
        opacity: sending ? 0.6 : 1,
        gap: 2,
      }}
    >
      <LitContext.Provider value={mine}>
        {joined ? null : (
          <Text variant="caption" weight="600" color="muted">
            {name}
          </Text>
        )}
        <Text variant="body" selectable={!sending}>
          {text}
        </Text>
        <Text variant="caption" color="faint" tabular style={{ alignSelf: 'flex-end' }}>
          {time}
        </Text>
      </LitContext.Provider>
    </View>
  );
}

/** The composer bar, inside a kit KeyboardFooter so it rides the keyboard on both platforms. */
function Composer({
  text,
  onChange,
  canSend,
  onSend,
}: {
  text: string;
  onChange: (value: string) => void;
  canSend: boolean;
  onSend: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The home-indicator padding may hide behind the keyboard.
  useKeyboardOverlap(insets.bottom);
  const lineHeight = t.text('body').lineHeight ?? 23;
  const inputPadV = t.space.sm + 1;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: t.space.sm,
        paddingHorizontal: t.space.md,
        paddingTop: t.space.sm,
        paddingBottom: insets.bottom + t.space.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: t.c.border,
        backgroundColor: t.c.page,
      }}
    >
      <View style={{ flex: 1, gap: t.space.xxs }}>
        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder="Write a message…"
          placeholderTextColor={t.c.faint}
          accessibilityLabel="Your message"
          multiline
          maxLength={MAX_LENGTH}
          textAlignVertical="top"
          selectionColor={t.c.ink}
          style={[
            t.text('body'),
            {
              color: t.c.text,
              backgroundColor: t.c.card,
              borderColor: t.c.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: t.radius.lg,
              paddingHorizontal: t.space.md + 2,
              paddingTop: inputPadV,
              paddingBottom: inputPadV,
              minHeight: t.hit,
              maxHeight: lineHeight * 5 + inputPadV * 2,
            },
          ]}
        />
        {text.length >= COUNT_FROM ? (
          <Text
            variant="caption"
            color={text.length >= MAX_LENGTH ? 'dangerText' : 'muted'}
            tabular
            style={{ alignSelf: 'flex-end', paddingRight: t.space.sm }}
            accessibilityLiveRegion="polite"
          >
            {thousands(text.length)} / {thousands(MAX_LENGTH)}
          </Text>
        ) : null}
      </View>
      <View style={{ minHeight: t.hit, justifyContent: 'center' }}>
        <IconButton icon="send" variant="ink" size={36} onPress={onSend} disabled={!canSend} accessibilityLabel="Send message" />
      </View>
    </View>
  );
}

/**
 * Kit candidate (KeyboardSpacer minus the safe-area inset): as tall as the
 * composer is lifted, so the newest message stays in view above it while the
 * keyboard is up. Lives at the bottom of the inverted list.
 */
function KeyboardGap() {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const bottom = insets.bottom;
  const style = useAnimatedStyle(() => ({ height: Math.max(0, keyboard.height.value - bottom) }));
  return <Animated.View style={style} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', maxWidth: 260 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
