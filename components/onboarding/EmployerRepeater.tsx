import { PlusIcon } from "@/components/icons";
import { FormField } from "@/components/onboarding/FormField";
import type { EmployerEntry } from "@/lib/types";

const EMPTY_ENTRY: EmployerEntry = { restaurant: "", position: "", dates: "" };
const MAX_EMPLOYERS = 3;

interface EmployerRepeaterProps {
  label: string;
  value: EmployerEntry[];
  onChange: (next: EmployerEntry[]) => void;
}

export function EmployerRepeater({ label, value, onChange }: EmployerRepeaterProps) {
  function update(index: number, patch: Partial<EmployerEntry>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
      {value.map((entry, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl border border-border-soft bg-mist p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted lg:text-[13.5px]">Employer {index + 1}</span>
            <button
              type="button"
              onClick={() => remove(index)}
              className="cursor-pointer text-[12.5px] font-semibold text-ink underline underline-offset-2 lg:text-[13.5px]"
            >
              Remove
            </button>
          </div>
          <FormField label="Restaurant" value={entry.restaurant} onChange={(v) => update(index, { restaurant: v })} placeholder="e.g. The Larkspur" />
          <FormField label="Position" value={entry.position} onChange={(v) => update(index, { position: v })} placeholder="e.g. Sous Chef" />
          <FormField label="Dates" value={entry.dates} onChange={(v) => update(index, { dates: v })} placeholder="e.g. 2022–2024" />
        </div>
      ))}
      {value.length < MAX_EMPLOYERS && (
        <button
          type="button"
          onClick={() => onChange([...value, EMPTY_ENTRY])}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline py-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink lg:py-3.5 lg:text-[14px]"
        >
          <PlusIcon size={13} />
          Add {value.length === 0 ? "an employer" : "another employer"}
        </button>
      )}
    </div>
  );
}
