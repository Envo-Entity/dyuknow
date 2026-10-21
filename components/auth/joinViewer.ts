import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface JoinViewer {
  userId: string;
  email: string;
}

/**
 * Server-side gate for /join pages: signed-out people go to /login,
 * anyone who already has a members row goes to /app.
 */
export async function requireJoinViewer(): Promise<JoinViewer> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login?next=/join");

  const { data: member } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
  if (member) redirect("/app");

  return { userId: user.id, email: user.email ?? "" };
}
