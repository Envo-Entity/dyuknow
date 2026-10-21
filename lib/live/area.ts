// Turns a UK postcode into the place name people see instead of a postcode,
// e.g. "TW9 1UA" -> "Richmond upon Thames", using the free postcodes.io service.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function lookupAreaName(postcode: string): Promise<string | null> {
  const pc = postcode.trim();
  if (!pc) return null;
  try {
    const full = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    if (full.ok) {
      const name = (await full.json())?.result?.admin_district;
      if (typeof name === "string" && name) return name;
    }
    const outward = pc.toUpperCase().split(/\s+/)[0];
    const part = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outward)}`);
    if (part.ok) {
      const names = (await part.json())?.result?.admin_district;
      if (Array.isArray(names) && typeof names[0] === "string") return names[0];
    }
  } catch {
    /* No place name: screens fall back to the postcode area. */
  }
  return null;
}

// Looks up and saves the signed-in member's place name. Never throws.
export async function saveMyAreaName(supabase: SupabaseClient, postcode: string) {
  const name = await lookupAreaName(postcode);
  if (!name) return;
  await supabase.rpc("set_my_area_name", { p_area_name: name });
}
