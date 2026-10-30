// What the auth screens share while someone moves between them: the email
// they typed (so the code and reset steps know where the code went) and when
// the last code was sent (the 60 s resend timer). Kept in memory only.
import { useEffect, useState, useSyncExternalStore } from 'react';

import { RESEND_AFTER_SECONDS, useLive } from '@/data';

type AuthDraft = { email: string; sentAt: number | null };

let draft: AuthDraft = { email: '', sentAt: null };
const listeners = new Set<() => void>();

export function setAuthDraft(patch: Partial<AuthDraft>) {
  draft = { ...draft, ...patch };
  listeners.forEach((l) => l());
}
/** A code was just sent: start the resend timer. */
export function startResendTimer() {
  setAuthDraft({ sentAt: Date.now() });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useAuthDraft(): AuthDraft {
  return useSyncExternalStore(subscribe, () => draft);
}

/** Seconds until a new code may be asked for (0 when it may). */
export function useResendSeconds(sentAt: number | null): number {
  const left = () => (sentAt ? Math.max(0, Math.ceil((sentAt + RESEND_AFTER_SECONDS * 1000 - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(left);
  useEffect(() => {
    setSeconds(left());
    if (!sentAt) return;
    const timer = setInterval(() => {
      const s = left();
      setSeconds(s);
      if (s === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentAt]);
  return seconds;
}

/**
 * Signed in: reload, and the root guard takes the person on (§1.1).
 * `routing` shows "Signing you in…" meanwhile.
 */
export function useRouteOn() {
  const { reload } = useLive();
  const [routing, setRouting] = useState(false);
  const routeOn = async () => {
    setRouting(true);
    // Any status other than signed-out removes the auth screens, so the
    // spinner stays until the guard has moved on.
    await reload();
  };
  return { routing, routeOn };
}
