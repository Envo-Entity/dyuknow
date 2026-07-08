import { Page } from "@/components/layout/Page";
import { RoleMosaic } from "@/components/venue/RoleMosaic";

export default function VenueHomePage() {
  return (
    <Page>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        <span className="inline-block h-2 w-2 rounded-full bg-sage" />
        <span>The pass is open · Fri 12 – Sun 14 Sep</span>
      </div>
      <h1 className="mt-3.5 font-serif text-[clamp(42px,8.5vw,92px)] font-normal leading-[0.98] tracking-[-0.015em]">
        Who do you
        <br />
        need today?
      </h1>
      <RoleMosaic />
    </Page>
  );
}
