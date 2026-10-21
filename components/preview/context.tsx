"use client";
import { createContext, useContext } from "react";
import type { Data, Member, Side } from "@/lib/preview/model";
import type { AppAction } from "@/lib/live/actions";
export type { AppAction };
// What only the real app (/app) has: the signed-in login and its extras.
export type LiveExtras = {
  email: string;
  // Document label → why Dyuknow didn't accept it.
  rejected: Record<string, string>;
  logout: () => void;
};
export type PreviewContextValue = {
  data: Data;
  actor: string;
  side: Side;
  me: Member | undefined;
  go: (path: string) => void;
  // Returns to the previous screen, or `fallback` when there is none.
  back: (fallback: string) => void;
  // Resolves to the data after the change, or null when it was refused (the
  // message is shown). `undo` adds an Undo button to the success message for
  // a few seconds, in the demo only.
  act: (action: AppAction, success?: string, options?: { undo?: boolean }) => Promise<Data | null>;
  toast: (text: string) => void;
  error: string;
  profileBack: string;
  // Set in the real app; missing in the browser-only demo (/preview).
  live?: LiveExtras;
};
export const PreviewContext = createContext<PreviewContextValue | null>(null);
export function usePreview() {
  return useContext(PreviewContext)!;
}
