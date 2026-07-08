"use client";

import { useParams } from "next/navigation";
import { Page } from "@/components/layout/Page";
import { BackButton } from "@/components/ui/BackButton";
import { VenueDetailContent } from "@/components/talent/VenueDetailContent";
import { FEED } from "@/lib/data";

export default function VenueDetailPage() {
  const params = useParams<{ feedId: string }>();
  const vf = FEED.find((f) => f.id === params.feedId) ?? FEED[0];

  return (
    <Page variant="detail">
      <div className="flex items-center gap-3">
        <BackButton fallback="/talent" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{vf.role}</span>
      </div>
      <VenueDetailContent feedId={params.feedId} variant="page" />
    </Page>
  );
}
