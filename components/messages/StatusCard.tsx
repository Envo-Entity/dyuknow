import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { cn } from "@/lib/cn";

interface StatusCardProps {
  href: string;
  mono: string;
  photo?: string;
  title: string;
  line: string;
  dates: string;
  rate: string;
  state: string;
  sage: boolean;
}

export function StatusCard({ href, mono, photo, title, line, dates, rate, state, sage }: StatusCardProps) {
  return (
    <Link
      href={href}
      className="block max-w-[420px] overflow-hidden rounded-[28px] bg-paper shadow-[0_18px_50px_rgba(5,5,5,0.10)] transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-[0_28px_64px_rgba(5,5,5,0.15)]"
    >
      <PhotoTile mono={mono} photoUrl={photo} monoSize={72} className="h-[210px]" />
      <div className="flex flex-col gap-1.5 px-[22px] pb-[22px] pt-5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-label">{title}</span>
        <span className="font-serif text-[26px] leading-[1.08]">{line}</span>
        <span className="text-[13px] text-muted">
          {dates} · {rate}
        </span>
        <span
          className={cn(
            "mt-2 self-start rounded-full px-3.5 py-2 text-[11.5px] font-bold",
            sage ? "bg-sage text-ink" : "bg-mist text-muted"
          )}
        >
          {state}
        </span>
      </div>
    </Link>
  );
}
