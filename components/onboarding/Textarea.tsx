interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength: number;
}

export function TextareaField({ label, value, onChange, placeholder, maxLength }: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
        <span className="text-[11px] font-semibold text-faint">
          {value.length} / {maxLength}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="resize-none rounded-2xl border border-border bg-paper px-4 py-3.5 text-[15px] leading-[1.5] text-ink placeholder:text-faint"
      />
    </label>
  );
}
