"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CheckIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { DocumentCard } from "./DocumentCard";
import { MemberDrawer } from "./MemberDrawer";
import { errorMessage, formatDate, sideLabel, waitingFor } from "./format";
import type { DocumentListItem, MemberListItem } from "./types";

type Tab = "waiting" | "documents" | "all";

type Lists = {
  waiting: MemberListItem[] | null;
  documents: DocumentListItem[] | null;
  all: MemberListItem[] | null;
};

type ListErrors = Partial<Record<Tab, string>>;

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "waiting", label: "Waiting for approval", short: "Waiting" },
  { id: "documents", label: "Documents to check", short: "Documents" },
  { id: "all", label: "All members", short: "All" },
];

/**
 * /admin: two working lists (members waiting for approval, documents to check)
 * plus every member. Signed-out people go to /login; signed-in people who
 * aren't admins see a short refusal. The database checks every call too.
 */
export function AdminHome() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [phase, setPhase] = useState<"checking" | "not-admin" | "ready" | "error">("checking");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [lists, setLists] = useState<Lists>({ waiting: null, documents: null, all: null });
  const [listErrors, setListErrors] = useState<ListErrors>({});
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [waiting, documents, all] = await Promise.all([
      supabase.rpc("admin_list_members", { p_status: "waiting" }),
      supabase.rpc("admin_list_documents", { p_status: "review" }),
      supabase.rpc("admin_list_members", { p_status: "all" }),
    ]);
    setLists({
      waiting: waiting.error ? null : ((waiting.data as MemberListItem[]) ?? []),
      documents: documents.error ? null : ((documents.data as DocumentListItem[]) ?? []),
      all: all.error ? null : ((all.data as MemberListItem[]) ?? []),
    });
    setListErrors({
      waiting: waiting.error ? errorMessage(waiting.error) : undefined,
      documents: documents.error ? errorMessage(documents.error) : undefined,
      all: all.error ? errorMessage(all.error) : undefined,
    });
  }, [supabase]);

  // Who is this? Signed out -> /login; not an admin -> refusal; admin -> lists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userData.user) {
        router.replace("/login?next=/admin");
        return;
      }
      const { data, error } = await supabase.rpc("am_i_admin");
      if (cancelled) return;
      if (error) {
        setPhaseError(errorMessage(error));
        setPhase("error");
        return;
      }
      const isAdmin = Boolean(data && typeof data === "object" && (data as { is_admin?: boolean }).is_admin);
      if (!isAdmin) {
        setPhase("not-admin");
        return;
      }
      setPhase("ready");
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const afterChange = useCallback(
    async (message: string) => {
      await refresh();
      setToast(message);
    },
    [refresh],
  );

  const closeDrawer = useCallback(() => setOpenMember(null), []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login?next=/admin");
  }

  if (phase === "checking") {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-[14px] text-muted">Loading…</div>;
  }

  if (phase === "not-admin" || phase === "error") {
    return (
      <div className="animate-view-in flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
        <div className="font-serif text-[30px] leading-tight tracking-[-0.01em] text-ink lg:text-[40px]">
          {phase === "not-admin" ? "Only Dyuknow can see this page." : phaseError}
        </div>
        <Link href="/app" className="rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5">
          Go to the app
        </Link>
      </div>
    );
  }

  const count = (t: Tab) => {
    const l = lists[t];
    return l ? l.length : null;
  };

  return (
    <div className="animate-view-in min-h-screen bg-paper lg:bg-mist">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 pb-24 pt-8 lg:px-10 lg:pt-14">
        <header className="flex items-start justify-between gap-4 px-1">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">Dyuknow admin</div>
            <h1 className="mt-2 text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[34px] lg:text-[48px]">
              Who’s waiting <span className="whitespace-nowrap font-serif font-normal italic">on you</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 flex-none cursor-pointer rounded-full border border-border bg-paper px-4 py-2 text-[13px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Sign out
          </button>
        </header>

        {/* Tabs */}
        <div role="tablist" aria-label="Admin lists" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-1">
          {TABS.map((t) => {
            const n = count(t.id);
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-none cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-transform hover:-translate-y-0.5",
                  active ? "border border-ink bg-ink text-white" : "border border-border bg-paper text-ink",
                )}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {n !== null && (
                  <span
                    className={cn(
                      "min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[12px]",
                      active ? "bg-sage text-ink" : "bg-mist text-ink",
                    )}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {listErrors[tab] ? (
            <Empty>{listErrors[tab]}</Empty>
          ) : lists[tab] === null ? (
            <Empty>Loading…</Empty>
          ) : tab === "documents" ? (
            <DocumentsList items={lists.documents ?? []} onOpenMember={setOpenMember} supabase={supabase} onDone={afterChange} />
          ) : (
            <MembersList items={(tab === "waiting" ? lists.waiting : lists.all) ?? []} waiting={tab === "waiting"} onOpen={setOpenMember} />
          )}
        </div>
      </div>

      {openMember && <MemberDrawer memberId={openMember} supabase={supabase} onClose={closeDrawer} onChanged={afterChange} />}

      {toast && (
        <div className="animate-fade-in pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center px-6">
          <div role="status" className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white shadow-lg">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sage">
              <CheckIcon size={11} className="text-ink" />
            </span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[26px] bg-mist px-6 py-12 text-center text-[15px] text-muted lg:bg-paper">{children}</div>;
}

function memberStatus(m: MemberListItem): string {
  if (m.deleted_at) return "Deleted";
  if (m.deletion_requested_at) return "Asked to delete";
  return m.approved ? "Approved" : "Waiting";
}

function MembersList({ items, waiting, onOpen }: { items: MemberListItem[]; waiting: boolean; onOpen: (id: string) => void }) {
  if (items.length === 0) return <Empty>{waiting ? "Nobody is waiting for approval." : "No members yet."}</Empty>;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      {items.map((m) => {
        const name = m.name?.trim() || m.email || "No name yet";
        const missing = m.missing ?? [];
        return (
          <button
            key={m.member_id}
            type="button"
            onClick={() => onOpen(m.member_id)}
            className="flex cursor-pointer items-start gap-3.5 rounded-[24px] border-none bg-paper p-4 text-left shadow-[0_12px_36px_rgba(5,5,5,0.08)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(5,5,5,0.12)] lg:p-5"
          >
            <Avatar mono={name.charAt(0).toUpperCase()} size={48} tone={m.side === "venue" ? "dark" : "light"} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 truncate font-serif text-[21px] leading-tight text-ink">{name}</div>
                <span className="flex-none rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
                  {sideLabel(m.side)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[13px] text-muted">{m.email}</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
                {!waiting && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                    <span className={cn("h-2 w-2 rounded-full", m.approved && !m.deleted_at ? "bg-sage" : "bg-dot-inactive")} />
                    {memberStatus(m)}
                  </span>
                )}
                <span className="text-label">
                  {waiting ? `Joined ${waitingFor(m.created_at)}` : `Joined ${formatDate(m.created_at)}`}
                </span>
              </div>
              {missing.length > 0 && !m.approved && (
                <div className="mt-2 text-[12.5px] text-ink-soft">
                  <span className="font-semibold text-ink">Missing:</span> {missing.join(", ")}
                </div>
              )}
              {waiting && missing.length === 0 && <div className="mt-2 text-[12.5px] font-semibold text-ink">Ready to approve</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DocumentsList({
  items,
  onOpenMember,
  supabase,
  onDone,
}: {
  items: DocumentListItem[];
  onOpenMember: (id: string) => void;
  supabase: ReturnType<typeof createClient>;
  onDone: (message: string) => Promise<void>;
}) {
  if (items.length === 0) return <Empty>No documents to check.</Empty>;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      {items.map((d) => (
        <DocumentCard
          key={d.document_id}
          doc={d}
          supabase={supabase}
          owner={`${d.member_name?.trim() || "No name yet"} · ${sideLabel(d.side)}`}
          onOpenOwner={() => onOpenMember(d.member_id)}
          onDone={onDone}
        />
      ))}
    </div>
  );
}
