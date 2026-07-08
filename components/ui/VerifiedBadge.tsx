import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export function VerifiedBadge({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      title="Verified"
      className={cn("inline-flex flex-none items-center justify-center rounded-full bg-sage", className)}
      style={{ width: size, height: size }}
    >
      <CheckIcon size={size * 0.56} />
    </span>
  );
}
