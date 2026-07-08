import { cn } from "@/lib/cn";

export function ChipsGrid({ chips, className }: { chips: [string, string][]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-[10px]", className)}>
      {chips.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-[3px] rounded-[18px] bg-mist px-[15px] py-[13px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-label">{k}</span>
          <span className="text-sm font-semibold leading-[1.25]">{v}</span>
        </div>
      ))}
    </div>
  );
}
