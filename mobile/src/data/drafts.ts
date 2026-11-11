// Drafts kept on this device only, never in the database.
// - Chat drafts: per member, keys "<member id>/<conversation id>", as the
//   website's messageDrafts (AsyncStorage key dyuknow_drafts_<member id>).
// - Join drafts: one per login (AsyncStorage key dyuknow.join-draft.<user id>),
//   the website's JoinDraft shape.
// AsyncStorage is async, so chat drafts are cached in memory: hydrateDrafts()
// once (loadLive does it), then readDrafts()/writeDraft() are synchronous and
// persist in the background.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_JOIN_DRAFT,
  TALENT_LAST_RESUMABLE_STEP,
  VENUE_LAST_RESUMABLE_STEP,
  type JoinDraft,
} from '@/domain';

const CHAT_PREFIX = 'dyuknow_drafts_';
const JOIN_PREFIX = 'dyuknow.join-draft.';
const chatKey = (memberId: string) => `${CHAT_PREFIX}${memberId}`;
const joinKey = (userId: string) => `${JOIN_PREFIX}${userId}`;

const chat = new Map<string, Record<string, string>>();

/** Reads this member's chat drafts from storage into memory (once). */
export async function hydrateDrafts(memberId: string): Promise<Record<string, string>> {
  const cached = chat.get(memberId);
  if (cached) return cached;
  let value: Record<string, string> = {};
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(chatKey(memberId))) || '{}');
    if (parsed && typeof parsed === 'object') value = parsed;
  } catch {
    // Unreadable drafts are dropped.
  }
  chat.set(memberId, value);
  return value;
}
/** This member's chat drafts (empty until hydrated). */
export function readDrafts(memberId: string): Record<string, string> {
  return { ...(chat.get(memberId) ?? {}) };
}
/** The draft for one conversation. */
export function readDraft(memberId: string, thread: string): string {
  return chat.get(memberId)?.[`${memberId}/${thread}`] ?? '';
}
/** Saves (or with "" clears) one conversation's draft; returns all drafts. */
export function writeDraft(memberId: string, thread: string, text: string): Record<string, string> {
  const drafts = { ...(chat.get(memberId) ?? {}) };
  const k = `${memberId}/${thread}`;
  if (text) drafts[k] = text;
  else delete drafts[k];
  chat.set(memberId, drafts);
  AsyncStorage.setItem(chatKey(memberId), JSON.stringify(drafts)).catch(() => {
    // A full or blocked store only loses the draft.
  });
  return { ...drafts };
}
export async function clearDrafts(memberId: string) {
  chat.delete(memberId);
  try {
    await AsyncStorage.removeItem(chatKey(memberId));
  } catch {
    // Nothing to clear.
  }
}

export async function loadJoinDraft(userId: string): Promise<JoinDraft> {
  try {
    const raw = await AsyncStorage.getItem(joinKey(userId));
    if (!raw) return EMPTY_JOIN_DRAFT;
    const parsed = JSON.parse(raw) as Partial<JoinDraft>;
    return {
      side: parsed.side === 'talent' || parsed.side === 'venue' ? parsed.side : null,
      talent: parsed.talent ?? null,
      venue: parsed.venue ?? null,
    };
  } catch {
    return EMPTY_JOIN_DRAFT;
  }
}
/** Saves the whole draft. Steps are capped so a resumed draft never reopens the submit step. */
export async function saveJoinDraft(userId: string, draft: JoinDraft) {
  const capped: JoinDraft = {
    side: draft.side,
    talent: draft.talent && { ...draft.talent, step: Math.min(draft.talent.step, TALENT_LAST_RESUMABLE_STEP) },
    venue: draft.venue && { ...draft.venue, step: Math.min(draft.venue.step, VENUE_LAST_RESUMABLE_STEP) },
  };
  try {
    await AsyncStorage.setItem(joinKey(userId), JSON.stringify(capped));
  } catch {
    // Storage unavailable: the draft lives only in memory.
  }
}
// Writes for one user run in order, so a fast series of patches can't
// overwrite each other.
const joinQueue = new Map<string, Promise<void>>();
export function updateJoinDraft(userId: string, patch: Partial<JoinDraft>): Promise<void> {
  const prev = joinQueue.get(userId) ?? Promise.resolve();
  const next = prev.then(async () => saveJoinDraft(userId, { ...(await loadJoinDraft(userId)), ...patch }));
  joinQueue.set(userId, next.catch(() => {}));
  return next;
}
export async function clearJoinDraft(userId: string) {
  await (joinQueue.get(userId) ?? Promise.resolve());
  try {
    await AsyncStorage.removeItem(joinKey(userId));
  } catch {
    // Nothing to clear.
  }
}

/** Removes every chat and join draft on this device (logout). */
export async function clearAllDrafts() {
  chat.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(CHAT_PREFIX) || k.startsWith(JOIN_PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Storage can be unavailable; signing out still works.
  }
}
