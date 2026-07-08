import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface ForkPanelProps {
  href: string;
  dark?: boolean;
  eyebrow: string;
  heading: React.ReactNode;
  body: string;
  avatarMono: string;
  continueLabel: string;
  subLabel: string;
}

export function ForkPanel({ href, dark = false, eyebrow, heading, body, avatarMono, continueLabel, subLabel }: ForkPanelProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-1 grow basis-0 flex-col justify-between gap-7 rounded-[30px] p-7 transition-[flex-grow,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:grow-[1.35] lg:p-[46px]",
        dark
          ? "bg-ink text-white shadow-[0_16px_48px_rgba(5,5,5,0.22)] hover:shadow-[0_30px_80px_rgba(5,5,5,0.30)]"
          : "bg-mist text-ink shadow-[0_12px_40px_rgba(5,5,5,0.05)] hover:shadow-[0_28px_74px_rgba(5,5,5,0.10)]"
      )}
    >
      <div className={cn("text-[10.5px] font-semibold uppercase tracking-[0.2em]", dark ? "text-faint" : "text-label")}>
        {eyebrow}
      </div>
      <div>
        <div className="font-serif text-[clamp(38px,5.2vw,72px)] leading-[1.0] tracking-[-0.01em]">{heading}</div>
        <div className={cn("mt-3.5 max-w-[380px] text-sm leading-[1.55]", dark ? "text-faint" : "text-muted")}>
          {body}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar mono={avatarMono} size={42} tone={dark ? "dark" : "light"} className={dark ? "" : "bg-[#e8e8e8]"} />
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-semibold">{continueLabel}</div>
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", dark ? "text-faint" : "text-label")}>
            {subLabel}
          </div>
        </div>
        <div
          className={cn(
            "ml-auto flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full",
            dark ? "bg-white text-ink" : "bg-ink text-white"
          )}
        >
          <ArrowRightIcon />
        </div>
      </div>
    </Link>
  );
}
