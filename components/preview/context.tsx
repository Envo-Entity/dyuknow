"use client";
import { createContext, useContext } from "react";
import type { Action, Data, Member, Side } from "@/lib/preview/model";
export type PreviewContextValue = {
  data: Data;
  actor: string;
  side: Side;
  me: Member | undefined;
  go: (path: string) => void;
  act: (action: Action, success?: string) => Data | null;
  toast: (text: string) => void;
  error: string;
  profileBack: string;
};
export const PreviewContext = createContext<PreviewContextValue | null>(null);
export function usePreview() {
  return useContext(PreviewContext)!;
}
