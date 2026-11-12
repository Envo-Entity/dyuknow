// send-emails: sends what's waiting in public.email_outbox through Resend.
//
// Called every minute by pg_cron (private.kick_send_emails) when something is
// due, with the shared secret from Vault in the x-dyuknow-secret header. JWT
// checks are off for this function; the secret is the only way in.
//
// Settings, from Vault through public.email_config() (service role only):
//   send_emails_secret  the shared secret the cron job sends
//   resend_api_key      Resend key       (the RESEND_API_KEY env var wins if set)
//   email_allowlist     safety mode      (the EMAIL_ALLOWLIST env var wins if set)
// With an allowlist, only those addresses get email; everyone else's emails
// are marked skipped ("not in allowlist") and never sent later.
import { EMAILS, render } from "./templates.mjs";

const FROM = "Dyuknow <hi@dyuknow.com>";
// Team logins never get member emails.
const TEAM = new Set(["admin@dyuknow.com", "james@dyuknow.com", "hi@shivansh.pro"]);
const BATCH = 10;
// Resend allows a few requests a second per team; stay under it.
const GAP_MS = 550;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Row = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  to_email: string | null;
  attempts: number;
  skip_reason: string | null;
};
type Result = "sent" | "skipped" | "retry" | "failed";

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const addressList = (s: string) =>
  new Set(
    s
      .split(/[\s,;]+/)
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean),
  );

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function mark(id: string, result: Result, resendId: string | null, error: string | null) {
  await rpc("email_mark", { p_id: id, p_result: result, p_resend_id: resendId, p_error: error?.slice(0, 500) ?? null });
}

async function sendOne(row: Row, allow: Set<string>, resendKey: string): Promise<Result> {
  const skip = async (reason: string) => (await mark(row.id, "skipped", null, reason), "skipped" as const);
  if (row.skip_reason) return skip(row.skip_reason);
  const to = (row.to_email ?? "").trim().toLowerCase();
  if (!to) return skip("no email address");
  if (to.endsWith("@example.com")) return skip("test address");
  if (TEAM.has(to)) return skip("team login");
  if (allow.size && !allow.has(to)) return skip("not in allowlist");
  const template = (EMAILS as Record<string, { paused?: string }>)[row.kind];
  if (!template) return (await mark(row.id, "failed", null, `Unknown email kind: ${row.kind}`), "failed");
  if (template.paused) return skip("paused kind");

  let email: { subject: string; html: string; text: string };
  try {
    email = render(row.kind, row.data ?? {});
  } catch (e) {
    await mark(row.id, "failed", null, `Render failed: ${(e as Error).message}`);
    return "failed";
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        // The same outbox row is never sent twice, even if a run is repeated.
        "Idempotency-Key": row.id,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: "kind", value: row.kind }],
      }),
    });
  } catch (e) {
    await mark(row.id, "retry", null, `Network: ${(e as Error).message}`);
    return "retry";
  }
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    await mark(row.id, "sent", body?.id ?? null, null);
    return "sent";
  }
  const error = `Resend ${res.status}: ${body?.message ?? body?.name ?? "error"}`;
  // Rate limits, conflicts and Resend outages are worth another try; anything
  // else (a bad address, a rejected payload) won't get better.
  const result: Result = res.status === 429 || res.status === 409 || res.status >= 500 ? "retry" : "failed";
  await mark(row.id, result, null, error);
  return result;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Missing Supabase settings" }, 500);

  let config: Record<string, string>;
  try {
    config = (await rpc<Record<string, string>>("email_config")) ?? {};
  } catch (e) {
    console.error((e as Error).message);
    return json({ error: "Could not read settings" }, 500);
  }
  const secret = config.send_emails_secret ?? "";
  if (!secret || !sameSecret(req.headers.get("x-dyuknow-secret") ?? "", secret)) {
    return json({ error: "Not allowed" }, 401);
  }
  const resendKey = Deno.env.get("RESEND_API_KEY") || config.resend_api_key || "";
  if (!resendKey) return json({ error: "No Resend key" }, 500);
  const allow = addressList(Deno.env.get("EMAIL_ALLOWLIST") ?? config.email_allowlist ?? "");

  const rows = (await rpc<Row[]>("email_claim", { p_limit: BATCH })) ?? [];
  const counts: Record<Result, number> = { sent: 0, skipped: 0, retry: 0, failed: 0 };
  for (const [i, row] of rows.entries()) {
    if (i) await new Promise((r) => setTimeout(r, GAP_MS));
    try {
      counts[await sendOne(row, allow, resendKey)]++;
    } catch (e) {
      // Couldn't record the result; the row is taken again after 10 minutes,
      // and the idempotency key stops a second copy.
      console.error(`send-emails ${row.id}: ${(e as Error).message}`);
    }
  }
  return json({ claimed: rows.length, ...counts, allowlist: allow.size > 0 });
});
