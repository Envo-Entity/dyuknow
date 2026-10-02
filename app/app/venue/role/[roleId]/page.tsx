import { redirect } from "next/navigation";
import { demoRoute } from "@/lib/demoRoutes";

// The current dashboard groups talent using the five-team catalogue.
export default function LegacyRolePage() {
  redirect(demoRoute("venue"));
}
