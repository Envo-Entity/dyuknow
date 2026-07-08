import { cn } from "@/lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex-none cursor-pointer rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-colors",
        active ? "border-ink bg-ink text-white" : "border-border bg-paper text-ink",
        className
      )}
      {...props}
    />
  );
}
