import type { Metadata } from "next";
import { JoinPicker } from "@/components/auth/JoinPicker";
import { requireJoinViewer } from "@/components/auth/joinViewer";

export const metadata: Metadata = { title: "Join · Dyuknow" };

export default async function JoinPage() {
  const viewer = await requireJoinViewer();
  return <JoinPicker userId={viewer.userId} />;
}
