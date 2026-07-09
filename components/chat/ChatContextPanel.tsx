import { PhotoTile } from "@/components/ui/PhotoTile";
import { ChipsGrid } from "@/components/profile/ChipsGrid";
import { cn } from "@/lib/cn";

interface ChatContextPanelProps {
  mono: string;
  photo?: string;
  name: string;
  pedigree: string;
  chips: [string, string][];
  statusText: string;
  statusSage: boolean;
}

export function ChatContextPanel({ mono, photo, name, pedigree, chips, statusText, statusSage }: ChatContextPanelProps) {
  return (
    <div className="hidden min-h-0 flex-col gap-[15px] overflow-y-auto py-1 pr-1.5 lg:flex">
      <PhotoTile mono={mono} photoUrl={photo} monoSize={88} className="h-80 flex-none rounded-[30px] shadow-[0_16px_44px_rgba(5,5,5,0.10)]" />
      <div>
        <div className="font-serif text-[38px] leading-none">{name}</div>
        <div className="mt-[7px] text-[13px] text-muted">{pedigree}</div>
      </div>
      <ChipsGrid chips={chips} />
      <div className="flex items-center justify-between rounded-[22px] border border-border-soft bg-paper px-[17px] py-3.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-label">This weekend</span>
        <span
          className={cn(
            "rounded-full px-[13px] py-[7px] text-[11.5px] font-bold",
            statusSage ? "bg-sage text-ink" : "bg-mist text-muted"
          )}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}
