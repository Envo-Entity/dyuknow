import { cn } from "@/lib/cn";

interface SwitchFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchField({ label, description, value, onChange }: SwitchFieldProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-paper px-4 py-3.5 text-left"
    >
      <span>
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] text-muted">{description}</span>}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 flex-none rounded-full border transition-colors",
          value ? "border-sage bg-sage" : "border-border bg-mist"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
            value ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
