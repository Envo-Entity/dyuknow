"use client";

import { Page } from "@/components/layout/Page";
import { ConversationRow } from "./ConversationRow";
import { StatusCard } from "./StatusCard";
import { CONVOS, ME, PROP, TALENT } from "@/lib/data";
import { convoIdsForSide, lastMessagePreview, proposalStatus, useAppStore } from "@/lib/store";
import type { Side } from "@/lib/types";

const FIXED_TIME: Record<string, string> = {
  "larkspur-camille": "Today",
  "meridian-camille": "Today",
  "larkspur-elodie": "Jun",
};

export function MessagesView({ side }: { side: Side }) {
  const { data } = useAppStore();
  const isVenue = side === "venue";
  const convoIds = convoIdsForSide(side);
  const status = proposalStatus(data.proposal);

  return (
    <Page>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        Conversations · {ME[side].name}
      </div>
      <h1 className="mt-3.5 font-serif text-[clamp(40px,8.5vw,84px)] font-normal leading-none tracking-[-0.015em]">
        Messages
      </h1>
      <div className="lg:mt-[30px] lg:grid lg:grid-cols-[560px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="mt-5 flex flex-col gap-3">
          {convoIds.map((id) => {
            const c = CONVOS[id];
            const t = TALENT[c.talent];
            return (
              <ConversationRow
                key={id}
                href={`/${side}/chat/${id}`}
                mono={isVenue ? t.mono : c.venueMono}
                name={isVenue ? t.name : c.venue}
                sub={isVenue ? `${t.role} · ${t.pedigree}` : c.venueSub}
                preview={lastMessagePreview(id, data)}
                time={FIXED_TIME[id] ?? ""}
                unread={data.read[side]?.[id] !== true}
              />
            );
          })}
        </div>
        <div className="mt-5 hidden lg:block">
          <StatusCard
            href={`/${side}/chat/larkspur-camille`}
            mono={isVenue ? "C" : "L"}
            title="This weekend"
            line={isVenue ? "Camille Aubert · Guest Head Chef" : "The Larkspur · Guest Head Chef"}
            dates={PROP.dates}
            rate={PROP.rate}
            state={status.text}
            sage={status.sage}
          />
        </div>
      </div>
    </Page>
  );
}
