"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cn } from "@/lib/cn";
import { errorMessage, fileSize, formatDateTime, waitingFor } from "./format";
import type { DocumentStatus } from "./types";

export type DocumentLike = {
  document_id: string;
  label: string;
  original_filename: string | null;
  storage_path: string;
  size_bytes: number | null;
  status: DocumentStatus;
  uploaded_at: string;
  reject_reason: string | null;
};

const STATUS_TEXT: Record<DocumentStatus, string> = {
  review: "To check",
  verified: "Verified",
  rejected: "Not accepted",
};

export function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        status === "verified" && "bg-sage/30 text-ink",
        status === "review" && "bg-mist text-ink",
        status === "rejected" && "border border-ink text-ink",
      )}
    >
      {status === "verified" && <span className="h-1.5 w-1.5 rounded-full bg-sage" />}
      {STATUS_TEXT[status]}
    </span>
  );
}

const pillBtn =
  "cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0";

/**
 * One document with Open / Verify / Reject. Rejecting asks for a reason first;
 * the database refuses a blank one too ("Add a reason.").
 */
export function DocumentCard({
  doc,
  supabase,
  owner,
  onOpenOwner,
  onDone,
}: {
  doc: DocumentLike;
  supabase: SupabaseClient;
  /** Shown in the documents list: whose document it is. */
  owner?: string;
  onOpenOwner?: () => void;
  onDone: (message: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<null | "open" | "verify" | "reject">(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function open() {
    setBusy("open");
    setLocalError(null);
    // Open the tab now, while the tap still counts, so pop-up blockers allow it.
    const win = window.open("about:blank", "_blank");
    const { data, error } = await supabase.storage.from("member-documents").createSignedUrl(doc.storage_path, 300);
    setBusy(null);
    if (error || !data?.signedUrl) {
      win?.close();
      setLocalError(error?.message ? `Couldn’t open the file: ${error.message}` : "Couldn’t open the file.");
      return;
    }
    if (win) {
      win.opener = null;
      win.location.href = data.signedUrl;
    } else {
      window.open(data.signedUrl, "_blank", "noopener");
    }
  }

  async function review(verdict: "verified" | "rejected") {
    const trimmed = reason.trim();
    if (verdict === "rejected" && !trimmed) {
      setLocalError("Add a reason.");
      return;
    }
    setBusy(verdict === "verified" ? "verify" : "reject");
    setLocalError(null);
    const { error } = await supabase.rpc("admin_review_document", {
      p_document_id: doc.document_id,
      p_verdict: verdict,
      p_reason: verdict === "rejected" ? trimmed : null,
    });
    if (error) {
      setBusy(null);
      setLocalError(errorMessage(error));
      return;
    }
    // Keep the buttons busy until the lists have reloaded, so the card never
    // shows its old status after a successful review.
    await onDone(verdict === "verified" ? `${doc.label} verified.` : `${doc.label} rejected.`);
    setBusy(null);
    setRejecting(false);
    setReason("");
  }

  return (
    <div className="rounded-[20px] bg-paper p-4 shadow-[0_8px_28px_rgba(5,5,5,0.06)] lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">{doc.label}</div>
          {owner && (
            <button
              type="button"
              onClick={onOpenOwner}
              className="mt-0.5 cursor-pointer border-none bg-transparent p-0 text-left font-serif text-[18px] text-ink underline decoration-border underline-offset-4 hover:decoration-ink"
            >
              {owner}
            </button>
          )}
          <div className="mt-1 truncate text-[12.5px] text-muted">
            {[doc.original_filename, fileSize(doc.size_bytes)].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-0.5 text-[12px] text-label">
            Uploaded {formatDateTime(doc.uploaded_at)}
            {doc.status === "review" ? ` · ${waitingFor(doc.uploaded_at)}` : ""}
          </div>
        </div>
        <StatusPill status={doc.status} />
      </div>

      {doc.status === "rejected" && doc.reject_reason && (
        <p className="mt-2 text-[13px] text-ink-soft">Reason: {doc.reject_reason}</p>
      )}

      {rejecting ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label" htmlFor={`reason-${doc.document_id}`}>
            Why it isn’t accepted (the member sees this)
          </label>
          <textarea
            id={`reason-${doc.document_id}`}
            autoFocus
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The photo is blurred"
            className="w-full resize-none rounded-2xl border border-border bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null || !reason.trim()}
              onClick={() => review("rejected")}
              className={cn(pillBtn, "border-none bg-ink text-white")}
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setRejecting(false);
                setLocalError(null);
              }}
              className={cn(pillBtn, "border border-border bg-paper text-ink")}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={open} className={cn(pillBtn, "border border-border bg-paper text-ink")}>
            {busy === "open" ? "Opening…" : "Open"}
          </button>
          {doc.status !== "verified" && (
            <button type="button" disabled={busy !== null} onClick={() => review("verified")} className={cn(pillBtn, "border-none bg-ink text-white")}>
              {busy === "verify" ? "Verifying…" : "Verify"}
            </button>
          )}
          {doc.status !== "rejected" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setRejecting(true);
                setLocalError(null);
              }}
              className={cn(pillBtn, "border border-border bg-paper text-ink")}
            >
              Reject
            </button>
          )}
        </div>
      )}

      {localError && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-ink">
          {localError}
        </p>
      )}
    </div>
  );
}
