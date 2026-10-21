import type { Metadata } from "next";
import { JoinVenue } from "@/components/auth/JoinOnboarding";
import { requireJoinViewer } from "@/components/auth/joinViewer";

export const metadata: Metadata = { title: "Join as a venue · Dyuknow" };

export default async function JoinVenuePage() {
  const viewer = await requireJoinViewer();
  return <JoinVenue userId={viewer.userId} email={viewer.email} />;
}
