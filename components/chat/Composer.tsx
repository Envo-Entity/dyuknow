"use client";

import { useState } from "react";
import { PlusIcon, SendIcon } from "@/components/icons";

interface ComposerProps {
  chatName: string;
  showProposalButton: boolean;
  proposalLabel: string;
  onSendProposal: () => void;
  onSend: (text: string) => void;
}

export function Composer({ chatName, showProposalButton, proposalLabel, onSendProposal, onSend }: ComposerProps) {
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="fixed bottom-3.5 left-3 right-3 z-40 flex flex-col gap-2.5 lg:static lg:mt-3">
      {showProposalButton && (
        <button
          type="button"
          onClick={onSendProposal}
          className="flex-none cursor-pointer self-center whitespace-nowrap rounded-full border border-[#e0e0e0] bg-paper px-5 py-3 text-[13px] font-semibold text-ink shadow-[0_12px_34px_rgba(5,5,5,0.12)]"
        >
          <span className="inline-flex items-center gap-2">
            <PlusIcon />
            Send booking proposal · {proposalLabel}
          </span>
        </button>
      )}
      <div className="flex items-center gap-2 rounded-full border border-border-soft bg-paper py-1.5 pl-5 pr-1.5 shadow-[0_16px_48px_rgba(5,5,5,0.16)]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={`Write to ${chatName}…`}
          className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[14.5px] text-ink"
        />
        <button
          type="button"
          title="Send"
          onClick={send}
          className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-ink text-white"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
