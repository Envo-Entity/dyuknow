import { PhotoTile } from "@/components/ui/PhotoTile";
import { cn } from "@/lib/cn";
import type { LookPhoto } from "@/lib/types";

export function LookGallery({ look }: { look: LookPhoto[] }) {
  return (
    <div className="-mx-5 mt-3.5 flex gap-3 overflow-x-auto px-5 pb-3 pt-1.5 lg:mx-0 lg:mt-0 lg:grid lg:grid-cols-2 lg:gap-[18px] lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0">
      {look.map((t, i) => (
        <PhotoTile
          key={i}
          mono={t.mono}
          photoUrl={t.photo}
          monoSize={58}
          className={cn(
            "h-[300px] flex-none rounded-[26px] shadow-[0_12px_34px_rgba(5,5,5,0.09)] lg:h-auto lg:w-full",
            i === 0
              ? "w-[236px] lg:col-span-2 lg:aspect-[16/9]"
              : "w-[210px] lg:aspect-square"
          )}
        />
      ))}
    </div>
  );
}
