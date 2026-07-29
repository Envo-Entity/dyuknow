import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface CheckboxGroupProps {
  label?: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

export function CheckboxGroup({ label, options, selected, onToggle }: CheckboxGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-paper px-4 py-3.5 text-left"
            >
              <span
                className={cn(
                  "flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors",
                  checked ? "border-sage bg-sage" : "border-hairline bg-paper"
                )}
              >
                {checked && <CheckIcon size={11} className="text-ink" />}
              </span>
              <span className="text-[14px] font-medium leading-[1.4] text-ink">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
