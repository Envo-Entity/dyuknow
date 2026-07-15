import { cn } from "@/lib/cn";

export function AvailabilityBadge({ text, sage, className }: { text: string; sage: boolean; className?: string }) {
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] rounded-full px-[13px] py-2 text-[11.5px] font-bold",
        sage ? "bg-sage/25" : "bg-mist",
        className
      )}
    >
      <span
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: sage ? "var(--color-sage)" : "var(--color-dot-inactive)" }}
      />
      {text}
    </span>
  );
}
