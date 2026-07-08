"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Page } from "@/components/layout/Page";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { BookmarkIcon } from "@/components/icons";
import { LookGallery } from "@/components/profile/LookGallery";
import { ChipsGrid } from "@/components/profile/ChipsGrid";
import { ReviewsList } from "@/components/profile/ReviewsList";
import { AvailabilityStrip } from "@/components/profile/AvailabilityStrip";
import { TALENT } from "@/lib/data";
import { availabilityOf, computeDays, useAppStore } from "@/lib/store";

export function TalentProfile({ talentId }: { talentId: string }) {
  const router = useRouter();
  const { data, toggleSaved, requestIntro } = useAppStore();
  const pt = TALENT[talentId] ?? TALENT.camille;
  const avail = availabilityOf(pt.id, data);
  const introDone = !!data.intros[pt.id];
  const saved = !!data.saved[pt.id];
  const showScarcity = !!pt.scarcity;

  const ctaLabel = pt.convo ? `Message ${pt.short}` : introDone ? "Intro requested" : "Request intro";
  const ctaMuted = !pt.convo && introDone;

  return (
    <Page variant="detail">
      <div className="flex items-center gap-3">
        <BackButton fallback="/venue" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{pt.spec}</span>
      </div>

      <div className="mt-0 lg:mt-[30px] lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start lg:gap-[52px]">
        <div className="lg:sticky lg:top-11">
          <LookGallery look={pt.look} />
        </div>

        <div className="mt-4 flex flex-col gap-[18px] lg:sticky lg:top-11 lg:mt-0">
          <div>
            <div className="flex flex-wrap items-center gap-[11px]">
              <h1 className="font-serif text-[clamp(38px,7vw,56px)] font-normal leading-none tracking-[-0.015em]">
                {pt.name}
              </h1>
              {pt.verified && <VerifiedBadge size={22} />}
            </div>
            <div className="mt-2 text-sm text-muted">{pt.pedigree}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <AvailabilityBadge text={avail.text} sage={avail.sage} />
              {showScarcity && <span className="text-[11.5px] font-semibold text-label">{pt.scarcity}</span>}
            </div>
          </div>

          <ChipsGrid chips={pt.chips} className="lg:grid-cols-4" />

          <p className="m-0 text-[14.5px] leading-[1.6] text-[#4a4a4a]">{pt.about}</p>

          {pt.id === "camille" && (
            <div>
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
                Availability · next 7 days
              </div>
              <AvailabilityStrip days={computeDays(data)} />
            </div>
          )}

          <ReviewsList reviews={pt.reviews} />

          <div className="text-xs text-faint">Rate on request · terms held by the concierge</div>

          <div className="sticky bottom-[18px] z-30 mt-1 flex gap-2.5 lg:static lg:mt-1 lg:pt-0">
            <button
              type="button"
              onClick={() => {
                if (pt.convo) router.push(`/venue/chat/${pt.convo}`);
                else requestIntro(pt.id);
              }}
              className={`flex-1 cursor-pointer rounded-full border-none px-[22px] py-[17px] text-[15px] font-semibold shadow-[0_16px_44px_rgba(5,5,5,0.22)] ${
                ctaMuted ? "bg-mist text-muted" : "bg-ink text-white"
              }`}
            >
              {ctaLabel}
            </button>
            <button
              type="button"
              title="Save"
              onClick={() => toggleSaved(pt.id)}
              className="flex h-[54px] w-[54px] flex-none cursor-pointer items-center justify-center rounded-full border border-[#e0e0e0] bg-paper text-ink shadow-[0_12px_34px_rgba(5,5,5,0.10)]"
            >
              <BookmarkIcon filled={saved} />
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}
