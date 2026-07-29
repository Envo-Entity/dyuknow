import Link from "next/link";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import type { Talent } from "@/lib/types";

interface TalentCardProps {
  talent: Talent;
  availText: string;
  availSage: boolean;
  showAvail: boolean;
}

export function TalentCard({ talent, availText, availSage, showAvail }: TalentCardProps) {
  return (
    <Link
      href={`/app/venue/t/${talent.id}`}
      className="group flex flex-col overflow-hidden rounded-[26px] bg-paper shadow-[0_12px_36px_rgba(5,5,5,0.08)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(5,5,5,0.14)]"
    >
      <PhotoTile mono={talent.mono} photoUrl={talent.photo} monoSize={64} className="aspect-[4/3]">
        {showAvail && (
          <AvailabilityBadge
            text={availText}
            sage={availSage}
            className="absolute bottom-3 left-3 bg-white/95"
          />
        )}
      </PhotoTile>
      <div className="flex flex-col gap-[3px] px-[17px] pb-4 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[23px] leading-[1.05]">{talent.name}</span>
          {talent.verified && <VerifiedBadge size={18} />}
        </div>
        <div className="text-xs text-label">{talent.pedigree}</div>
        <div className="text-[12.5px] text-[#4a4a4a]">{talent.spec}</div>
        <div className="mt-[3px] text-[12.5px] font-semibold">{talent.metric}</div>
      </div>
    </Link>
  );
}
