import { TimeRangePicker } from "@/components/profile/TimeRangePicker";
import { cn } from "@/lib/cn";
import type { DayCell } from "@/lib/store";
import type { DayCode } from "@/lib/types";

interface AvailabilityCalendarProps {
  days: DayCell[];
  onToggle: (day: DayCode) => void;
  from: string;
  to: string;
  onTimeChange: (from: string, to: string) => void;
}

export function AvailabilityCalendar({ days, onToggle, from, to, onTimeChange }: AvailabilityCalendarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-border-soft bg-paper p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">September</div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const booked = day.state === "booked";
          const open = day.state === "open";
          return (
            <button
              key={day.day}
              type="button"
              disabled={booked}
              onClick={() => onToggle(day.day)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-3 transition-colors",
                booked && "bg-ink text-white",
                open && "bg-sage text-ink",
                !booked && !open && "bg-mist text-faint hover:bg-fog"
              )}
            >
              <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] opacity-70">{day.day}</span>
              <span className="font-serif text-[17px] leading-none">{day.num}</span>
            </button>
          );
        })}
      </div>
      <div className="h-px bg-border-soft" />
      <TimeRangePicker from={from} to={to} onChange={onTimeChange} />
    </div>
  );
}
