"use client";

import { ArrowLeftIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface OnboardingShellProps {
  step: number;
  total: number;
  onBack: () => void;
  children: React.ReactNode;
}

export function OnboardingShell({ step, total, onBack, children }: OnboardingShellProps) {
  return (
    <div className="animate-view-in flex min-h-screen flex-col items-center bg-paper px-6 pb-14 pt-9 lg:gap-8 lg:bg-mist lg:px-10 lg:py-16">
      <div className="flex w-full max-w-[440px] items-center gap-3 lg:max-w-[600px]">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className={cn(
            "flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border border-border bg-paper text-ink transition-opacity lg:h-12 lg:w-12",
            step === 0 && "pointer-events-none opacity-0"
          )}
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] lg:h-2",
                i === step ? "w-6 bg-sage lg:w-8" : "w-1.5 bg-mist lg:w-2 lg:bg-dot-inactive"
              )}
            />
          ))}
        </div>
        <div className="w-11 flex-none lg:w-12" />
      </div>
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center py-10 lg:max-w-[600px] lg:rounded-[30px] lg:bg-paper lg:px-14 lg:py-14 lg:shadow-[0_20px_60px_rgba(5,5,5,0.08)]">
        {children}
      </div>
    </div>
  );
}
