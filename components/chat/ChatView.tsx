"use client";

import { useEffect, useRef } from "react";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { BackButton } from "@/components/ui/BackButton";
import { ChatBubble } from "./ChatBubble";
import { ProposalCard } from "./ProposalCard";
import { SystemMessage } from "./SystemMessage";
import { ChatContextPanel } from "./ChatContextPanel";
import { Composer } from "./Composer";
import { CONVOS, FEED, PROP, TALENT } from "@/lib/data";
import { proposalStatus, useAppStore } from "@/lib/store";
import type { Side } from "@/lib/types";

function feedForChat(chatId: string) {
  return chatId === "meridian-camille" ? FEED[1] : FEED[0];
}

export function ChatView({ side, chatId }: { side: Side; chatId: string }) {
  const { data, sendMessage, sendProposal, acceptProposal, declineProposal, markRead } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isVenue = side === "venue";
  const meta = CONVOS[chatId] ?? CONVOS["larkspur-camille"];
  const talent = TALENT[meta.talent];
  const chatName = isVenue ? talent.name : meta.venue;
  const chatSub = isVenue ? `${talent.role} · Verified` : meta.venueSub;
  const chatMono = isVenue ? talent.mono : meta.venueMono;
  const messages = data.convos[chatId] ?? [];
  const status = proposalStatus(data.proposal);
  const isPrimaryConvo = chatId === "larkspur-camille";
  const showProposalButton = isVenue && isPrimaryConvo && (data.proposal === "none" || data.proposal === "declined");

  const ctxChips: [string, string][] = isVenue
    ? talent.chips.slice(0, 4)
    : [
        ["Role", feedForChat(chatId).role],
        ["Dates", feedForChat(chatId).dates],
        ["Rate", feedForChat(chatId).rate],
        ["Room", feedForChat(chatId).area],
      ];

  useEffect(() => {
    markRead(side, chatId);
  }, [side, chatId, markRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div className="animate-view-in min-h-screen px-5 pb-[170px] pt-4 lg:px-[60px] lg:pb-[90px] lg:pl-[158px] lg:pt-14">
      <div className="lg:grid lg:h-[calc(100vh-150px)] lg:grid-cols-[minmax(0,1fr)_540px] lg:items-stretch lg:gap-10">
        <ChatContextPanel
          mono={isVenue ? chatMono : feedForChat(chatId).mono}
          name={chatName}
          pedigree={isVenue ? talent.pedigree : feedForChat(chatId).area}
          chips={ctxChips}
          statusText={isPrimaryConvo ? status.text : "In conversation"}
          statusSage={isPrimaryConvo && status.sage}
        />
        <div className="flex h-full flex-col overflow-hidden lg:rounded-[30px] lg:bg-paper lg:px-[26px] lg:pb-5 lg:pt-3.5 lg:shadow-[0_24px_70px_rgba(5,5,5,0.10)]">
          <div className="flex items-center gap-3 border-b border-border-soft py-1.5 pb-[13px]">
            <BackButton fallback={`/${side}/messages`} />
            <PhotoTile mono={chatMono} monoSize={19} className="h-[42px] w-[42px] flex-none rounded-full" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-serif text-xl leading-none">{chatName}</span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.1em] text-label">
                {chatSub}
              </span>
            </div>
          </div>

          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-[9px] overflow-y-auto pb-3 pt-[18px] lg:pb-0">
            <div className="mb-1 self-center text-[10.5px] font-semibold uppercase tracking-[0.12em] text-hairline">
              Today
            </div>
            {messages.map((m, i) => {
              if (m.kind === "text") return <ChatBubble key={i} text={m.text ?? ""} mine={m.from === side} />;
              if (m.kind === "proposal")
                return (
                  <ProposalCard
                    key={i}
                    role={PROP.role}
                    dates={PROP.dates}
                    rate={PROP.rate}
                    venue={PROP.venue}
                    proposal={data.proposal}
                    isVenue={isVenue}
                    onAccept={() => acceptProposal(side)}
                    onDecline={declineProposal}
                  />
                );
              return <SystemMessage key={i} text={m.text ?? ""} href={`/${side}/bookings`} />;
            })}
          </div>

          <Composer
            chatName={chatName}
            showProposalButton={showProposalButton}
            proposalLabel={PROP.dates}
            onSendProposal={sendProposal}
            onSend={(text) => sendMessage(chatId, side, text)}
          />
        </div>
      </div>
    </div>
  );
}
