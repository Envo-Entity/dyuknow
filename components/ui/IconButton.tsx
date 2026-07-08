import { cn } from "@/lib/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
  variant?: "outline" | "solid" | "ghost";
}

export function IconButton({ size = 44, variant = "outline", className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-none cursor-pointer items-center justify-center rounded-full transition-transform hover:-translate-y-0.5",
        variant === "outline" && "border border-border bg-paper text-ink",
        variant === "solid" && "border-none bg-ink text-white",
        variant === "ghost" && "border-none bg-mist text-ink",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {children}
    </button>
  );
}
