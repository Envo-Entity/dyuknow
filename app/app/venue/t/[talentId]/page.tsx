import { redirect } from "next/navigation";
import { demoRoute } from "@/lib/demoRoutes";

export default async function LegacyTalentPage({ params }: { params: Promise<{ talentId: string }> }) {
  const { talentId } = await params;
  redirect(demoRoute("venue", "talent", talentId));
}
