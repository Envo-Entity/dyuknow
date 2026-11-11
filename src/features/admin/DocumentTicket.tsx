import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/data';
import { adminDocumentUrl, adminReviewDocument, type AdminDocumentStatus, type AdminSide } from '@/data/admin';
import { useAdmin } from '@/data/adminStore';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, haptics, Notice, Text, TextLink, Ticket, useToast } from '@/ui';

import { documentStatus, fileSize, formatDateTime, sideLabel, waitingFor } from './format';

export type DocumentLike = {
  document_id: string;
  label: string;
  original_filename: string | null;
  storage_path: string;
  size_bytes: number | null;
  status: AdminDocumentStatus;
  uploaded_at: string;
  reject_reason: string | null;
};

/**
 * One document with View / Verify / Reject (web DocumentCard). View opens a
 * 5-minute link in the in-app browser (images and PDFs); Verify is one tap;
 * Reject asks for the reason in a sheet.
 */
export function DocumentTicket({
  doc,
  memberId,
  owner,
  verifyPrimary,
}: {
  doc: DocumentLike;
  memberId: string;
  /** In the to-check list: whose document it is, tappable to their page. */
  owner?: { name: string; side: AdminSide };
  /** The screen has no other primary action (the to-check list). */
  verifyPrimary?: boolean;
}) {
  const t = useTheme();
  const toast = useToast();
  const { act } = useAdmin();
  const [busy, setBusy] = useState<null | 'open' | 'verify'>(null);
  const [error, setError] = useState<string | null>(null);
  const status = documentStatus(doc.status);
  const file = [owner ? sideLabel(owner.side) : null, doc.original_filename, fileSize(doc.size_bytes)].filter(Boolean).join(' · ');
  const uploaded = `Uploaded ${formatDateTime(doc.uploaded_at)}${doc.status === 'review' ? ` · ${waitingFor(doc.uploaded_at)}` : ''}`;

  const view = async () => {
    if (busy) return;
    setBusy('open');
    setError(null);
    try {
      const url = await adminDocumentUrl(doc.storage_path);
      setBusy(null);
      await WebBrowser.openBrowserAsync(url, {
        controlsColor: t.c.ink,
        toolbarColor: t.c.page,
        dismissButtonStyle: 'done',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (e) {
      setBusy(null);
      const message = errorMessage(e);
      setError(message);
      toast.show(message, { tone: 'error' });
      haptics.warn();
    }
  };

  const verify = async () => {
    if (busy) return;
    setBusy('verify');
    setError(null);
    // Busy until the lists have reloaded, so the ticket never shows its old status.
    await act(`verify:${doc.document_id}`, () => adminReviewDocument(doc.document_id, 'verified'), {
      args: doc.document_id,
      memberId,
      success: `${doc.label} verified.`,
      onError: setError,
    });
    setBusy(null);
  };

  const reject = () => {
    setError(null);
    router.push({ pathname: '/admin/reject-document', params: { documentId: doc.document_id } });
  };

  return (
    <Ticket gap={t.space.md}>
      <View style={{ gap: t.space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
          <Text variant="headline" style={{ flex: 1 }}>
            {doc.label}
          </Text>
          <Badge label={status.label} tone={status.tone} icon={status.icon} numberOfLines={1} />
        </View>
        {owner ? (
          <TextLink
            label={owner.name}
            variant="title3"
            onPress={() => router.push({ pathname: '/admin/member/[id]', params: { id: memberId } })}
            accessibilityHint="Opens everything about this member"
          />
        ) : null}
        {file ? (
          <Text variant="subhead" color="muted" numberOfLines={1}>
            {file}
          </Text>
        ) : null}
        <Text variant="footnote" color="muted" tabular>
          {uploaded}
        </Text>
        {doc.status === 'rejected' && doc.reject_reason ? (
          <Text variant="subhead">{`Reason: ${doc.reject_reason}`}</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
        <Button
          label="View"
          icon="eye"
          variant="secondary"
          loading={busy === 'open'}
          disabled={busy !== null}
          onPress={() => void view()}
          accessibilityLabel={`View ${doc.label}`}
          accessibilityHint="Opens the file"
        />
        {doc.status !== 'verified' ? (
          <Button
            label="Verify"
            variant={verifyPrimary ? 'primary' : 'secondary'}
            icon="check"
            loading={busy === 'verify'}
            disabled={busy !== null}
            onPress={() => void verify()}
            accessibilityLabel={`Verify ${doc.label}`}
          />
        ) : null}
        {doc.status !== 'rejected' ? (
          <Button
            label="Reject"
            variant="secondary"
            disabled={busy !== null}
            onPress={reject}
            accessibilityLabel={`Reject ${doc.label}`}
            accessibilityHint="Asks for the reason the member sees"
          />
        ) : null}
      </View>

      {error ? <Notice tone="danger" text={error} /> : null}
    </Ticket>
  );
}
