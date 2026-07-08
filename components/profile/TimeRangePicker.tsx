interface TimeRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function TimeRangePicker({ from, to, onChange }: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
      <span className="text-faint">Available</span>
      <input
        type="time"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="rounded-xl border border-border bg-paper px-3 py-2 text-[13px] font-semibold text-ink"
      />
      <span className="text-faint">to</span>
      <input
        type="time"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="rounded-xl border border-border bg-paper px-3 py-2 text-[13px] font-semibold text-ink"
      />
    </div>
  );
}
