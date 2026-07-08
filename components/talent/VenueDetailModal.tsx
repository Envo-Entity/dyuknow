"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CloseIcon } from "@/components/icons";
import { FEED } from "@/lib/data";
import { VenueDetailContent } from "./VenueDetailContent";

export function VenueDetailModal({ feedId }: { feedId: string }) {
  const router = useRouter();
  const vf = FEED.find((f) => f.id === feedId) ?? FEED[0];
  const close = () => router.back();

  return (
    <>
      <div onClick={close} className="animate-fade-in fixed inset-0 z-[74] hidden bg-ink/[0.22] lg:block" />
      <div className="animate-view-in fixed inset-0 z-[75] overflow-y-auto bg-paper px-5 pb-[150px] pt-[22px] lg:animate-panel-in lg:inset-auto lg:bottom-3.5 lg:right-3.5 lg:top-3.5 lg:w-[min(620px,46vw)] lg:rounded-[30px] lg:px-[30px] lg:pb-[30px] lg:pt-[26px] lg:shadow-[0_40px_110px_rgba(5,5,5,0.30)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border border-border bg-paper text-ink lg:h-[42px] lg:w-[42px]"
          >
            <ArrowLeftIcon className="lg:hidden" />
            <CloseIcon className="hidden lg:block" />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{vf.role}</span>
        </div>
        <VenueDetailContent feedId={feedId} variant="modal" />
      </div>
    </>
  );
}
