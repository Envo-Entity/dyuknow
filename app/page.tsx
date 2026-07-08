import { ForkPanel } from "@/components/fork/ForkPanel";

export default function ForkPage() {
  return (
    <div className="animate-view-in flex min-h-screen flex-col bg-paper">
      <div className="flex flex-col items-center gap-[7px] px-6 pb-2 pt-[30px]">
        <div className="font-serif text-[29px] tracking-[-0.01em]">Dyuknow</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-label">
          Membership by referral only
        </div>
        <div className="mt-3.5 font-serif text-[19px] italic text-muted">Who are you today?</div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-[26px] pt-[18px] lg:flex-row lg:gap-5 lg:px-8 lg:pb-9">
        <ForkPanel
          href="/venue"
          eyebrow="Venue"
          heading={
            <>
              I have a room
              <br />
              to fill
            </>
          }
          body="Book vetted, verified talent — a Guest Head Chef for the weekend, a Sommelier for one service, a residency."
          avatarMono="L"
          continueLabel="Continue as The Larkspur"
          subLabel="One Michelin star · Mayfair"
        />
        <ForkPanel
          href="/talent"
          dark
          eyebrow="Talent"
          heading={
            <>
              I&rsquo;m available
              <br />
              to work
            </>
          }
          body="Take the pass at rooms worth your name — a service, a weekend, a residency. Never a job board."
          avatarMono="C"
          continueLabel="Continue as Camille Aubert"
          subLabel="Head Chef · Verified member"
        />
      </div>
    </div>
  );
}
