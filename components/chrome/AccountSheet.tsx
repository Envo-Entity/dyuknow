"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { Side } from "@/lib/types";

interface AccountSheetProps {
  open: boolean;
  side: Side;
  meName: string;
  meMono: string;
  meSub: string;
  onClose: () => void;
}

export function AccountSheet({ open, side, meName, meMono, meSub, onClose }: AccountSheetProps) {
  const router = useRouter();
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="animate-fade-in fixed inset-0 z-[80] bg-ink/30"
      />
      <div className="animate-view-in fixed bottom-[18px] left-3.5 right-3.5 z-[81] flex flex-col gap-3.5 rounded-[28px] bg-paper p-[22px] shadow-[0_30px_90px_rgba(5,5,5,0.28)] lg:bottom-auto lg:left-[104px] lg:right-auto lg:top-1/2 lg:w-[330px] lg:-translate-y-1/2">
        <div className="flex items-center gap-[13px]">
          <Avatar mono={meMono} size={48} />
          <div className="flex flex-col gap-0.5">
            <div className="font-serif text-2xl leading-none">{meName}</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-label">{meSub}</div>
          </div>
        </div>
        <div className="h-px bg-fog" />
        {side === "talent" && (
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/talent/me");
            }}
            className="flex cursor-pointer items-center justify-between rounded-full border border-border bg-paper px-5 py-[13px] text-sm font-semibold text-ink"
          >
            <span>My profile &amp; availability</span>
            <span className="text-faint">→</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/");
          }}
          className="flex cursor-pointer items-center justify-center gap-[9px] rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white"
        >
          Sign out
        </button>
        <div className="text-center text-[11.5px] text-faint">
          You&rsquo;ll return to the door — sign back in as venue or talent.
        </div>
      </div>
    </>
  );
}
