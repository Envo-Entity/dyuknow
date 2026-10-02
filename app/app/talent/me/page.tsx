import { redirect } from "next/navigation";
import { demoRoute } from "@/lib/demoRoutes";

export default function LegacyPage() {
  redirect(demoRoute("talent", "profile"));
}
