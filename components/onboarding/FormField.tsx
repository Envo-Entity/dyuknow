import { cn } from "@/lib/cn";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  prefix?: string;
}

export function FormField({ label, value, onChange, placeholder, type = "text", inputMode, maxLength, prefix }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
      <div className={cn("flex items-center rounded-2xl border border-border bg-paper", prefix && "pl-4")}>
        {prefix && <span className="text-[15px] font-semibold text-faint lg:text-[16px]">{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          className={cn(
            "w-full bg-transparent px-4 py-3.5 text-[15px] text-ink placeholder:text-faint lg:px-5 lg:py-4 lg:text-[16px]",
            prefix && "pl-1.5"
          )}
        />
      </div>
    </label>
  );
}
