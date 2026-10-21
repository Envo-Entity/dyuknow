// Unsent messages stay in this browser, per member; never in the database.
const key = (memberId: string) => `dyuknow_drafts_${memberId}`;

// Keys are "<member id>/<conversation id>", as the demo's messageDrafts.
export function readDrafts(memberId: string): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(key(memberId)) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
export function writeDraft(memberId: string, thread: string, text: string) {
  const drafts = readDrafts(memberId);
  const k = `${memberId}/${thread}`;
  if (text) drafts[k] = text;
  else delete drafts[k];
  try {
    localStorage.setItem(key(memberId), JSON.stringify(drafts));
  } catch {
    /* A full or blocked store only loses the draft. */
  }
  return drafts;
}
export function clearDrafts(memberId: string) {
  try {
    localStorage.removeItem(key(memberId));
  } catch {
    /* Nothing to clear. */
  }
}
