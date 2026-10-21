import { PreviewApp } from "@/components/preview/PreviewApp";

// The real app: the same screens as /preview, on Supabase for the signed-in member.
export default function AppPage() {
  return <PreviewApp mode="live" />;
}
