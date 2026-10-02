import { redirect } from "next/navigation";
import { demoRoute } from "@/lib/demoRoutes";

// Old opportunity IDs describe the previous demo's requests.
export default function LegacyVenueRequestPage() {
  redirect(demoRoute("talent"));
}
