"use client";

import { useParams } from "next/navigation";
import { VenueDetailModal } from "@/components/talent/VenueDetailModal";

export default function VenueDetailInterceptedPage() {
  const params = useParams<{ feedId: string }>();
  return <VenueDetailModal feedId={params.feedId} />;
}
