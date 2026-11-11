import { confirmLogout } from '@/features/shell/confirmLogout';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActionSheetIOS, Alert, Linking, Platform, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { keepMyAccount, LiveGate, requestAccountDeletion, saveDocument, updateMySettings, useLive, useRefresh } from '@/data';
import { accountOf, clockLabel, displayDate, SHIFT_ALERTS, type DocStatus, type Member, type ShiftAlert, type UploadedFile } from '@/domain';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Button,
  haptics,
  KeyboardSpacer,
  pickPhoto,
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
    return { detail: `${d.file ?? ''} · usually within a day`, badge: 'Being checked', tone: 'neutral', icon: 'clock', action: 'Replace' };
  return { detail: 'Upload a JPEG, PNG or PDF', badge: 'Needed', tone: 'attention', action: 'Upload' };
}

const MIME_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const mimeOf = (name: string) => MIME_BY_EXT[name.split('.').pop()?.toLowerCase() ?? ''];

/** Asks for a photo or a file; resolves the chosen file, or null. */
function chooseFile(label: string): Promise<UploadedFile | null> {
  return new Promise((resolve, reject) => {
    const fromPhotos = async () => {
      const r = await pickPhoto('library');
      if (r.status === 'error') return reject(new Error(r.error));
      if (r.status !== 'picked') return resolve(null);
      const name = r.photo.uri.split('/').pop() || `${label}.jpg`;
      resolve({ name, uri: r.photo.uri, mimeType: mimeOf(name) ?? 'image/jpeg' });
    };
    const fromFiles = async () => {
      try {
        const r = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'application/pdf'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (r.canceled || !r.assets?.length) return resolve(null);
        const a = r.assets[0];
        resolve({ name: a.name, uri: a.uri, mimeType: a.mimeType || mimeOf(a.name) || '', size: a.size });
      } catch {
        resolve(null);
      }
    };
    const options = ['Choose a photo', 'Choose a file', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: label, options, cancelButtonIndex: 2 }, (i) => {
        if (i === 0) void fromPhotos();
        else if (i === 1) void fromFiles();
        else resolve(null);
      });
    } else {
      Alert.alert(label, undefined, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Choose a photo', onPress: () => void fromPhotos() },
        { text: 'Choose a file', onPress: () => void fromFiles() },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

function Verification({ me }: { me: Member }) {
  const t = useTheme();
  const { snapshot, userId, run } = useLive();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const docs = accountOf(me).docs;
  const labels = Object.keys(docs);
  const verified = labels.filter((l) => docs[l].status === 'verified').length;
  const rejected = snapshot?.rejected ?? {};

  const upload = async (label: string) => {
    if (busy || !userId) return;
    let file: UploadedFile | null;
    try {
      file = await chooseFile(label);
    } catch (e) {
      toast.show((e as Error).message, { tone: 'error' });
      haptics.warn();
      return;
    }
    if (!file) return;
    setBusy(label);
    await run(`doc:${label}`, () => saveDocument(userId, snapshot?.docCodes[label], file), {
      success: `${label} sent to Dyuknow to check.`,
      args: { label, uri: file.uri },
    });
    setBusy(null);
  };

  return (
    <Section
      label={me.side === 'venue' ? 'Business verification' : 'Verification'}
      footer={`${verified} of ${labels.length} checked. Your profile shows a tick, never the file.`}
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
