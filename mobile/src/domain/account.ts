// The documents Dyuknow asks for. All optional: members can be booked or book
// without them, and venues see which ones talent have added.
import { TEAMS } from "./catalogue.ts";
import type { Account, DocStatus, Member } from "./types.ts";

// Document labels as the website shows them (document_types.label).
export function requiredDocs(m: Pick<Member, "side" | "roles">) {
  if (m.side === "venue") return ["Business registration", "Premises licence"];
  const kitchen = m.roles.some((r) => ([...TEAMS.Kitchen, ...TEAMS.Pastry] as string[]).includes(r));
  return ["Right to work", "Photo ID", kitchen ? "Food hygiene certificate" : "Allergen awareness"];
}
export function accountOf(m: Member): Account {
  const docs = Object.fromEntries(
    requiredDocs(m).map((d) => [d, m.account?.docs[d] ?? { status: "missing" as const }]),
  );
  // Anything else they've added, such as a CV, is listed after (a rejected
  // one keeps its file name, so it's listed too).
  for (const [d, doc] of Object.entries(m.account?.docs ?? {}))
    if (!(d in docs) && (doc.status !== "missing" || doc.file)) docs[d] = doc;
  return {
    texts: { messages: true, reminders: true },
    ...m.account,
    docs,
  };
}
export function verifiedDocs(m: Member) {
  const docs = accountOf(m).docs;
  return Object.keys(docs).filter((d) => d !== "CV" && docs[d].status === "verified");
}
// What venues see of a talent's documents: each one's status, never the file.
// The CV is private to the talent.
export function documentStatuses(m: Member): { name: string; status: DocStatus }[] {
  if (m.side !== "talent") return [];
  return Object.entries(accountOf(m).docs)
    .filter(([name]) => name !== "CV")
    .map(([name, d]) => ({ name, status: d.status }));
}
// Talent who haven't added their right to work get a nudge. A rejected one
// counts as added: Account already asks them to replace it.
export const RIGHT_TO_WORK = "Right to work";
export function needsRightToWork(m: Member, rejected?: Record<string, string>) {
  return (
    m.side === "talent" &&
    accountOf(m).docs[RIGHT_TO_WORK]?.status === "missing" &&
    !(rejected && RIGHT_TO_WORK in rejected)
  );
}
