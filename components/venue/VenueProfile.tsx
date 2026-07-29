"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/layout/Page";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LookGallery } from "@/components/profile/LookGallery";
import { ChipsGrid } from "@/components/profile/ChipsGrid";
import { ReviewsList } from "@/components/profile/ReviewsList";
import { ROLES, VENUE_PROFILE } from "@/lib/data";
import { displayIdentity, useAppStore } from "@/lib/store";

export function VenueProfile() {
  const router = useRouter();
  const { data } = useAppStore();
  const v = VENUE_PROFILE;
  const me = displayIdentity("venue", data);
  const bio = data.venueIdentity?.bio || `${v.pedigree} · ${v.spec}`;

  return (
    <Page>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        My venue · visible to member talent
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <Avatar mono={me.mono} photoUrl={me.photo} size={56} tone="dark" />
        <h1 className="font-serif text-[clamp(40px,8vw,76px)] font-normal leading-none tracking-[-0.015em]">
          {me.name}
        </h1>
        {v.verified && <VerifiedBadge size={24} />}
      </div>
      <div className="mt-2.5 text-sm text-muted">{bio}</div>

      <div className="lg:mt-[30px] lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start lg:gap-[52px]">
        <div>
          <LookGallery look={v.look} />
        </div>

        <div className="mt-[18px] flex flex-col gap-[18px] lg:sticky lg:top-11">
          <ChipsGrid chips={v.chips} className="lg:grid-cols-4" />

          <p className="m-0 text-[14.5px] leading-[1.6] text-[#4a4a4a]">{v.about}</p>

          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
              Open roles · availability
            </div>
            <div className="flex flex-col gap-2">
              {ROLES.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/venue/role/${r.id}`}
                  className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3"
                >
                  <span className="text-sm font-semibold">{r.name}</span>
                  <span className="text-xs text-muted">{r.metric}</span>
                </Link>
              ))}
            </div>
          </div>

          <ReviewsList reviews={v.reviews} />

          <button
            type="button"
            onClick={() => router.push("/app")}
            className="cursor-pointer self-start rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </Page>
  );
}
