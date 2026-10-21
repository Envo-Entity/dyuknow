"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Avatar } from "@/components/ui/Avatar";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { DocumentCard } from "./DocumentCard";
import { errorMessage, formatDate, photoPath, readableAnswers, sideLabel } from "./format";
import type { MemberDetail } from "./types";

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-label";
const pillBtn =
  "cursor-pointer rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0";

/**
 * Everything about one member: answers, what's missing, documents, and the
 * approval switch. Phone: a full-screen sheet. Desktop: a panel from the right.
 */
export function MemberDrawer({
  memberId,
  supabase,
  onClose,
  onChanged,
}: {
  memberId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  /** Called after any change, with the toast text. */
  onChanged: (message: string) => Promise<void>;
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_get_member", { p_member_id: memberId });
    if (error) {
      setLoadError(errorMessage(error));
      return;
    }
    setLoadError(null);
    setDetail(data as MemberDetail);
  }, [supabase, memberId]);

  useEffect(() => {
    // Fetch on open; state is set once the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function setApproval(approved: boolean) {
    setBusy(true);
    setActionError(null);
    const { error } = await supabase.rpc("admin_set_approval", {
      p_member_id: memberId,
      p_approved: approved,
      p_note: note.trim() || null,
    });
    if (error) {
      setBusy(false);
      setActionError(errorMessage(error));
      return;
    }
    await Promise.all([load(), onChanged(approved ? `${name} is approved.` : `Approval taken away from ${name}.`)]);
    setBusy(false);
    setNote("");
    setConfirmingRemove(false);
  }

  async function afterDocument(message: string) {
    await Promise.all([load(), onChanged(message)]);
  }

  const profile = detail?.profile ?? null;
  const side = detail?.member.side ?? "talent";
  const name =
    (side === "talent" ? (profile?.full_name as string | undefined) : (profile?.display_name as string | undefined))?.trim() ||
    detail?.email ||
    "This member";
  const photo = photoPath(profile);
  const photoUrl = photo ? supabase.storage.from("member-photos").getPublicUrl(photo).data.publicUrl : null;
  const missing = detail?.missing ?? [];
  const member = detail?.member;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Member: ${name}`}>
      <button type="button" aria-label="Close" onClick={onClose} className="animate-fade-in absolute inset-0 hidden cursor-default border-none bg-ink/30 lg:block" />
      <div className="animate-panel-in relative flex h-full w-full flex-col overflow-y-auto bg-mist lg:w-[600px] lg:shadow-[0_0_60px_rgba(5,5,5,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-mist/90 px-5 pb-2 pt-5 backdrop-blur lg:px-8 lg:pt-7">
          <div className={labelClass}>Member</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-paper text-ink transition-transform hover:-translate-y-0.5"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {loadError && !detail && <p className="px-5 py-10 text-[15px] text-ink lg:px-8">{loadError}</p>}
        {!loadError && !detail && <p className="px-5 py-10 text-[15px] text-muted lg:px-8">Loading…</p>}

        {detail && member && (
          <div className="flex flex-col gap-5 px-5 pb-16 pt-2 lg:px-8">
            {/* Who */}
            <div className="flex items-center gap-4">
              <Avatar mono={name.charAt(0).toUpperCase()} size={64} photoUrl={photoUrl} />
              <div className="min-w-0">
                <div className="font-serif text-[30px] leading-[1.05] tracking-[-0.01em] text-ink lg:text-[36px]">{name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                    {sideLabel(member.side)}
                  </span>
                  <span className="break-all">{detail.email ?? "No login email"}</span>
                </div>
                <div className="mt-1 text-[12px] text-label">Joined {formatDate(member.created_at)}</div>
              </div>
            </div>

            {/* Approval */}
            <section className="rounded-[24px] bg-paper p-5 shadow-[0_12px_36px_rgba(5,5,5,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className={labelClass}>Approval</div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                    member.approved ? "bg-sage/30 text-ink" : "bg-mist text-ink",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", member.approved ? "bg-sage" : "bg-dot-inactive")} />
                  {member.deleted_at ? "Deleted" : member.approved ? `Approved ${formatDate(member.approved_at)}` : "Waiting"}
                </span>
              </div>
              {member.deletion_requested_at && !member.deleted_at && (
                <p className="mt-2 text-[13px] text-ink-soft">Asked to delete their account on {formatDate(member.deletion_requested_at)}.</p>
              )}

              {missing.length > 0 && (
                <div className="mt-3 rounded-2xl bg-mist px-4 py-3">
                  <div className="text-[13px] font-semibold text-ink">Still missing</div>
                  <div className="mt-0.5 text-[13.5px] text-ink-soft">{missing.join(", ")}</div>
                </div>
              )}

              {!member.deleted_at && (
                <div className="mt-4 flex flex-col gap-2">
                  <label htmlFor="approval-note" className={labelClass}>
                    Note for the log (optional)
                  </label>
                  <textarea
                    id="approval-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={member.approved ? "Why approval is being taken away" : "e.g. Checked references by phone"}
                    className="w-full resize-none rounded-2xl border border-border bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                  />

                  {member.approved ? (
                    confirmingRemove ? (
                      <div className="mt-1 rounded-2xl border border-ink p-4">
                        <p className="text-[14px] text-ink">
                          Take approval away from {name}? They stop showing to {member.side === "talent" ? "venues" : "talent"} and any waiting
                          answers end. They aren’t told; let them know yourself.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={busy} onClick={() => setApproval(false)} className={cn(pillBtn, "border-none bg-ink text-white")}>
                            {busy ? "Saving…" : "Take approval away"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmingRemove(false)}
                            className={cn(pillBtn, "border border-border bg-paper text-ink")}
                          >
                            Keep approved
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setConfirmingRemove(true);
                          }}
                          className={cn(pillBtn, "border border-border bg-paper text-ink")}
                        >
                          Take approval away
                        </button>
                      </div>
                    )
                  ) : (
                    <div>
                      <button type="button" disabled={busy} onClick={() => setApproval(true)} className={cn(pillBtn, "border-none bg-ink text-white")}>
                        {busy ? "Approving…" : "Approve"}
                      </button>
                    </div>
                  )}

                  {actionError && (
                    <p role="alert" className="text-[13.5px] font-semibold text-ink">
                      {actionError}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Documents */}
            <section className="flex flex-col gap-2.5">
              <div className={cn(labelClass, "px-1")}>Documents · {detail.documents.length}</div>
              {detail.documents.length === 0 ? (
                <p className="rounded-[20px] bg-paper px-4 py-4 text-[14px] text-muted">No documents uploaded.</p>
              ) : (
                detail.documents.map((doc) => <DocumentCard key={doc.document_id} doc={doc} supabase={supabase} onDone={afterDocument} />)
              )}
            </section>

            {/* Answers */}
            {readableAnswers(member.side, profile).map((group) => (
              <section key={group.title} className="rounded-[24px] bg-paper p-5 shadow-[0_12px_36px_rgba(5,5,5,0.06)]">
                <div className={labelClass}>{group.title}</div>
                <dl className="mt-3 flex flex-col divide-y divide-border-soft">
                  {group.rows.map((row) => (
                    <div key={row.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                      <dt className="flex-none text-[13px] text-muted sm:w-[42%]">{row.label}</dt>
                      <dd
                        className={cn(
                          "min-w-0 whitespace-pre-line break-words text-[14px]",
                          row.value === null ? "text-faint" : "text-ink",
                          row.agreement === false && "font-semibold",
                        )}
                      >
                        {row.value ?? "Not answered"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {!profile && <p className="text-[14px] text-muted">No profile answers saved.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
