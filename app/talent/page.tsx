import { Page } from "@/components/layout/Page";
import { OpportunityFeed } from "@/components/talent/OpportunityFeed";

export default function TalentHomePage() {
  return (
    <Page>
      <div className="flex items-center gap-2 font-serif text-[15px] italic text-ink-soft">
        <span className="inline-block h-2 w-2 flex-none rounded-full bg-sage" />
        <span>Good evening, Camille · Mayfair &amp; west</span>
      </div>
      <h1 className="mt-3.5 font-sans text-[clamp(40px,8.5vw,88px)] font-bold leading-[0.99] tracking-[-0.015em]">
        Venues booking
        <br />
        <span className="font-serif font-normal italic">near you</span>
      </h1>
      <OpportunityFeed />
    </Page>
  );
}
