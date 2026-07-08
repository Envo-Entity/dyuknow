import { cn } from "@/lib/cn";
import type { DayCell } from "@/lib/store";

const STATE_LABEL: Record<DayCell["state"], string> = {
  booked: "Booked",
  open: "Open",
  held: "Held",
};

const STATE_CLASS: Record<DayCell["state"], string> = {
  booked: "bg-ink text-white",
  open: "bg-sage text-ink",
  held: "bg-mist text-faint",
};

interface AvailabilityStripProps {
  days: DayCell[];
  onToggle?: (day: DayCell["day"]) => void;
}

export function AvailabilityStrip({ days, onToggle }: AvailabilityStripProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((day) => {
        const disabled = day.state === "booked" || !onToggle;
        const Tag = onToggle ? "button" : "div";
        return (
          <Tag
            key={day.day}
            type={onToggle ? "button" : undefined}
            disabled={onToggle ? disabled : undefined}
            onClick={onToggle && !disabled ? () => onToggle(day.day) : undefined}
            className={cn(
              "flex min-w-[40px] flex-1 flex-col items-center gap-px rounded-2xl px-1 pb-2 pt-[9px] transition-colors",
              onToggle && !disabled && "cursor-pointer",
              STATE_CLASS[day.state]
            )}
          >
            <span className="text-[10.5px] font-bold">{day.day}</span>
            <span className="font-serif text-[15px]">{day.num}</span>
            {onToggle && (
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.08em]">
                {STATE_LABEL[day.state]}
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
