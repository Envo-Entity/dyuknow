interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FormField({ label, value, onChange, placeholder }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-border bg-paper px-4 py-3.5 text-[15px] text-ink placeholder:text-faint"
      />
    </label>
  );
}
