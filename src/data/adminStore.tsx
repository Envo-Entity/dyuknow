// The admin area's own state, apart from the member snapshot (LiveProvider):
// an admin with no member row has no snapshot at all. Holds the three web
// tabs' lists and the members opened since, and wraps every decision as one
// tap: the store's runResult (de-duplicated, errors toasted with haptics),
// then the lists and the member reload, then the success toast, as the web
// does ("refresh, then toast").
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { haptics, useToast } from '@/ui';

import {
  adminGetMember,
  adminListDocuments,
  adminListMembers,
  adminLoadMessage,
  type AdminDocumentListItem,
  type AdminDocumentStatus,
  type AdminMemberDetail,
  type AdminMemberListItem,
} from './admin';
import { useLive, type RunResult } from './store';

/** The member's name as the web drawer shows it: profile name, else login email, else "This member". */
export function adminMemberName(detail: AdminMemberDetail): string {
  const p = detail.profile;
  const raw = detail.member.side === 'talent' ? p?.full_name : p?.display_name;
  return (typeof raw === 'string' ? raw.trim() : '') || detail.email || 'This member';
}

export type AdminTab = 'waiting' | 'documents' | 'all';
type List<T> = { items: T[] | null; error: string | null };
export type AdminLists = {
  waiting: List<AdminMemberListItem>;
  documents: List<AdminDocumentListItem>;
  all: List<AdminMemberListItem>;
};
export type AdminMemberState = { detail: AdminMemberDetail | null; error: string | null };

export type AdminActOptions<T> = {
  /** Success toast after the reload. */
  success?: string | ((value: T) => string);
  /** What this tap sends, so a retried tap is recognised (see RunOptions.args). */
  args?: unknown;
  /** The screen's inline error line; the toast still shows. */
  onError?: (message: string) => void;
  /** Also reload this member's detail. */
  memberId?: string;
};

export type Admin = {
  lists: AdminLists;
  /** Counts per tab, null while a list hasn't loaded (or failed). */
  counts: Record<AdminTab, number | null>;
  /** Reloads the three lists and any members given. */
  refresh(memberIds?: string[]): Promise<void>;
  member(id: string): AdminMemberState | undefined;
  findDocument(documentId: string): AdminDocumentRef | undefined;
  loadMember(id: string): Promise<void>;
  act<T>(key: string, fn: () => Promise<T>, opts?: AdminActOptions<T>): Promise<RunResult<T>>;
};

const EMPTY: AdminLists = {
  waiting: { items: null, error: null },
  documents: { items: null, error: null },
  all: { items: null, error: null },
};

async function settle<T>(p: Promise<T[]>): Promise<List<T>> {
  try {
    return { items: await p, error: null };
  } catch (e) {
    return { items: null, error: adminLoadMessage(e) };
  }
}

const AdminContext = createContext<Admin | null>(null);

/** Mount once around the navigator; loads only while `enabled` (a Dyuknow admin is signed in). */
export function AdminProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { runResult } = useLive();
  const toast = useToast();
  const [lists, setLists] = useState<AdminLists>(EMPTY);
  const [members, setMembers] = useState<Record<string, AdminMemberState>>({});
  const inFlight = useRef<Promise<void> | null>(null);

  const loadMember = useCallback(async (id: string) => {
    try {
      const detail = await adminGetMember(id);
      setMembers((m) => ({ ...m, [id]: { detail, error: null } }));
    } catch (e) {
      const error = adminLoadMessage(e);
      // Keep what was shown; the error only replaces nothing.
      setMembers((m) => ({ ...m, [id]: { detail: m[id]?.detail ?? null, error } }));
    }
  }, []);

  const loadLists = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      const [waiting, documents, all] = await Promise.all([
        settle(adminListMembers('waiting')),
        settle(adminListDocuments('review')),
        settle(adminListMembers('all')),
      ]);
      // A failed reload keeps the last list it had, with the error noted.
      setLists((prev) => ({
        waiting: waiting.items ? waiting : { items: prev.waiting.items, error: waiting.error },
        documents: documents.items ? documents : { items: prev.documents.items, error: documents.error },
        all: all.items ? all : { items: prev.all.items, error: all.error },
      }));
    })().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = p;
    return p;
  }, []);

  const refresh = useCallback(
    async (memberIds: string[] = []) => {
      await Promise.all([loadLists(), ...memberIds.map(loadMember)]);
    },
    [loadLists, loadMember],
  );

  // First load, and again on coming back to the app. Signed out: forget it all.
  useEffect(() => {
    if (!enabled) {
      setLists(EMPTY);
      setMembers({});
      return;
    }
    void loadLists();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void loadLists();
    });
    return () => sub.remove();
  }, [enabled, loadLists]);

  const act = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, opts?: AdminActOptions<T>): Promise<RunResult<T>> => {
      const r = await runResult(key, () => fn(), { quiet: true, args: opts?.args, onError: opts?.onError });
      if (!r.ok) return r;
      await refresh(opts?.memberId ? [opts.memberId] : []);
      const text = typeof opts?.success === 'function' ? opts.success(r.value) : opts?.success;
      if (text) toast.show(text, { tone: 'good' });
      haptics.commit();
      return r;
    },
    [runResult, refresh, toast],
  );

  const value = useMemo<Admin>(
    () => ({
      lists,
      counts: {
        waiting: lists.waiting.items?.length ?? null,
        documents: lists.documents.items?.length ?? null,
        all: lists.all.items?.length ?? null,
      },
      refresh,
      member: (id) => members[id],
      findDocument: (documentId) => {
        const listed = lists.documents.items?.find((d) => d.document_id === documentId);
        if (listed)
          return {
            document_id: listed.document_id,
            label: listed.label,
            status: listed.status,
            reject_reason: listed.reject_reason,
            member_id: listed.member_id,
            ownerName: listed.member_name?.trim() || 'No name yet',
          };
        for (const [memberId, state] of Object.entries(members)) {
          const d = state.detail?.documents.find((x) => x.document_id === documentId);
          if (d && state.detail)
            return {
              document_id: d.document_id,
              label: d.label,
              status: d.status,
              reject_reason: d.reject_reason,
              member_id: memberId,
              ownerName: adminMemberName(state.detail),
            };
        }
        return undefined;
      },
      loadMember,
      act,
    }),
    [lists, members, refresh, loadMember, act],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): Admin {
  const admin = useContext(AdminContext);
  if (!admin) throw new Error('useAdmin must be used inside <AdminProvider>.');
  return admin;
}

export type AdminDocumentRef = {
  document_id: string;
  label: string;
  status: AdminDocumentStatus;
  reject_reason: string | null;
  member_id: string;
  ownerName: string;
};

/** A document to review, wherever it was last seen (the to-check list or an opened member). */
export function useAdminDocument(documentId: string | undefined): AdminDocumentRef | undefined {
  const { findDocument } = useAdmin();
  return documentId ? findDocument(documentId) : undefined;
}
