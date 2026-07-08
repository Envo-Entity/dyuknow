"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CONVOS, DAY_DEFS, PROP, defaultAppData } from "./data";
import type { AppData, DayCode, Side } from "./types";

const STORAGE_KEY = "dyuknow_v1";

interface AppStore {
  data: AppData;
  sendMessage: (chatId: string, side: Side, text: string) => void;
  sendProposal: () => void;
  acceptProposal: (side: Side) => void;
  declineProposal: () => void;
  toggleAvailDay: (day: DayCode) => void;
  toggleSaved: (id: string) => void;
  requestIntro: (id: string) => void;
  markRead: (side: Side, chatId: string) => void;
  markSeenBooking: (side: Side) => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

function loadInitial(): AppData {
  const base = defaultAppData();
  if (typeof window === "undefined") return base;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved) return base;
    return {
      ...base,
      ...saved,
      read: { ...base.read, ...saved.read },
      convos: { ...base.convos, ...saved.convos },
    };
  } catch {
    return base;
  }
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultAppData);
  const hydrated = useRef(false);

  useEffect(() => {
    // One-time sync from localStorage (an external store) after hydration,
    // so the server-rendered markup always matches the client's first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadInitial());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const sendMessage = useCallback((chatId: string, side: Side, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setData((d) => {
      const other: Side = side === "venue" ? "talent" : "venue";
      return {
        ...d,
        convos: {
          ...d.convos,
          [chatId]: [...(d.convos[chatId] ?? []), { from: side, kind: "text", text: trimmed }],
        },
        read: { ...d.read, [other]: { ...d.read[other], [chatId]: false } },
      };
    });
  }, []);

  const sendProposal = useCallback(() => {
    setData((d) => {
      const chatId = "larkspur-camille";
      const existing = d.convos[chatId] ?? [];
      const alreadySent = existing.some((m) => m.kind === "proposal");
      return {
        ...d,
        proposal: "sent",
        convos: {
          ...d.convos,
          [chatId]: alreadySent ? existing : [...existing, { from: "venue", kind: "proposal" }],
        },
        read: { ...d.read, talent: { ...d.read.talent, [chatId]: false } },
      };
    });
  }, []);

  const acceptProposal = useCallback((side: Side) => {
    setData((d) => {
      const chatId = "larkspur-camille";
      return {
        ...d,
        proposal: "accepted",
        convos: {
          ...d.convos,
          [chatId]: [
            ...(d.convos[chatId] ?? []),
            { from: "talent", kind: "system", text: `Booked · ${PROP.role} · ${PROP.dates}` },
          ],
        },
        seenBooking: { venue: false, talent: false, [side]: false },
        read: { ...d.read, venue: { ...d.read.venue, [chatId]: false } },
      };
    });
  }, []);

  const declineProposal = useCallback(() => {
    setData((d) => ({
      ...d,
      proposal: "declined",
      read: { ...d.read, venue: { ...d.read.venue, "larkspur-camille": false } },
    }));
  }, []);

  const toggleAvailDay = useCallback((day: DayCode) => {
    setData((d) => ({ ...d, avail: { ...d.avail, [day]: !d.avail[day] } }));
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setData((d) => ({ ...d, saved: { ...d.saved, [id]: !d.saved[id] } }));
  }, []);

  const requestIntro = useCallback((id: string) => {
    setData((d) => ({ ...d, intros: { ...d.intros, [id]: true } }));
  }, []);

  const markRead = useCallback((side: Side, chatId: string) => {
    setData((d) => {
      if (d.read[side]?.[chatId] === true) return d;
      return { ...d, read: { ...d.read, [side]: { ...d.read[side], [chatId]: true } } };
    });
  }, []);

  const markSeenBooking = useCallback((side: Side) => {
    setData((d) => {
      if (d.seenBooking[side] === true) return d;
      return { ...d, seenBooking: { ...d.seenBooking, [side]: true } };
    });
  }, []);

  const value: AppStore = {
    data,
    sendMessage,
    sendProposal,
    acceptProposal,
    declineProposal,
    toggleAvailDay,
    toggleSaved,
    requestIntro,
    markRead,
    markSeenBooking,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

export function otherSide(side: Side): Side {
  return side === "venue" ? "talent" : "venue";
}

export function availabilityOf(talentId: string, data: AppData) {
  const weekendOpen = data.avail.Fri && data.avail.Sat && data.avail.Sun;
  const booked = data.proposal === "accepted";
  if (talentId === "camille") {
    if (booked) return { text: "Booked · Fri – Sun", sage: true };
    if (weekendOpen) return { text: "Available this weekend", sage: true };
    return { text: "Limited availability", sage: false };
  }
  return { text: "Available on request", sage: false };
}

export function unreadForSide(side: Side, data: AppData) {
  const ids = Object.keys(CONVOS).filter((id) =>
    side === "venue" ? CONVOS[id].venue === "The Larkspur" : CONVOS[id].talent === "camille"
  );
  return ids.some((id) => data.read[side]?.[id] !== true);
}

export interface DayCell {
  day: DayCode;
  num: string;
  state: "booked" | "open" | "held";
}

export function computeDays(data: AppData): DayCell[] {
  const booked = data.proposal === "accepted";
  return DAY_DEFS.map(([day, num]) => {
    const isBooked = booked && (day === "Fri" || day === "Sat" || day === "Sun");
    const open = !!data.avail[day];
    return {
      day,
      num,
      state: isBooked ? "booked" : open ? "open" : "held",
    };
  });
}

export function proposalStatus(proposal: AppData["proposal"]) {
  switch (proposal) {
    case "sent":
      return { text: "Awaiting response", sage: false };
    case "accepted":
      return { text: "Booked · Fri – Sun", sage: true };
    case "declined":
      return { text: "Declined", sage: false };
    default:
      return { text: "Not yet proposed", sage: false };
  }
}

export function lastMessagePreview(chatId: string, data: AppData) {
  const arr = data.convos[chatId] ?? [];
  const last = arr[arr.length - 1];
  if (!last) return "—";
  if (last.kind === "proposal") return `Booking proposal · ${PROP.dates}`;
  return last.text ?? "";
}

export function convoIdsForSide(side: Side) {
  return Object.keys(CONVOS).filter((id) =>
    side === "venue" ? CONVOS[id].venue === "The Larkspur" : CONVOS[id].talent === "camille"
  );
}
