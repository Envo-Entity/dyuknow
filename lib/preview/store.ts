"use client";
import { useSyncExternalStore } from "react";
import { seed, transition, type Action, type Data } from "./model";
export const PREVIEW_KEY = "dyuknow_mvp_preview_v6";
const initial = seed();
let current = initial;
let loaded = false;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const value = JSON.parse(localStorage.getItem(PREVIEW_KEY) || "null");
    if (value?.version === 2) current = value;
  } catch {
    /* A fresh preview recovers an unreadable saved state. */
  }
}
function write(value: Data) {
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(value));
  current = value;
  emit();
}
function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const sync = (e: StorageEvent) => {
    if (e.key === PREVIEW_KEY && e.newValue) {
      try {
        current = JSON.parse(e.newValue);
        emit();
      } catch {
        /* Ignore an incomplete external write. */
      }
    }
  };
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", sync);
  };
}
export function usePreviewData() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return current;
    },
    () => initial,
  );
}
export function dispatch(action: Action): Data {
  load();
  // Read the most recent snapshot so switching between tabs sees both sides.
  const latest = localStorage.getItem(PREVIEW_KEY);
  if (latest) current = JSON.parse(latest);
  try {
    const next = transition(current, action);
    write(next);
    return next;
  } catch (error) {
    if (
      current.failNext &&
      ![
        "settings",
        "read-chat",
        "read-notice",
        "save-draft",
        "draft-message",
        "advance",
      ].includes(action.type)
    )
      write({ ...current, failNext: false });
    throw error;
  }
}
export function resetPreview() {
  const fresh = seed();
  write(fresh);
  return fresh;
}
function routeSubscribe(fn: () => void) {
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
}
export function usePreviewRoute() {
  return useSyncExternalStore(
    routeSubscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
}
export function navigateRoute(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "instant" });
}
