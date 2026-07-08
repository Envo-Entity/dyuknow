import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";

interface ConversationRowProps {
  href: string;
  mono: string;
  name: string;
  sub: string;
  time: string;
  preview: string;
  unread: boolean;
}

export function ConversationRow({ href, mono, name, sub, time, preview, unread }: ConversationRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-3xl bg-paper px-[17px] py-3.5 shadow-[0_12px_36px_rgba(5,5,5,0.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-[0_22px_52px_rgba(5,5,5,0.13)]"
    >
      <PhotoTile mono={mono} monoSize={24} className="h-[54px] w-[54px] flex-none rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="font-serif text-[21px] leading-none">{name}</span>
          <span className="flex-none text-[10.5px] font-semibold uppercase tracking-[0.1em] text-hairline">{time}</span>
        </div>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-faint">{sub}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[#5a5a5a]">{preview}</span>
      </div>
      {unread && <span className="dot-pulse h-3 w-3 flex-none rounded-full bg-sage" />}
    </Link>
  );
}
