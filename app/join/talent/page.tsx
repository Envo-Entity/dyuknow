import type { Metadata } from "next";
import { JoinTalent } from "@/components/auth/JoinOnboarding";
import { requireJoinViewer } from "@/components/auth/joinViewer";

export const metadata: Metadata = { title: "Join as talent · Dyuknow" };

export default async function JoinTalentPage() {
  const viewer = await requireJoinViewer();
  return <JoinTalent userId={viewer.userId} email={viewer.email} />;
}
