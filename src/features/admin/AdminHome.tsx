import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useLive } from '@/data';
import type { AdminDocumentListItem, AdminMemberListItem } from '@/data/admin';
import { useAdmin, type AdminTab } from '@/data/adminStore';
import { confirmLogout } from '@/features/shell/confirmLogout';
import { useTheme } from '@/theme/useTheme';
import { Badge, DetailRow, Empty, ErrorState, GroupHeading, Loading, Notice, Row, Screen, Section, Segmented } from '@/ui';

import { DocumentTicket } from './DocumentTicket';
import { formatDate, memberStatus, sideLabel, waitingFor } from './format';

const TABS: { id: AdminTab; label: string; short: string; empty: string }[] = [
  { id: 'waiting', label: 'Waiting for approval', short: 'Waiting', empty: 'Nobody is waiting for approval.' },
  { id: 'documents', label: 'Documents to check', short: 'Documents', empty: 'No documents to check.' },
  { id: 'all', label: 'All members', short: 'All', empty: 'No members yet.' },
];

/**
 * /admin: the two working lists (members waiting for approval, documents to
 * check) plus every member (web AdminHome). An admin with no member row lands
 * here, so Log out lives at the bottom for them.
 */
export function AdminHome() {
  const t = useTheme();
  const live = useLive();
  const admin = useAdmin();
  const [tab, setTab] = useState<AdminTab>('waiting');
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const adminOnly = live.status === 'admin-only';
  const current = TABS.find((x) => x.id === tab)!;
  const list = admin.lists[tab];
  const count = admin.counts[tab];

  const onRefresh = () => {
    setRefreshing(true);
    admin.refresh().finally(() => setRefreshing(false));
  };
  const retry = () => {
    setRetrying(true);
    admin.refresh().finally(() => setRetrying(false));
  };

  let body;
  if (!list.items) {
    body = list.error ? (
      <ErrorState message={list.error} onRetry={retry} retrying={retrying} />
    ) : (
      <Loading variant={tab === 'documents' ? 'ticket' : 'rows'} count={tab === 'documents' ? 2 : 5} />
    );
  } else if (!list.items.length) {
    body = <Empty icon={tab === 'documents' ? 'document' : 'people'} title={current.empty} />;
  } else if (tab === 'documents') {
    body = <DocumentsList items={admin.lists.documents.items ?? []} />;
  } else {
    body = <MembersList items={list.items as AdminMemberListItem[]} waiting={tab === 'waiting'} />;
  }

  return (
    <Screen title="Admin" onRefresh={onRefresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: '', headerBackVisible: !adminOnly, gestureEnabled: !adminOnly }} />

      <Segmented
        options={TABS.map((x) => {
          const n = admin.counts[x.id];
          return { value: x.id, label: n == null ? x.short : `${x.short} · ${n}` };
        })}
        value={tab}
        onChange={setTab}
      />

      <View style={{ gap: t.space.md }}>
        <GroupHeading title={current.label} count={count ?? undefined} />
        {list.items && list.error ? <Notice tone="danger" text={list.error} /> : null}
        {body}
      </View>

      {adminOnly ? (
        <Section label="Account">
          <DetailRow label="Email" value={live.email ?? ''} />
          <Row icon="logout" title="Log out" chevron={false} onPress={() => confirmLogout(live.logout)} />
        </Section>
      ) : null}
    </Screen>
  );
}

function MembersList({ items, waiting }: { items: AdminMemberListItem[]; waiting: boolean }) {
  return (
    <Section separatorInset={72}>
      {items.map((m) => {
        const name = m.name?.trim() || m.email || 'No name yet';
        const missing = m.missing ?? [];
        const status = memberStatus(m);
        const second =
          missing.length > 0 && !m.approved && !m.deleted_at
            ? `Missing: ${missing.join(', ')}`
            : waiting
              ? `Joined ${waitingFor(m.created_at)}`
              : `Joined ${formatDate(m.created_at)}`;
        return (
          <Row
            key={m.member_id}
            photo={{ name }}
            title={name}
            titleSerif
            subtitle={[m.email, `${sideLabel(m.side)} · ${second}`].filter(Boolean).join('\n')}
            subtitleLines={2}
            trailing={<Badge label={status.label} tone={status.tone} icon={status.icon} numberOfLines={1} />}
            accessibilityLabel={`${name}, ${sideLabel(m.side)}, ${status.label}. ${second}`}
            accessibilityHint="Opens everything about this member"
            onPress={() => router.push({ pathname: '/admin/member/[id]', params: { id: m.member_id } })}
          />
        );
      })}
    </Section>
  );
}

function DocumentsList({ items }: { items: AdminDocumentListItem[] }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      {items.map((d) => (
        <DocumentTicket
          key={d.document_id}
          doc={d}
          memberId={d.member_id}
          owner={{ name: d.member_name?.trim() || 'No name yet', side: d.side }}
        />
      ))}
    </View>
  );
}
