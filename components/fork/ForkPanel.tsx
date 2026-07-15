import { Avatar } from "@/components/ui/Avatar";
import { ArrowRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface ForkPanelProps {
  onClick: () => void;
  dark?: boolean;
  eyebrow: string;
  heading: React.ReactNode;
  body: string;
  avatarMono: string;
  avatarPhoto?: string;
  continueLabel: string;
  subLabel: string;
}

export function ForkPanel({ onClick, dark = false, eyebrow, heading, body, avatarMono, avatarPhoto, continueLabel, subLabel }: ForkPanelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-1 grow basis-0 cursor-pointer flex-col justify-between gap-7 rounded-[30px] p-7 text-left transition-[flex-grow,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:grow-[1.35] lg:p-[46px]",
        dark
          ? "bg-ink text-white shadow-[0_16px_48px_rgba(5,5,5,0.22)] hover:shadow-[0_30px_80px_rgba(5,5,5,0.30)]"
          : "bg-sage text-ink shadow-[0_16px_44px_rgba(46,74,40,0.18)] hover:shadow-[0_30px_78px_rgba(46,74,40,0.26)]"
      )}
    >
      <div className={cn("text-[10.5px] font-semibold uppercase tracking-[0.2em]", dark ? "text-faint" : "text-ink")}>
        {eyebrow}
      </div>
      <div>
        <div className="font-sans text-[clamp(38px,5.2vw,72px)] font-bold leading-[1.0] tracking-[-0.01em]">
          {heading}
        </div>
        <div className={cn("mt-3.5 max-w-[380px] text-sm leading-[1.55]", dark ? "text-faint" : "text-ink-soft")}>
          {body}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar mono={avatarMono} photoUrl={avatarPhoto} size={42} tone={dark ? "dark" : "light"} className={dark ? "" : "bg-white"} />
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-semibold">{continueLabel}</div>
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", dark ? "text-faint" : "text-ink")}>
            {subLabel}
          </div>
        </div>
        <div
          className={cn(
            "ml-auto flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full",
            dark ? "bg-sage text-ink" : "bg-ink text-white"
          )}
        >
          <ArrowRightIcon />
        </div>
      </div>
    </button>
  );
}
