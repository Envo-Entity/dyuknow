"use client";

import { useRouter } from "next/navigation";
import { Page } from "@/components/layout/Page";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LookGallery } from "@/components/profile/LookGallery";
import { ChipsGrid } from "@/components/profile/ChipsGrid";
import { ReviewsList } from "@/components/profile/ReviewsList";
import { AvailabilityStrip } from "@/components/profile/AvailabilityStrip";
import { TimeRangePicker } from "@/components/profile/TimeRangePicker";
import { TALENT } from "@/lib/data";
import { computeDays, displayIdentity, useAppStore } from "@/lib/store";

export function MyProfile() {
  const router = useRouter();
  const { data, toggleAvailDay, setAvailWindow } = useAppStore();
  const pt = TALENT.camille;
  const booked = data.proposal === "accepted";
  const days = computeDays(data);
  const me = displayIdentity("talent", data);
  const bio = data.talentIdentity?.bio || pt.pedigree;
  const roleLine = data.talentIdentity?.role || pt.role;

  return (
    <Page>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        My profile · visible to member venues
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <Avatar mono={me.mono} photoUrl={me.photo} size={56} />
        <h1 className="font-serif text-[clamp(40px,8vw,76px)] font-normal leading-none tracking-[-0.015em]">
          {me.name}
        </h1>
        <VerifiedBadge size={24} />
      </div>
      <div className="mt-2.5 text-sm text-muted">
        {roleLine} · {bio}
      </div>

      <div className="lg:mt-[30px] lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start lg:gap-[52px]">
        <div>
          <LookGallery look={pt.look} />
        </div>

        <div className="mt-[18px] flex flex-col gap-[18px] lg:sticky lg:top-11">
          <div className="rounded-[26px] bg-paper px-[18px] pb-4 pt-[18px] shadow-[0_14px_40px_rgba(5,5,5,0.09)]">
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
                Availability · next 7 days
              </span>
              {booked && <span className="text-[11px] font-bold">Fri – Sun booked</span>}
            </div>
            <div className="mt-[13px]">
              <AvailabilityStrip days={days} onToggle={toggleAvailDay} />
            </div>
            <div className="mt-[11px] text-[11px] text-faint">
              Tap a day to open or hold it. Sage means open to book — venues see this live.
            </div>
            <div className="mt-[13px] border-t border-border-soft pt-[13px]">
              <TimeRangePicker from={data.availWindow.from} to={data.availWindow.to} onChange={setAvailWindow} />
            </div>
          </div>

          <ChipsGrid chips={pt.chips} className="lg:grid-cols-4" />

          <p className="m-0 text-[14.5px] leading-[1.6] text-[#4a4a4a]">{pt.about}</p>

          <ReviewsList reviews={pt.reviews} />

          <button
            type="button"
            onClick={() => router.push("/")}
            className="cursor-pointer self-start rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </Page>
  );
}
