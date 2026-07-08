import { CheckIcon } from "@/components/icons";
import type { ProposalState } from "@/lib/types";

interface ProposalCardProps {
  role: string;
  dates: string;
  rate: string;
  venue: string;
  proposal: ProposalState;
  isVenue: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ProposalCard({ role, dates, rate, venue, proposal, isVenue, onAccept, onDecline }: ProposalCardProps) {
  const awaitingVenue = proposal === "sent" && isVenue;
  const awaitingTalent = proposal === "sent" && !isVenue;
  const accepted = proposal === "accepted";
  const declined = proposal === "declined";

  return (
    <div className="my-1 flex max-w-[440px] flex-col gap-3 self-stretch rounded-[26px] border border-border-soft bg-paper px-[18px] pb-4 pt-[18px] shadow-[0_14px_40px_rgba(5,5,5,0.09)]">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-label">Booking proposal</span>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-mist font-serif text-[13px]">L</span>
      </div>
      <div className="font-serif text-[26px] leading-[1.02]">{role}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-[7px] text-[13px]">
        <span className="text-faint">Dates</span>
        <span className="font-semibold">{dates}</span>
        <span className="text-faint">Rate</span>
        <span className="font-semibold">{rate}</span>
        <span className="text-faint">Venue</span>
        <span className="font-semibold">{venue}</span>
      </div>
      {awaitingVenue && (
        <div className="flex items-center gap-2 rounded-full bg-mist px-4 py-[11px] text-[12.5px] font-semibold text-muted">
          <span className="h-2 w-2 flex-none rounded-full bg-dot-inactive" />
          Awaiting Camille&rsquo;s response
        </div>
      )}
      {awaitingTalent && (
        <div className="flex flex-col gap-[9px]">
          <button
            type="button"
            onClick={onAccept}
            className="cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white"
          >
            Accept booking
          </button>
          <button type="button" onClick={onDecline} className="cursor-pointer border-none bg-transparent p-0.5 text-[12.5px] font-semibold text-label">
            Decline
          </button>
        </div>
      )}
      {accepted && (
        <div className="flex items-center gap-[9px] rounded-full bg-sage px-4 py-[11px] text-[12.5px] font-bold text-ink">
          <CheckIcon size={13} />
          Accepted · Booked Fri – Sun
        </div>
      )}
      {declined && (
        <div className="flex items-center gap-2 rounded-full bg-mist px-4 py-[11px] text-[12.5px] font-semibold text-faint">
          Declined
        </div>
      )}
    </div>
  );
}
