import { redirect } from "next/navigation";
import { demoRoute } from "@/lib/demoRoutes";

// Legacy conversations use different IDs from the current sample world.
export default function LegacyChatPage() {
  redirect(demoRoute("talent", "messages"));
}
