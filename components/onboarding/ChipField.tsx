import { Chip } from "@/components/ui/Chip";

interface ChipFieldProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

export function ChipField({ label, options, selected, onToggle }: ChipFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            active={selected.includes(option)}
            onClick={() => onToggle(option)}
            className="lg:px-6 lg:py-3 lg:text-[13.5px]"
          >
            {option}
          </Chip>
        ))}
      </div>
    </div>
  );
}
