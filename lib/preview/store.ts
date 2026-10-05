"use client";
import { useSyncExternalStore } from "react";
import { seed, transition, type Action, type Data } from "./model";
export const PREVIEW_KEY = "dyuknow_mvp_preview_v7";
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
// Puts back an earlier snapshot: the preview's Undo for one-tap answers.
export function restorePreview(value: Data) {
  write(value);
}
export function resetPreview() {
  const fresh = seed();
  write(fresh);
  return fresh;
}
function routeSubscribe(fn: () => void) {
  window.addEventListener("hashchange", fn);
  window.addEventListener("popstate", fn);
  window.addEventListener("pv-route", fn);
  return () => {
    window.removeEventListener("hashchange", fn);
    window.removeEventListener("popstate", fn);
    window.removeEventListener("pv-route", fn);
  };
}
// How many in-app screens sit behind this one. Kept on each history entry so
// the browser's own back and forward stay in step with it.
function depth() {
  return typeof history !== "undefined" && typeof history.state?.pv === "number"
    ? history.state.pv
    : 0;
}
export function usePreviewRoute() {
  return useSyncExternalStore(
    routeSubscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
}
export function navigateRoute(path: string, options: { replace?: boolean } = {}) {
  const url = `#${path}`;
  if (window.location.hash === url) return;
  if (options.replace) history.replaceState({ pv: depth() }, "", url);
  else history.pushState({ pv: depth() + 1 }, "", url);
  window.dispatchEvent(new Event("pv-route"));
  window.scrollTo({ top: 0, behavior: "instant" });
}
// Back to wherever this screen was opened from; a fresh link with nothing
// behind it goes to `fallback` instead.
export function navigateBack(fallback: string) {
  if (depth() > 0) history.back();
  else navigateRoute(fallback, { replace: true });
}
// Changes this entry's address without adding a step (e.g. a filter).
export function replaceRoute(path: string) {
  history.replaceState({ pv: depth() }, "", `#${path}`);
}
