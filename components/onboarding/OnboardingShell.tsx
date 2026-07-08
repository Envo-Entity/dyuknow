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
    <div className="animate-view-in flex min-h-screen flex-col items-center bg-paper px-6 pb-14 pt-9">
      <div className="flex w-full max-w-[440px] items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className={cn(
            "flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border border-border bg-paper text-ink transition-opacity",
            step === 0 && "pointer-events-none opacity-0"
          )}
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 rounded-full transition-[width,background-color]", i === step ? "w-6 bg-sage" : "w-1.5 bg-mist")}
            />
          ))}
        </div>
        <div className="w-11 flex-none" />
      </div>
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</div>
    </div>
  );
}
