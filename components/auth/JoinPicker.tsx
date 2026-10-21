"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ForkPanel } from "@/components/fork/ForkPanel";
import { loadJoinDraft, updateJoinDraft, type JoinDraft, type Side } from "@/lib/onboardingSelfServe";

export function JoinPicker({ userId }: { userId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<JoinDraft | null>(null);

  useEffect(() => {
    // Local storage only exists in the browser, so the draft is read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadJoinDraft(userId));
  }, [userId]);

  function choose(side: Side) {
    updateJoinDraft(userId, { side });
    router.push(`/join/${side}`);
  }

  return (
    <div className="animate-view-in flex min-h-screen flex-col bg-paper lg:bg-mist">
      <div className="flex flex-col items-center gap-1.5 px-6 pb-2 pt-9 lg:pt-14">
        <div className="font-serif text-[30px] tracking-[-0.01em] lg:text-[40px]">Who are you?</div>
        <p className="mt-1 max-w-[420px] text-center text-[14px] leading-[1.55] text-muted lg:text-[15px]">
          Choose once. Your answers stay on this device until you submit.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-[26px] pt-[18px] lg:flex-row lg:gap-5 lg:px-10 lg:pb-16">
        <ForkPanel
          onClick={() => choose("venue")}
          eyebrow="Venue"
          heading={
            <>
              Venue, looking <span className="font-serif italic font-normal">to hire</span>
            </>
          }
          body="A restaurant, hotel, bar or venue — set up your listing and book vetted, verified talent."
          continueLabel={draft?.venue ? "Continue your venue profile" : "Set up your venue"}
          subLabel={draft?.side === "venue" && draft.venue ? "Draft saved on this device" : undefined}
        />
        <ForkPanel
          onClick={() => choose("talent")}
          dark
          eyebrow="Talent"
          heading={
            <>
              Talent, looking <span className="font-serif italic font-normal">for work</span>
            </>
          }
          body="A chef, front of house, bar, events or management pro — build your profile and take shifts worth taking."
          continueLabel={draft?.talent ? "Continue your profile" : "Build your profile"}
          subLabel={draft?.side === "talent" && draft.talent ? "Draft saved on this device" : undefined}
        />
      </div>
    </div>
  );
}
