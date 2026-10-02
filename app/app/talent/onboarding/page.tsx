import { redirect } from "next/navigation";
import { demoSetupRoute } from "@/lib/demoRoutes";

export default function LegacyOnboardingPage() {
  redirect(demoSetupRoute("talent"));
}
