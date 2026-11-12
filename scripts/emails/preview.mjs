// Renders every Dyuknow email with sample data.
//
//   node scripts/emails/preview.mjs                 write HTML files to scripts/emails/out (sends nothing)
//   node scripts/emails/preview.mjs --send a@b.com  also send all of them to a@b.com through Resend
//
// Also writes out/supabase-sign-in-code.html: the sign-in-code email with
// {{ .Token }} in place of the code, to paste into Supabase Auth's templates.
//
// Reads RESEND_API_KEY from .env.local; never prints it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// The templates live with the edge function that sends them.
import { EMAILS, render } from "../../supabase/functions/send-emails/templates.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FROM = "Dyuknow <hi@dyuknow.com>";

// Sample ids, so the buttons show the deep links real emails get.
const T = { side: "talent", member_id: "00000000-0000-4000-8000-000000000001" };
const V = { side: "venue", member_id: "00000000-0000-4000-8000-000000000002" };
const SHIFT = "shift/00000000-0000-4000-8000-0000000000aa";
const BOOKING = "booking/00000000-0000-4000-8000-0000000000bb";
const shift = {
  venue: "Marlowe & Vine",
  talent: "Priya Shah",
  positions: "Head Chef or Sous Chef",
  dates: "Mon 16–Wed 18 Nov",
  hours: "17:00–23:00",
  rate: "£18/h",
};
const SAMPLES = {
  "welcome-talent": { name: "Priya", ...T, target: "availability" },
  "welcome-venue": { name: "Spruce", ...V, target: "home" },
  "complete-account": {},
  "account-ready": { name: "Priya", email: "priya@example.com" },
  "sign-in-code": { code: "482913" },
  approved: { side: "talent" },
  "document-rejected": { document: "Food hygiene certificate", reason: "The photo is too blurry to read the expiry date" },
  "booking-request": { ...shift, ...T, target: SHIFT },
  booked: { ...shift, ...T, target: BOOKING },
  "days-cancelled-talent": { ...shift, ...T, target: BOOKING, cancelled: "Wed 18 Nov", reason: "Private event cancelled" },
  "shift-closed": { ...shift, ...T, target: SHIFT, reason: "We found cover in-house" },
  reminder: { ...shift, ...T, target: BOOKING, day: "Mon 16 Nov · 17:00–23:00" },
  "said-yes": { ...shift, ...V, target: SHIFT, dates: "Mon 16–Tue 17 Nov", partial: "2 of 3 days" },
  accepted: { ...shift, ...V, target: BOOKING },
  declined: { ...shift, ...V, target: SHIFT },
  "days-cancelled-venue": { ...shift, ...V, target: BOOKING, cancelled: "Tue 17 Nov", reason: "Unwell" },
  "shift-unfilled": { ...shift, ...V, target: SHIFT },
};

const out = path.join(HERE, "out");
fs.mkdirSync(out, { recursive: true });
const all = Object.keys(EMAILS).map((kind, i) => {
  const e = render(kind, SAMPLES[kind]);
  fs.writeFileSync(path.join(out, `${String(i + 1).padStart(2, "0")}-${kind}.html`), e.html);
  console.log(`${String(i + 1).padStart(2)}. ${kind.padEnd(22)} [${EMAILS[kind].to}] ${e.subject}`);
  return { kind, file: `${String(i + 1).padStart(2, "0")}-${kind}.html`, to: EMAILS[kind].to, when: EMAILS[kind].when, paused: EMAILS[kind].paused, ...e };
});

fs.writeFileSync(path.join(out, "supabase-sign-in-code.html"), render("sign-in-code", { code: "{{ .Token }}" }).html);

// A throwaway viewer: out/index.html lists every email with a tab for each.
const list = all.map(({ kind, file, to, when, paused, subject, preheader, text }) => ({ kind, file, to, when, paused, subject, preheader, text }));
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dyuknow emails</title>
<style>
*{box-sizing:border-box}body{margin:0;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#111;background:#fff;display:flex;height:100vh}
nav{width:300px;flex:none;border-right:1px solid #e7e7e7;overflow:auto;padding:16px 10px}
nav h1{font:400 26px Georgia,serif;margin:4px 10px 14px}
nav h2{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#7a9a72;margin:18px 10px 6px}
nav button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;cursor:pointer;font:inherit;color:#333}
nav button small{display:block;color:#8a8a8a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
nav button:hover{background:#f5f5f5}nav button.on{background:#111;color:#fff}nav button.on small{color:#bbb}
main{flex:1;display:flex;flex-direction:column;min-width:0;background:#f5f5f5}
header{padding:14px 20px;background:#fff;border-bottom:1px solid #e7e7e7;display:flex;gap:16px;align-items:flex-start}
header .meta{flex:1;min-width:0}header .subj{font-weight:600;font-size:16px}header .sub{color:#7a7a7a;font-size:13px;margin-top:2px}
.seg{display:flex;border:1px solid #ddd;border-radius:9px;overflow:hidden;flex:none}.seg button{border:0;background:#fff;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}.seg button.on{background:#111;color:#fff}
.stage{flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px}
.trigger{background:#fff;border:1px solid #e7e7e7;border-left:4px solid #7a9a72;border-radius:12px;padding:14px 16px;max-width:100%;transition:width .2s}
.trigger .lbl{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:#7a9a72;margin:0 0 4px}
.trigger .paused{font-size:13px;line-height:1.4;margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#fff4e5;color:#7a4b00}
nav button .tag{display:inline-block;margin-left:6px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#a0670a}
.trigger .when{font-size:15px;line-height:1.45;margin:0 0 10px}
.trigger dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:13px}.trigger dt{color:#8a8a8a}.trigger dd{margin:0}
iframe{border:0;background:#fff;min-height:600px;flex:none;max-width:100%;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);transition:width .2s}
pre{white-space:pre-wrap;background:#fff;padding:24px;border-radius:12px;max-width:640px;width:100%;margin:0;font:13px/1.5 ui-monospace,Menlo,monospace;height:max-content}
@media (max-width:760px){body{flex-direction:column;height:auto}nav{width:auto;border-right:0;border-bottom:1px solid #e7e7e7;max-height:40vh}header{flex-wrap:wrap}}
</style></head><body>
<nav id="nav"><h1>Dyuknow emails</h1></nav>
<main><header><div class="meta"><div class="subj" id="subj"></div><div class="sub" id="sub"></div></div>
<div class="seg" id="width"><button data-w="390" class="on">Phone</button><button data-w="760">Desktop</button></div>
<div class="seg" id="mode"><button data-m="html" class="on">Email</button><button data-m="text">Plain text</button></div></header>
<div class="stage" id="stage"><section class="trigger" id="trigger"><p class="lbl">Sent when</p><p class="when" id="when"></p><p class="paused" id="paused" hidden></p><dl><dt>To</dt><dd id="to"></dd><dt>Subject</dt><dd id="tsubj"></dd><dt>Preview text</dt><dd id="pre"></dd></dl></section><iframe id="frame" title="Email preview"></iframe><pre id="text" hidden></pre></div></main>
<script>
const EMAILS = ${JSON.stringify(list).replace(/</g, "\\u003c")};
const GROUPS = [["Onboarding", ["welcome-talent","welcome-venue","complete-account","account-ready"]], ["Account", ["sign-in-code","approved","document-rejected"]], ["To talent", null, "Talent"], ["To venues", null, "Venue"]];
const nav = document.getElementById("nav"), frame = document.getElementById("frame"), pre = document.getElementById("text");
let cur = 0, width = 390, mode = "html";
const used = new Set();
for (const [title, kinds, to] of GROUPS) {
  const items = EMAILS.map((e, i) => [e, i]).filter(([e]) => !used.has(e.kind) && (kinds ? kinds.includes(e.kind) : e.to === to));
  if (!items.length) continue;
  const h = document.createElement("h2"); h.textContent = title; nav.append(h);
  for (const [e, i] of items) {
    used.add(e.kind);
    const b = document.createElement("button"); b.dataset.i = i;
    b.innerHTML = "<span></span><small></small>"; b.firstChild.textContent = (i + 1) + ". " + e.kind; if (e.paused) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "paused"; b.firstChild.append(t); } b.lastChild.textContent = e.subject;
    b.onclick = () => show(i); nav.append(b);
  }
}
function show(i) {
  cur = i; const e = EMAILS[i];
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", +b.dataset.i === i));
  document.getElementById("subj").textContent = e.subject;
  document.getElementById("sub").textContent = "To " + e.to;
  document.getElementById("when").textContent = e.when;
  const pz = document.getElementById("paused"); pz.hidden = !e.paused; pz.textContent = e.paused || "";
  document.getElementById("to").textContent = e.to;
  document.getElementById("tsubj").textContent = e.subject;
  document.getElementById("pre").textContent = e.preheader || "–";
  frame.src = e.file; pre.textContent = e.text; location.hash = e.kind; render();
}
function render() { frame.hidden = mode !== "html"; pre.hidden = mode !== "text"; frame.style.width = width + "px"; document.getElementById("trigger").style.width = (mode === "html" ? width : 640) + "px"; }
frame.onload = () => { try { frame.style.height = frame.contentDocument.documentElement.scrollHeight + "px"; } catch {} };
document.getElementById("width").onclick = (ev) => { const w = ev.target.dataset.w; if (!w) return; width = +w; ev.currentTarget.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === ev.target)); render(); frame.onload(); };
document.getElementById("mode").onclick = (ev) => { const m = ev.target.dataset.m; if (!m) return; mode = m; ev.currentTarget.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === ev.target)); render(); };
addEventListener("keydown", (ev) => { if (ev.key === "ArrowDown" || ev.key === "j") { ev.preventDefault(); show(Math.min(cur + 1, EMAILS.length - 1)); } if (ev.key === "ArrowUp" || ev.key === "k") { ev.preventDefault(); show(Math.max(cur - 1, 0)); } });
const start = EMAILS.findIndex(e => e.kind === location.hash.slice(1));
show(start < 0 ? 0 : start);
</script></body></html>`,
);

const i = process.argv.indexOf("--send");
if (i > 0) {
  const to = process.argv[i + 1];
  if (!to) throw new Error("--send needs an address");
  const env = Object.fromEntries(
    fs
      .readFileSync(path.join(HERE, "../../.env.local"), "utf8")
      .split("\n")
      .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(
      all.map((e) => ({ from: FROM, to: [to], subject: e.subject, html: e.html, text: e.text, tags: [{ name: "kind", value: e.kind }] })),
    ),
  });
  const body = await res.json();
  console.log(res.status, res.ok ? `sent ${body.data?.length} emails to ${to}` : body);
}
