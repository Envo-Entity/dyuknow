import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";

interface BookingCardProps {
  href: string;
  mono: string;
  photo?: string;
  title: string;
  sub: string;
  dates: string;
  rate: string;
}

export function BookingCard({ href, mono, photo, title, sub, dates, rate }: BookingCardProps) {
  return (
    <div className="mt-3 flex flex-col overflow-hidden rounded-[28px] bg-paper shadow-[0_16px_46px_rgba(5,5,5,0.10)] lg:flex-row">
      <PhotoTile mono={mono} photoUrl={photo} monoSize={44} className="h-[170px] w-full flex-none lg:h-auto lg:w-[120px]" />
      <div className="flex flex-1 flex-col gap-1.5 px-5 py-[18px]">
        <span className="self-start rounded-full bg-sage px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink">
          Booked · Fri – Sun
        </span>
        <span className="mt-[3px] font-serif text-[27px] leading-[1.05]">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
        <span className="text-[12.5px] font-semibold">
          {dates} · {rate}
        </span>
        <Link
          href={href}
          className="mt-2 self-start rounded-full border border-[#e0e0e0] bg-paper px-4 py-[9px] text-xs font-semibold text-ink"
        >
          View conversation →
        </Link>
      </div>
    </div>
  );
}
