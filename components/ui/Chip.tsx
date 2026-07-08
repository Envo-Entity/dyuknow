import { cn } from "@/lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex-none cursor-pointer rounded-full border px-5 py-2.5 text-[12.5px] font-semibold transition-colors",
        active ? "border-sage bg-sage text-ink" : "border-border bg-paper text-ink",
        className
      )}
      {...props}
    />
  );
}
