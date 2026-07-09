import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { cn } from "@/lib/cn";
import type { FeedItem } from "@/lib/types";

interface FeedCardProps {
  item: FeedItem;
  showScarcity: boolean;
  large?: boolean;
  className?: string;
}

export function FeedCard({ item, showScarcity, large = false, className }: FeedCardProps) {
  return (
    <Link
      href={`/talent/venue/${item.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[26px] bg-paper shadow-[0_10px_32px_rgba(5,5,5,0.07)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(5,5,5,0.13)]",
        className
      )}
    >
      <PhotoTile mono={item.mono} photoUrl={item.photo} monoSize={64} className="aspect-[16/10]">
        {item.isNew && (
          <span className="absolute left-[11px] top-[11px] rounded-full bg-sage px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
            New · 12 min
          </span>
        )}
      </PhotoTile>
      <div className="flex flex-1 flex-col gap-[3px] px-[17px] pb-4 pt-3.5">
        <div className={cn("font-serif leading-[1.05]", large ? "text-[24px] lg:text-[30px]" : "text-[19px] lg:text-[22px]")}>
          {item.venue}
        </div>
        <div className="text-xs text-label">{item.area}</div>
        <div className="mt-0.5 text-[13px] font-semibold">
          {item.role} · {item.dates}
        </div>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2.5 pt-[7px]">
          <span className="whitespace-nowrap text-[12.5px] text-muted">{item.rate}</span>
          {showScarcity && item.scarcity && (
            <span className="whitespace-nowrap text-[11px] font-semibold text-faint">{item.scarcity}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
