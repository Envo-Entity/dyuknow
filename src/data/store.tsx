// The live app's data: loaded from Supabase for the signed-in member, kept
// fresh by Realtime, on returning to the app, and every minute while open.
// A port of the website's lib/live/store.ts (useLiveApp) plus the shell's
// `act` (one tap, one save, one toast).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { unreadChat, type Data, type Member } from '@/domain';
import { supabase } from './supabase';
import { loadLive, type LiveSnapshot } from './load';
import { errorMessage, isNetworkError, markConversationRead, markNotificationsRead, newClientRef } from './actions';
import { clearAllDrafts, writeDraft } from './drafts';

export type LiveStatus = 'loading' | 'signed-out' | 'no-member' | 'admin-only' | 'ready' | 'error';
export type Badges = {
  unreadNotifications: number;
  unreadConversationIds: string[];
  needsYou: number;
  accountAttention: boolean;
};
export type RunOptions<T> = { success?: string | ((result: T) => string | undefined) };
export type Live = {
  status: LiveStatus;
  data: Data | null;
  me: Member | null;
  side: 'talent' | 'venue' | null;
  approved: boolean;
  badges: Badges;
  userId?: string;
  email?: string;
  // Signed in as a Dyuknow admin (admin itself lives on the website).
  isAdmin: boolean;
  error: string | null;
  // Everything else the website's snapshot carries: docCodes, rejected,
  // seqs, lastSeq, myReads, photoPath, raw badges, the members row.
  snapshot: LiveSnapshot | null;
  reload(): Promise<void>;
  /**
   * One tap: `fn` gets a client_ref (the same one again if this key's last
   * attempt failed for want of a connection). A second call with the same key
   * while the first is running does nothing (resolves undefined). Shows the
   * success line (or the error line) through `notify`, fires haptics, then
   * reloads. Resolves the result, or undefined on failure.
   */
  run<T>(key: string, fn: (clientRef: string) => Promise<T>, opts?: RunOptions<T>): Promise<T | undefined>;
  /** Quiet: marks a conversation read up to its newest message. */
  readChat(conversationId: string): Promise<void>;
  /** Quiet: marks notices read: one id, or all when omitted. */
  readNotice(id?: string): Promise<void>;
  /** Quiet: opening a shift or booking reads the notices that point at it ("shift/<id>"). */
  readTarget(target: string): Promise<void>;
  /** Keeps an unsent message on this device and in data.messageDrafts. */
  setDraft(conversationId: string, text: string): void;
  logout(): Promise<void>;
};

type Notify = (text: string, tone: 'good' | 'error') => void;
type Haptic = { commit(): void; warn(): void };

type State = {
  status: LiveStatus;
  snapshot: LiveSnapshot | null;
  userId?: string;
  email?: string;
  isAdmin: boolean;
  error: string | null;
};

const REFRESH_MS = 60000;
const LiveContext = createContext<Live | null>(null);

function badgesOf(snap: LiveSnapshot): Badges {
  const { data, me } = snap;
  const b = snap.badges;
  const actor = me.id;
  const side = me.side;
  if (b)
    return {
      unreadNotifications: b.unread_notifications,
      unreadConversationIds: b.unread_conversation_ids ?? [],
      needsYou: b.needs_you,
      accountAttention: b.account_attention,
    };
  // The database's counts didn't come back: count from the snapshot, as the website's shell does.
  const myThreads = data.threads.filter((t) => (side === 'venue' ? t.venue : t.talent) === actor);
  return {
    unreadNotifications: data.notices.filter((n) => n.to === actor && !n.read).length,
    unreadConversationIds: myThreads.filter((t) => unreadChat(data, actor, t)).map((t) => t.id),
    needsYou:
      side === 'talent'
        ? data.responses.filter(
            (r) =>
              r.talent === actor &&
              r.status === 'invited' &&
              data.shifts.find((s) => s.id === r.shift)?.status === 'open',
          ).length
        : data.responses.filter(
            (r) =>
              r.status === 'can-cover' &&
              data.shifts.some((s) => s.id === r.shift && s.venue === actor && s.status === 'open'),
          ).length,
    accountAttention: Object.keys(snap.rejected).length > 0,
  };
}
const NO_BADGES: Badges = { unreadNotifications: 0, unreadConversationIds: [], needsYou: 0, accountAttention: false };

export function LiveProvider({ children, notify, haptic }: { children: ReactNode; notify: Notify; haptic: Haptic }) {
  const [state, setState] = useState<State>({ status: 'loading', snapshot: null, isAdmin: false, error: null });
  const snap = useRef<LiveSnapshot | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const notifyRef = useRef(notify);
  const hapticRef = useRef(haptic);
  useEffect(() => {
    notifyRef.current = notify;
    hapticRef.current = haptic;
  }, [notify, haptic]);

  // One load at a time; a request during a load runs once more after it.
  const reload = useCallback((): Promise<void> => {
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    const once = async () => {
      try {
        const result = await loadLive(supabase);
        if (result.kind === 'signed-out') {
          snap.current = null;
          setState({ status: 'signed-out', snapshot: null, isAdmin: false, error: null });
        } else if (result.kind === 'no-member') {
          snap.current = null;
          setState({
            status: result.isAdmin ? 'admin-only' : 'no-member',
            snapshot: null,
            userId: result.userId,
            email: result.email,
            isAdmin: result.isAdmin,
            error: null,
          });
        } else {
          const { kind: _kind, ...next } = result;
          snap.current = next;
          setState({ status: 'ready', snapshot: next, userId: next.userId, email: next.email, isAdmin: next.isAdmin, error: null });
        }
      } catch (e) {
        const message = isNetworkError(e)
          ? 'Couldn’t reach Dyuknow. Check your connection and try again.'
          : (e as Error)?.message || 'Couldn’t load Dyuknow.';
        // Keep the last snapshot: the screens stay usable, with the error noted.
        setState((s) => (s.snapshot ? { ...s, error: message } : { ...s, status: 'error', error: message }));
      }
    };
    const promise = (async () => {
      try {
        do {
          again.current = false;
          await once();
        } while (again.current);
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = promise;
    return promise;
  }, []);

  // First load, and again whenever someone signs in or out.
  useEffect(() => {
    void reload();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_OUT') {
        snap.current = null;
        setState({ status: 'signed-out', snapshot: null, isAdmin: false, error: null });
      }
      // Never call Supabase inside this callback: it runs under the auth lock.
      setTimeout(() => void reload(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [reload]);

  const memberId = state.snapshot?.me.id;
  useEffect(() => {
    if (!memberId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void reload(), 300);
    };
    const channel = supabase
      .channel(`member-${memberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `member_id=eq.${memberId}` }, soon)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, soon)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads', filter: `member_id=eq.${memberId}` },
        soon,
      )
      .subscribe((status) => {
        // Back after a dropped connection: catch up on what was missed.
        if (status === 'SUBSCRIBED') soon();
      });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') soon();
    });
    const tick = setInterval(() => {
      if (AppState.currentState === 'active') void reload();
    }, REFRESH_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [memberId, reload]);

  // A tap's client_ref, kept while the tap may be retried.
  const refs = useRef(new Map<string, string>());
  const pending = useRef(new Set<string>());
  const run = useCallback(
    async <T,>(key: string, fn: (clientRef: string) => Promise<T>, opts?: RunOptions<T>): Promise<T | undefined> => {
      if (pending.current.has(key)) return undefined;
      pending.current.add(key);
      let clientRef = refs.current.get(key);
      if (!clientRef) {
        clientRef = newClientRef();
        refs.current.set(key, clientRef);
      }
      try {
        const result = await fn(clientRef);
        refs.current.delete(key);
        const text = typeof opts?.success === 'function' ? opts.success(result) : opts?.success;
        if (text) notifyRef.current(text, 'good');
        hapticRef.current.commit();
        await reload();
        return result;
      } catch (e) {
        // Only a lost connection keeps the ref: the server may have saved it.
        const offline = isNetworkError(e);
        if (!offline) refs.current.delete(key);
        notifyRef.current(errorMessage(e), 'error');
        hapticRef.current.warn();
        if (!offline) void reload();
        return undefined;
      } finally {
        pending.current.delete(key);
      }
    },
    [reload],
  );

  const readChat = useCallback(
    async (conversationId: string) => {
      const s = snap.current;
      if (!s) return;
      const upTo = s.lastSeq[conversationId] ?? 0;
      if (!upTo || (s.myReads[conversationId] ?? 0) >= upTo) return;
      if (await markConversationRead(conversationId, upTo)) void reload();
    },
    [reload],
  );
  const readNotice = useCallback(
    async (id?: string) => {
      const s = snap.current;
      if (!s?.data.notices.some((n) => !n.read && (!id || n.id === id))) return;
      if (await markNotificationsRead(id ? { ids: [id] } : {})) void reload();
    },
    [reload],
  );
  const readTarget = useCallback(
    async (target: string) => {
      const s = snap.current;
      if (!s?.data.notices.some((n) => !n.read && n.target === target)) return;
      if (await markNotificationsRead({ target })) void reload();
    },
    [reload],
  );
  const setDraft = useCallback((conversationId: string, text: string) => {
    const s = snap.current;
    if (!s) return;
    const drafts = writeDraft(s.me.id, conversationId, text);
    const next = { ...s, data: { ...s.data, messageDrafts: drafts } };
    snap.current = next;
    setState((st) => (st.snapshot ? { ...st, snapshot: next } : st));
  }, []);

  const logout = useCallback(async () => {
    await clearAllDrafts();
    refs.current.clear();
    try {
      await supabase.auth.signOut();
    } catch {
      // Signed out locally either way.
    }
    snap.current = null;
    setState({ status: 'signed-out', snapshot: null, isAdmin: false, error: null });
  }, []);

  const value = useMemo<Live>(() => {
    const s = state.snapshot;
    return {
      status: state.status,
      data: s?.data ?? null,
      me: s?.data.members.find((m) => m.id === s.me.id) ?? null,
      side: s?.me.side ?? null,
      approved: !!s && s.me.approved && !s.me.deleted_at,
      badges: s ? badgesOf(s) : NO_BADGES,
      userId: state.userId,
      email: state.email,
      isAdmin: state.isAdmin,
      error: state.error,
      snapshot: s,
      reload,
      run,
      readChat,
      readNotice,
      readTarget,
      setDraft,
      logout,
    };
  }, [state, reload, run, readChat, readNotice, readTarget, setDraft, logout]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) throw new Error('useLive must be used inside <LiveProvider>.');
  return live;
}

/** The ready snapshot's data; throws outside the signed-in app. */
export function useData(): Data {
  const { data } = useLive();
  if (!data) throw new Error('useData needs a signed-in member.');
  return data;
}
/** One member from the snapshot, or undefined. */
export function useMember(id: string | undefined): Member | undefined {
  const { data } = useLive();
  return useMemo(() => (id ? data?.members.find((m) => m.id === id) : undefined), [data, id]);
}
/** One shift from the snapshot, or undefined. */
export function useShift(id: string | undefined) {
  const { data } = useLive();
  return useMemo(() => (id ? data?.shifts.find((s) => s.id === id) : undefined), [data, id]);
}
/** One booking from the snapshot, or undefined. */
export function useBooking(id: string | undefined) {
  const { data } = useLive();
  return useMemo(() => (id ? data?.bookings.find((b) => b.id === id) : undefined), [data, id]);
}
