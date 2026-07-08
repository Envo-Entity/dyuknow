"use client";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useRouteFlags } from "@/lib/useRoute";
import type { Side } from "@/lib/types";

interface IdentityPillProps {
  side: Side;
  meName: string;
  meMono: string;
  onClick: () => void;
}

export function IdentityPill({ side, meName, meMono, onClick }: IdentityPillProps) {
  const { isChat } = useRouteFlags();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed right-4 top-3.5 z-[70] flex cursor-pointer items-center gap-[9px] rounded-full bg-white/94 py-1.5 pl-1.5 pr-[13px] shadow-[0_8px_28px_rgba(5,5,5,0.12)] backdrop-blur-md lg:hidden",
        isChat && "hidden"
      )}
    >
      <Avatar mono={meMono} size={28} />
      <span className="text-[13px] font-semibold">{meName}</span>
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-label">{side}</span>
    </button>
  );
}
