"use client";

import { useParams } from "next/navigation";
import { RoleGrid } from "@/components/venue/RoleGrid";

export default function RoleGridPage() {
  const params = useParams<{ roleId: string }>();
  return <RoleGrid roleId={params.roleId} />;
}
