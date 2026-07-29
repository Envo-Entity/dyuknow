"use client";

import { useParams } from "next/navigation";
import { TalentProfile } from "@/components/venue/TalentProfile";

export default function TalentProfilePage() {
  const params = useParams<{ talentId: string }>();
  return <TalentProfile talentId={params.talentId} />;
}
