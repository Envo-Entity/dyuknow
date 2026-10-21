"use client";
// The live app's data: loaded from Supabase for the signed-in member, kept
// fresh by Realtime, on returning to the tab and every minute while visible.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Data } from "@/lib/preview/model";
import { loadLive, type LiveSnapshot } from "./load";
import { runLive, type AppAction } from "./actions";
import { clearDrafts, writeDraft } from "./drafts";

export type LiveState = {
  status: "loading" | "ready" | "error";
  error: string;
  snapshot: LiveSnapshot | null;
};
const REFRESH_MS = 60000;

export function useLiveApp() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<LiveState>({ status: "loading", error: "", snapshot: null });
  const snap = useRef<LiveSnapshot | null>(null);
  const inFlight = useRef<Promise<LiveSnapshot | null> | null>(null);
  const again = useRef(false);

  // One load at a time; a request during a load runs once more after it.
  const reload = useCallback((): Promise<LiveSnapshot | null> => {
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    const run = async (): Promise<LiveSnapshot | null> => {
      try {
        const result = await loadLive(supabase);
        if (result.kind === "signed-out") {
          window.location.replace(`/login?next=${encodeURIComponent("/app")}`);
          return null;
        }
        if (result.kind === "no-member") {
          window.location.replace("/join");
          return null;
        }
        snap.current = result.snapshot;
        setState({ status: "ready", error: "", snapshot: result.snapshot });
        return result.snapshot;
      } catch (e) {
        const message = (e as Error).message || "Couldn’t load Dyuknow.";
        setState((s) =>
          s.snapshot ? { ...s, error: message } : { status: "error", error: message, snapshot: null },
        );
        return snap.current;
      }
    };
    const promise = (async () => {
      let result: LiveSnapshot | null;
      do {
        again.current = false;
        result = await run();
      } while (again.current && result);
      inFlight.current = null;
      return result;
    })();
    inFlight.current = promise;
    return promise;
  }, [supabase]);

  useEffect(() => {
    // The first load starts here; later loads come from events below.
    void reload();
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `member_id=eq.${memberId}` },
        soon,
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, soon)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_reads",
          filter: `member_id=eq.${memberId}`,
        },
        soon,
      )
      .subscribe((status) => {
        // Back after a dropped connection: catch up on what was missed.
        if (status === "SUBSCRIBED") soon();
      });
    const visible = () => {
      if (document.visibilityState === "visible") soon();
    };
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, REFRESH_MS);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", visible);
      void supabase.removeChannel(channel);
    };
  }, [memberId, supabase, reload]);

  const run = useCallback(
    async (action: AppAction): Promise<{ data: Data; success?: string }> => {
      const current = snap.current;
      if (!current) throw new Error("Couldn’t save. Try again.");
      if (action.type === "draft-message") {
        // Typing stays in this browser and shows at once.
        const drafts = writeDraft(current.me.id, action.thread, action.text);
        const next = { ...current, data: { ...current.data, messageDrafts: drafts } };
        snap.current = next;
        setState((s) => ({ ...s, snapshot: next }));
        return { data: next.data };
      }
      const outcome = await runLive(supabase, current, action);
      if (outcome.local) return { data: current.data, success: outcome.success };
      const fresh = (await reload()) ?? current;
      let data = fresh.data;
      if (outcome.shift) {
        // The shift just posted comes first, as the demo's new shift does.
        const posted = data.shifts.find((s) => s.id === outcome.shift);
        if (posted)
          data = { ...data, shifts: [posted, ...data.shifts.filter((s) => s !== posted)] };
      }
      return { data, success: outcome.success };
    },
    [supabase, reload],
  );

  // Opening a shift or booking clears the notices that point at it.
  const readTarget = useCallback(
    async (target: string) => {
      const current = snap.current;
      if (!current?.data.notices.some((n) => !n.read && n.target === target)) return;
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_ids: null,
        p_target: target,
      });
      if (!error) void reload();
    },
    [supabase, reload],
  );

  const logout = useCallback(async () => {
    if (snap.current) clearDrafts(snap.current.me.id);
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("dyuknow.join-draft.")) localStorage.removeItem(key);
    } catch {
      /* Storage can be unavailable; signing out still works. */
    }
    await supabase.auth.signOut();
    window.location.replace("/login");
  }, [supabase]);

  return { ...state, run, reload, readTarget, logout };
}
