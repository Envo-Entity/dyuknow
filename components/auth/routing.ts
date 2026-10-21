import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ?next= is honoured only for a path on this site starting /app or /admin.
 * A full web address, a protocol-relative "//host" or anything else is ignored,
 * so a link can't send people to another site.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  try {
    const base = "https://dyuknow.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return null;
    if (!/^\/(app|admin)(\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Where a person belongs right after signing in:
 * a members row -> next or /app; an admin with no profile -> next (if /admin) or /admin;
 * anyone else -> /join to create their profile.
 */
export async function destinationAfterSignIn(supabase: SupabaseClient, next: string | null): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return "/login";

  const { data: member } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
  if (member) return next ?? "/app";

  const { data: admin } = await supabase.rpc("am_i_admin");
  if (admin && typeof admin === "object" && (admin as { is_admin?: boolean }).is_admin) {
    return next?.startsWith("/admin") ? next : "/admin";
  }
  return "/join";
}
