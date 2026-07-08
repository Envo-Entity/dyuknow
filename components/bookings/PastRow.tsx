import { PhotoTile } from "@/components/ui/PhotoTile";
import type { PastEntry } from "@/lib/types";

export function PastRow({ entry }: { entry: PastEntry }) {
  return (
    <div className="flex items-center gap-[13px] rounded-[22px] bg-paper px-[15px] py-3 shadow-[0_10px_28px_rgba(5,5,5,0.07)]">
      <PhotoTile mono={entry.mono} monoSize={20} className="h-[46px] w-[46px] flex-none rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="font-serif text-lg leading-[1.1]">{entry.title}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-faint">{entry.sub}</span>
      </div>
      <span className="flex-none text-[10.5px] font-semibold uppercase tracking-[0.08em] text-hairline">
        {entry.dates}
      </span>
    </div>
  );
}
