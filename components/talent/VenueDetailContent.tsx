"use client";

import { useRouter } from "next/navigation";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { BookmarkIcon } from "@/components/icons";
import { FEED } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";

interface VenueDetailContentProps {
  feedId: string;
  variant?: "page" | "modal";
}

export function VenueDetailContent({ feedId, variant = "page" }: VenueDetailContentProps) {
  const router = useRouter();
  const { data, toggleSaved, requestIntro } = useAppStore();
  const vf = FEED.find((f) => f.id === feedId) ?? FEED[0];
  const introDone = !!data.intros[vf.id];
  const saved = !!data.saved[vf.id];
  const ctaLabel = vf.convo ? "Open conversation" : introDone ? "Intro requested" : "Request intro";
  const ctaMuted = !vf.convo && introDone;

  return (
    <div>
      <div
        className={cn(
          "overflow-hidden rounded-[28px] shadow-[0_14px_40px_rgba(5,5,5,0.10)]",
          variant === "modal" ? "h-[240px]" : "h-[250px]"
        )}
      >
        <PhotoTile mono={vf.mono} photoUrl={vf.photo} monoSize={84} className="h-full w-full">
          {vf.isNew && (
            <span className="absolute left-3 top-3 rounded-full bg-sage px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
              New · 12 min
            </span>
          )}
        </PhotoTile>
      </div>

      <h1
        className={cn(
          "mt-[18px] font-serif font-normal leading-none tracking-[-0.015em]",
          variant === "modal" ? "text-[44px]" : "text-[clamp(36px,8vw,52px)]"
        )}
      >
        {vf.venue}
      </h1>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-label">{vf.area}</div>

      <div className="mt-4 flex flex-wrap gap-[9px]">
        <span className="rounded-full bg-mist px-[15px] py-[9px] text-[12.5px] font-semibold">{vf.dates}</span>
        <span className="rounded-full bg-mist px-[15px] py-[9px] text-[12.5px] font-semibold">{vf.rate}</span>
        <span className="rounded-full bg-mist px-[15px] py-[9px] text-[12.5px] font-semibold">{vf.role}</span>
      </div>

      <div className="my-2 mt-[22px] text-[11px] font-semibold uppercase tracking-[0.14em] text-label">The room</div>
      <p className="m-0 text-[14.5px] leading-[1.6] text-[#4a4a4a]">{vf.room}</p>

      <div className="mt-[18px] rounded-[24px] bg-mist px-[19px] py-[18px]">
        <div className="font-serif text-[17.5px] italic leading-[1.4]">&ldquo;{vf.noteQ}&rdquo;</div>
        <div className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-label">{vf.noteA}</div>
      </div>

      {vf.scarcity && (
        <div className="mt-[18px] flex items-center gap-2.5">
          <span className="inline-flex">
            {["#E4E4E4", "#D6D6D6", "#C9C9C9"].map((bg, i) => (
              <span
                key={bg}
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white font-serif text-[11px]"
                style={{ background: bg, marginLeft: i === 0 ? 0 : -8 }}
              >
                {["R", "K", "M"][i]}
              </span>
            ))}
          </span>
          <span className="text-xs font-semibold text-muted">{vf.scarcity}</span>
        </div>
      )}

      <div
        className={cn(
          "mt-[22px] flex gap-2.5",
          variant === "page" && "sticky bottom-[18px] z-30"
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (vf.convo) router.push(`/talent/chat/${vf.convo}`);
            else requestIntro(vf.id);
          }}
          className={cn(
            "flex-1 cursor-pointer rounded-full border-none px-[22px] py-[17px] text-[15px] font-semibold",
            variant === "page" && "shadow-[0_16px_44px_rgba(5,5,5,0.22)]",
            ctaMuted ? "bg-mist text-muted" : "bg-ink text-white"
          )}
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          title="Save"
          onClick={() => toggleSaved(vf.id)}
          className={cn(
            "flex h-[54px] w-[54px] flex-none cursor-pointer items-center justify-center rounded-full border border-[#e0e0e0] bg-paper text-ink",
            variant === "page" && "shadow-[0_12px_34px_rgba(5,5,5,0.10)]"
          )}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>
    </div>
  );
}
