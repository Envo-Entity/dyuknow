import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { ROLES } from "@/lib/data";

const SPAN_MOBILE: Record<string, string> = {
  "head-chef": "col-span-2 row-span-2",
  sommelier: "row-span-2",
};

const SPAN_DESKTOP: Record<string, string> = {
  "head-chef": "lg:col-[1/span_2] lg:row-[1/span_3]",
  sommelier: "lg:col-[3] lg:row-[1/span_2]",
  "pastry-chef": "lg:col-[4] lg:row-[1]",
  bartender: "lg:col-[4] lg:row-[2]",
  "maitre-d": "lg:col-[3] lg:row-[3]",
};

export function RoleMosaic() {
  return (
    <div className="mt-7 grid grid-cols-2 auto-rows-[118px] gap-[13px] lg:mt-[38px] lg:h-[calc(100vh-340px)] lg:min-h-[520px] lg:grid-cols-4 lg:auto-rows-[1fr] lg:gap-4">
      {ROLES.map((r) => (
        <Link
          key={r.id}
          href={`/venue/role/${r.id}`}
          className={`group relative overflow-hidden rounded-[26px] shadow-[0_10px_32px_rgba(5,5,5,0.07)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(5,5,5,0.13)] ${SPAN_MOBILE[r.id] ?? ""} ${SPAN_DESKTOP[r.id] ?? ""}`}
        >
          <PhotoTile
            mono={r.mono}
            monoSize={76}
            className="h-full w-full"
          >
            <div className="absolute bottom-[9px] left-[9px] right-[9px] flex flex-col gap-px rounded-[18px] bg-white/95 px-3.5 py-2.5">
              <div
                className={`font-serif leading-[1.05] ${r.id === "head-chef" ? "text-[23px] lg:text-[32px]" : "text-[19px] lg:text-[22px]"}`}
              >
                {r.name}
              </div>
              <div className="text-xs text-muted">{r.metric}</div>
            </div>
          </PhotoTile>
        </Link>
      ))}
      <div className="col-span-2 flex min-h-[118px] flex-col justify-center gap-1 rounded-[26px] bg-ink px-6 py-5 text-white lg:col-[4] lg:row-[3]">
        <div className="font-serif text-[25px] leading-[1.12]">Every member, vetted.</div>
        <div className="text-xs text-faint">142 vetted members · London</div>
      </div>
    </div>
  );
}
