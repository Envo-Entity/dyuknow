// What Dyuknow checks before someone can be booked or book.
import { TEAMS } from "./catalogue.ts";
import type { Account, Member } from "./types.ts";

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
  return {
    texts: { messages: true, reminders: true },
    ...m.account,
    docs,
  };
}
export function verifiedDocs(m: Member) {
  const docs = accountOf(m).docs;
  return Object.keys(docs).filter((d) => docs[d].status === "verified");
}
