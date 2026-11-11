import { router } from 'expo-router';
import { useState } from 'react';

import { adminReviewDocument } from '@/data/admin';
import { useAdmin, useAdminDocument, type AdminDocumentRef } from '@/data/adminStore';
import { Empty, haptics, Notice, Section, SheetScreen, StickyAction, TextRow } from '@/ui';

/**
 * /admin/reject-document?documentId=: why the document isn't accepted. The
 * member sees the reason, so it is required (the database refuses a blank one
 * too: "Add a reason.").
 */
export function RejectDocument({ documentId }: { documentId: string | undefined }) {
  const found = useAdminDocument(documentId);
  // Keep the document while the sheet leaves: after rejecting, it drops out of the to-check list.
  const [kept] = useState<AdminDocumentRef | undefined>(found);
  const doc = found ?? kept;

  if (!doc) {
    return (
      <SheetScreen title="Reject" onClose={() => router.back()}>
        <Empty title="That document can’t be found." action={{ label: 'Close', onPress: () => router.back() }} />
      </SheetScreen>
    );
  }
  return <RejectForm doc={doc} />;
}

function RejectForm({ doc }: { doc: AdminDocumentRef }) {
  const { act } = useAdmin();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();

  const reject = async () => {
    if (busy || done) return;
    if (!trimmed) {
      setError('Add a reason.');
      haptics.warn();
      return;
    }
    setBusy(true);
    setError(null);
    const r = await act(`reject:${doc.document_id}`, () => adminReviewDocument(doc.document_id, 'rejected', trimmed), {
      args: { document: doc.document_id, reason: trimmed },
      memberId: doc.member_id,
      success: `${doc.label} rejected.`,
      onError: setError,
    });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      router.back();
    }
  };

  return (
    <SheetScreen
      title={`Reject ${doc.label}`}
      subtitle={doc.ownerName}
      onClose={() => router.back()}
      footer={
        <StickyAction
          primary={{
            label: 'Reject',
            variant: 'danger',
            loading: busy,
            disabled: !trimmed || done,
            onPress: () => void reject(),
            accessibilityHint: 'The member is told, with your reason',
          }}
        />
      }>
      <Section>
        <TextRow
          label="Why it isn’t accepted (the member sees this)"
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (error) setError(null);
          }}
          placeholder="e.g. The photo is blurred"
          multiline
          maxLength={500}
          autoFocus
          autoCapitalize="sentences"
        />
      </Section>
      {error ? <Notice tone="danger" text={error} /> : null}
    </SheetScreen>
  );
}
