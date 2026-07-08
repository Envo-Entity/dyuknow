import { Page } from "@/components/layout/Page";
import { OpportunityFeed } from "@/components/talent/OpportunityFeed";

export default function TalentHomePage() {
  return (
    <Page>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        Good evening, Camille · Mayfair &amp; west
      </div>
      <h1 className="mt-3.5 font-serif text-[clamp(40px,8.5vw,88px)] font-normal leading-[0.99] tracking-[-0.015em]">
        Venues booking
        <br />
        near you
      </h1>
      <OpportunityFeed showScarcity />
    </Page>
  );
}
