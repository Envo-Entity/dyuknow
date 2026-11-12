import { confirmLogout } from '@/features/shell/confirmLogout';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { keepMyAccount, LiveGate, requestAccountDeletion, updateMySettings, useLive, useRefresh } from '@/data';
import { accountOf, clockLabel, displayDate, SHIFT_ALERTS, type DocStatus, type Member, type ShiftAlert } from '@/domain';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Button,
  haptics,
  KeyboardSpacer,
  Row,
  Screen,
  Section,
  Segmented,
  SelectSheet,
  Text,
  TextLink,
  useToast,
  type BadgeTone,
  type IconName,
} from '@/ui';

import { RightToWorkNudge, useDocUpload } from './docUpload';

const HELP_PHONE = '+44 20 7946 0000';
const HELP_EMAIL = 'help@dyuknow.example';

type Jump = 'Verification' | 'Notifications' | 'Help' | 'Account';
const JUMPS: Jump[] = ['Verification', 'Notifications', 'Help', 'Account'];

/** Account: documents, alerts, text size, help, and the account itself (§7.7). */
export function Account() {
  return (
    <LiveGate approval={false} loading={{ variant: 'rows', count: 4 }}>
      {({ me }) => <AccountView me={me} />}
    </LiveGate>
  );
}

function AccountView({ me }: { me: Member }) {
  const t = useTheme();
  const { refreshing, onRefresh } = useRefresh();
  // The jump index scrolls to a card, so this screen keeps its own scroll view.
  const scroll = useRef<ScrollViewInstance>(null);
  const tops = useRef<Partial<Record<Jump, number>>>({});
  const at = (jump: Jump, child: ReactNode) => (
    <View onLayout={(e) => (tops.current[jump] = e.nativeEvent.layout.y)}>{child}</View>
  );
  const jumpTo = (jump: Jump) => {
    const y = tops.current[jump];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - t.space.md), animated: !t.reduceMotion });
  };

  return (
    <Screen scroll={false} padded={false} contentStyle={{ paddingTop: 0, paddingBottom: 0 }}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1, backgroundColor: t.c.page }}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: t.space.md, paddingBottom: t.space.xxxl, gap: t.space.xxl }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.c.muted} colors={[t.c.ink]} progressBackgroundColor={t.c.card} />}
      >
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space.lg, paddingHorizontal: t.space.xs, marginBottom: -t.space.sm }}
          accessibilityRole="toolbar"
          accessibilityLabel="Jump to"
        >
          {JUMPS.map((j) => (
            <TextLink key={j} label={j} variant="subhead" color="muted" onPress={() => jumpTo(j)} accessibilityHint={`Scrolls to ${j}`} />
          ))}
        </View>
        <RightToWorkNudge me={me} />
        {at('Verification', <Verification me={me} />)}
        {at('Notifications', <Notifications me={me} />)}
        <TextSize />
        {at('Help', <Help />)}
        {at('Account', <AccountDetails me={me} />)}
        {Platform.OS === 'android' ? <KeyboardSpacer /> : null}
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------------------------------------------ Verification */

type DocState = { detail: string; badge: string; tone: BadgeTone; icon?: IconName; action: 'Upload' | 'Replace' };

function docState(status: DocStatus, rejected: string | undefined, d: { file?: string; updated?: string }): DocState {
  if (rejected !== undefined) {
    const reason = rejected.replace(/[.!\s]+$/, '');
    return { detail: `${reason ? `${reason}. ` : ''}Upload a new one.`, badge: 'Not accepted', tone: 'attention', icon: 'alert', action: 'Replace' };
  }
  if (status === 'verified')
    return { detail: `Checked ${d.updated ? displayDate(d.updated.slice(0, 10)) : ''}`.trim(), badge: 'Verified', tone: 'good', action: 'Replace' };
  if (status === 'review')
    return { detail: `${d.file ?? ''} · not checked yet`, badge: 'Added', tone: 'neutral', icon: 'clock', action: 'Replace' };
  // Documents are optional, so a missing one is neutral, not a warning.
  return { detail: 'Upload a JPEG, PNG or PDF', badge: 'Not added', tone: 'neutral', action: 'Upload' };
}

function Verification({ me }: { me: Member }) {
  const t = useTheme();
  const { snapshot } = useLive();
  const { upload, busy } = useDocUpload();
  const docs = accountOf(me).docs;
  const labels = Object.keys(docs);
  const rejected = snapshot?.rejected ?? {};

  return (
    <Section
      label={me.side === 'venue' ? 'Business verification' : 'Documents'}
      footer={
        me.side === 'venue'
          ? 'Optional. Your profile shows a tick once Dyuknow has checked one, never the file.'
          : 'Optional. Venues see which ones you’ve added and which Dyuknow has checked, never the file. Your CV stays private.'
      }
    >
      {labels.map((label) => {
        const s = docState(docs[label].status, label in rejected ? rejected[label] : undefined, docs[label]);
        return (
          <View
            key={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.space.lg, paddingVertical: t.space.md }}
          >
            <View style={{ flex: 1, gap: t.space.xs }} accessible accessibilityLabel={`${label}, ${s.badge}. ${s.detail}`}>
              <Text variant="body">{label}</Text>
              <Text variant="subhead" color="muted">
                {s.detail}
              </Text>
              <Badge label={s.badge} tone={s.tone} icon={s.icon} style={{ alignSelf: 'flex-start', marginTop: t.space.xxs }} />
            </View>
            <Button
              label={s.action}
              variant="secondary"
              icon="upload"
              loading={busy === label}
              disabled={!!busy}
              accessibilityLabel={`${s.action} ${label}`}
              onPress={() => void upload(label)}
            />
          </View>
        );
      })}
    </Section>
  );
}

/* ------------------------------------------------------------------ Notifications */

function Notifications({ me }: { me: Member }) {
  const { run } = useLive();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ShiftAlert | null>(null);
  const t = useTheme();
  const notice = 'Notices show in the app, on the bell.';
  const push = 'Push notifications aren’t available yet.';

  // Venues have no settings here: the two lines sit in the card itself.
  if (me.side !== 'talent') {
    return (
      <Section label="Notifications">
        <View style={{ padding: t.space.lg, gap: t.space.xs }}>
          <Text variant="body">{notice}</Text>
          <Text variant="subhead" color="muted">
            {push}
          </Text>
        </View>
      </Section>
    );
  }
  const value = pending ?? me.alert;
  const current = SHIFT_ALERTS.find((a) => a.value === value);
  const choose = async (next: ShiftAlert) => {
    setOpen(false);
    if (next === me.alert) return;
    setPending(next);
    await run('alerts', () => updateMySettings(next), { success: 'Saved.', args: next });
    setPending(null);
  };
  return (
    <>
      <Section label="Notifications" footer={`${notice}\n${push}`}>
        <Row icon="bell" title="New job posts" subtitle="In your positions" value={current?.label} onPress={() => setOpen(true)} />
      </Section>
      {/* Outside the Section, so it draws no stray hairline. */}
      <SelectSheet
        visible={open}
        title="New job posts"
        options={SHIFT_ALERTS.map((a) => ({ value: a.value, label: a.label }))}
        value={value}
        onSelect={(v) => void choose(v)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ Text size */

function TextSize() {
  const t = useTheme();
  return (
    <Section label="Text size">
      <View style={{ padding: t.space.lg }}>
        <Segmented
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'large', label: 'Large' },
          ]}
          value={t.textSize}
          onChange={t.setTextSize}
        />
      </View>
    </Section>
  );
}

/* ------------------------------------------------------------------ Help */

function Help() {
  const open = (url: string) => void Linking.openURL(url).catch(() => {});
  return (
    <Section label="Help">
      <Row icon="call" title="Call" value={HELP_PHONE} valueTabular onPress={() => open(`tel:${HELP_PHONE.replace(/\s/g, '')}`)} />
      <Row icon="mail" title="Email" value={HELP_EMAIL} onPress={() => open(`mailto:${HELP_EMAIL}`)} />
    </Section>
  );
}

/* ------------------------------------------------------------------ Account */

function AccountDetails({ me }: { me: Member }) {
  const { email, run, logout, isAdmin } = useLive();
  const deletion = me.account?.deletion;

  const askDelete = () => {
    Alert.alert(
      'Delete your account?',
      'Upcoming bookings stay until they’re done or cancelled. Dyuknow removes your profile and documents, then gets in touch to confirm.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: () => void run('delete-account', () => requestAccountDeletion(), { success: 'Deletion requested.', args: me.id }),
        },
      ],
    );
  };
  const keep = () => void run('keep-account', () => keepMyAccount(), { success: 'Deletion request withdrawn.', args: me.id });

  return (
    <Section
      label="Account"
      footer={deletion ? `Deletion requested ${clockLabel(deletion)}. Dyuknow will be in touch to confirm.` : undefined}
    >
      <Row icon="mail" title="Email" value={email ?? ''} />
      {isAdmin ? <Row icon="people" title="Dyuknow admin" onPress={() => router.push('/admin')} /> : null}
      <Row icon="logout" title="Log out" chevron={false} onPress={() => confirmLogout(logout)} />
      {deletion ? (
        <Row icon="refresh" title="Keep my account" chevron={false} onPress={keep} />
      ) : (
        <Row icon="trash" title="Delete account" destructive chevron={false} onPress={askDelete} />
      )}
    </Section>
  );
}
