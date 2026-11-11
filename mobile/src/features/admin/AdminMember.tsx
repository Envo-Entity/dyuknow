import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { photoUrl } from '@/data';
import { adminSetApproval, type AdminMemberDetail } from '@/data/admin';
import { adminMemberName, useAdmin } from '@/data/adminStore';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  DetailRow,
  Empty,
  ErrorState,
  GroupHeading,
  Loading,
  Notice,
  Postcard,
  Row,
  Screen,
  Section,
  StickyAction,
  Text,
  TextRow,
} from '@/ui';

import { DocumentTicket } from './DocumentTicket';
import { formatDate, memberStatus, photoPathOf, readableAnswers, sideLabel } from './format';

/** /admin/member/[id]: everything about one member, and the approval decision (web MemberDrawer). */
export function AdminMember({ id }: { id: string }) {
  const admin = useAdmin();
  const state = admin.member(id);
  const [retrying, setRetrying] = useState(false);
  const { loadMember } = admin;

  useEffect(() => {
    void loadMember(id);
  }, [id, loadMember]);

  if (!state?.detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        {state?.error ? (
          <ErrorState
            message={state.error}
            retrying={retrying}
            onRetry={() => {
              setRetrying(true);
              loadMember(id).finally(() => setRetrying(false));
            }}
          />
        ) : (
          <Loading count={1} />
        )}
      </Screen>
    );
  }
  return <MemberView id={id} detail={state.detail} error={state.error} />;
}

function MemberView({ id, detail, error }: { id: string; detail: AdminMemberDetail; error: string | null }) {
  const t = useTheme();
  const admin = useAdmin();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { member, profile } = detail;
  const name = adminMemberName(detail);
  const missing = detail.missing ?? [];
  const status = memberStatus({ ...member, missing }, { approvedOn: true });
  const groups = readableAnswers(member.side, profile);
  const photo = photoUrl(photoPathOf(profile));

  const onRefresh = () => {
    setRefreshing(true);
    admin.refresh([id]).finally(() => setRefreshing(false));
  };

  const setApproval = async (approved: boolean) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    const r = await admin.act(`approval:${id}`, () => adminSetApproval(id, approved, note), {
      args: { approved, note: note.trim() },
      memberId: id,
      success: approved ? `${name} is approved.` : `Approval taken away from ${name}.`,
      onError: setActionError,
    });
    setBusy(false);
    if (r.ok) setNote('');
  };

  const confirmRemove = () => {
    setActionError(null);
    Alert.alert(
      `Take approval away from ${name}?`,
      `They stop showing to ${member.side === 'talent' ? 'venues' : 'talent'} and any waiting answers end. They aren’t told; let them know yourself.`,
      [
        { text: 'Keep approved', style: 'cancel' },
        { text: 'Take approval away', style: 'destructive', onPress: () => void setApproval(false) },
      ],
    );
  };

  const footer = member.deleted_at ? undefined : member.approved ? (
    <StickyAction primary={{ label: 'Take approval away', variant: 'danger', loading: busy, onPress: confirmRemove }} />
  ) : (
    <StickyAction primary={{ label: 'Approve', loading: busy, onPress: () => void setApproval(true) }} />
  );

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} footer={footer}>
      <Stack.Screen options={{ title: '' }} />

      <Postcard uri={photo || null} name={name} detail={sideLabel(member.side)}>
        <Badge label={status.label} tone={status.tone} icon={status.icon} />
      </Postcard>

      {error ? <Notice tone="danger" text={error} /> : null}
      {member.deletion_requested_at && !member.deleted_at ? (
        <Notice icon="trash" text={`Asked to delete their account on ${formatDate(member.deletion_requested_at)}.`} />
      ) : null}

      <Section>
        <DetailRow
          label="Email"
          value={detail.email ?? 'No login email'}
          onPress={detail.email ? () => void Linking.openURL(`mailto:${detail.email}`).catch(() => {}) : undefined}
          chevron={false}
          accessibilityHint={detail.email ? 'Writes an email' : undefined}
        />
        <DetailRow label="Joined" value={formatDate(member.created_at)} tabular />
      </Section>

      {missing.length ? (
        <Section label="Still missing">
          {missing.map((m) => (
            <Row key={m} icon="alert" title={m} />
          ))}
        </Section>
      ) : null}

      {!member.deleted_at ? (
        <View style={{ gap: t.space.sm }}>
          <Section label="Approval">
            <TextRow
              label="Note for the log (optional)"
              value={note}
              onChangeText={setNote}
              placeholder={member.approved ? 'Why approval is being taken away' : 'e.g. Checked references by phone'}
              multiline
              autoCapitalize="sentences"
            />
          </Section>
          {actionError ? <Notice tone="danger" text={actionError} /> : null}
        </View>
      ) : null}

      <View style={{ gap: t.space.md }}>
        <GroupHeading title="Documents" count={detail.documents.length} />
        {detail.documents.length ? (
          detail.documents.map((doc) => <DocumentTicket key={doc.document_id} doc={doc} memberId={id} />)
        ) : (
          <Text variant="callout" color="muted" style={{ paddingHorizontal: t.space.xs }}>
            No documents uploaded.
          </Text>
        )}
      </View>

      {groups.map((group) => (
        <Section key={group.title} label={group.title}>
          {group.rows.map((row) => (
            <DetailRow
              key={row.label}
              label={row.label}
              value={row.value ?? 'Not answered'}
              accessibilityLabel={`${row.label}, ${row.value ?? 'Not answered'}`}
            />
          ))}
        </Section>
      ))}
      {!profile ? (
        <Text variant="callout" color="muted" style={{ paddingHorizontal: t.space.xs }}>
          No profile answers saved.
        </Text>
      ) : null}
    </Screen>
  );
}

/** Shown when the route has no id. */
export function AdminMemberMissing() {
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Empty icon="person" title="That member can’t be found." action={{ label: 'Back', onPress: () => router.back() }} />
    </Screen>
  );
}
