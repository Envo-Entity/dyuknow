"use client";

import { CheckIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

interface PassRow {
  label: string;
  value: string;
}

interface CompleteStepProps {
  mono: string;
  photo?: string | null;
  avatarTone?: "light" | "dark";
  /** Uppercase label above the name, inside the sage pass. */
  eyebrow: string;
  /** The big serif line — the member's or venue's name. */
  name: string;
  /** One line under the name (role, or venue type). */
  meta?: string;
  /** Credential rows along the bottom of the pass. */
  rows: PassRow[];
  /** The congratulatory line under the pass — bold base clause, serif-italic tail. */
  headline: React.ReactNode;
  /** Body copy under the headline. */
  body: React.ReactNode;
  /** Optional block between the body and the CTA (e.g. the venue's "pass is open" pill). */
  extra?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}

/**
 * The final onboarding screen, both sides: one sage hero panel that reads as
 * the member's pass being minted (this is the view's single bold sage moment,
 * per DESIGN.md), then the welcome copy and the CTA. The reveal is staggered
 * by `.celebrate > *` in globals.css — order the children accordingly.
 */
export function CompleteStep({ mono, photo, avatarTone = "light", eyebrow, name, meta, rows, headline, body, extra, error, children }: CompleteStepProps) {
  return (
    <div className="celebrate flex flex-col items-center gap-6 text-center lg:gap-7">
      <div className="pass-panel relative w-full overflow-hidden rounded-[26px] bg-sage px-6 py-8 lg:px-10 lg:py-10">
        <span aria-hidden className="pass-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <div className="relative flex flex-col items-center">
          <div className="seal relative">
            <Avatar mono={mono} photoUrl={photo} size={72} tone={avatarTone} className="ring-4 ring-paper" />
            <span className="seal-burst absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink shadow-[0_4px_12px_rgba(5,5,5,0.16)]">
              <CheckIcon size={13} />
            </span>
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{eyebrow}</div>
          <div className="mt-1.5 font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-ink lg:text-[44px]">{name}</div>
          {meta && <div className="mt-1.5 max-w-[320px] text-[13px] text-ink-soft lg:text-[14px]">{meta}</div>}
        </div>
        {rows.length > 0 && (
          <div className="relative mt-6 flex items-stretch justify-center gap-5 border-t border-ink/10 pt-4 lg:mt-7 lg:gap-8 lg:pt-5">
            {rows.map((row, i) => (
              <div key={row.label} className={cn("flex flex-col items-center gap-1", i > 0 && "border-l border-ink/10 pl-5 lg:pl-8")}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{row.label}</span>
                <span className="text-[13px] font-semibold text-ink lg:text-[14px]">{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="max-w-[360px] text-[19px] font-bold leading-[1.25] tracking-[-0.01em] lg:max-w-[420px] lg:text-[22px]">{headline}</p>
      <p className="-mt-3 max-w-[360px] text-[14.5px] leading-[1.6] text-ink-soft lg:-mt-4 lg:max-w-[420px] lg:text-[16px]">{body}</p>
      {extra}
      {error && <p className="text-[13px] font-semibold text-ink lg:text-[14px]">{error}</p>}
      <div className="w-full">{children}</div>
    </div>
  );
}
