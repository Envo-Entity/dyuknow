import { cn } from "@/lib/cn";

export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-label", className)}>
      {children}
    </div>
  );
}
