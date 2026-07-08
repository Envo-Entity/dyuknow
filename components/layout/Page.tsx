import { cn } from "@/lib/cn";

interface PageProps {
  variant?: "hero" | "detail";
  className?: string;
  children: React.ReactNode;
}

export function Page({ variant = "hero", className, children }: PageProps) {
  return (
    <div
      className={cn(
        "animate-view-in min-h-screen px-5 pb-[150px] lg:px-[60px] lg:pb-[90px] lg:pl-[158px] lg:pt-14",
        variant === "hero" ? "pt-16" : "pt-[22px]",
        className
      )}
    >
      {children}
    </div>
  );
}
