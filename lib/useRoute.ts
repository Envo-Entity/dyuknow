"use client";

import { usePathname } from "next/navigation";
import type { Side } from "./types";

export function useRouteFlags() {
  const pathname = usePathname();
  const side: Side | null = pathname.startsWith("/app/venue")
    ? "venue"
    : pathname.startsWith("/app/talent")
      ? "talent"
      : null;

  const isChat = pathname.includes("/chat/");
  const isBookings = pathname.endsWith("/bookings");
  const isMessages = pathname.endsWith("/messages");
  const isMyProfile = pathname === "/app/talent/me" || pathname === "/app/venue/me";
  const isOnboarding = pathname.endsWith("/onboarding");
  const isHome =
    !!side &&
    (pathname === `/app/${side}` ||
      pathname.startsWith(`/app/${side}/role/`) ||
      pathname.startsWith(`/app/${side}/t/`) ||
      pathname.startsWith(`/app/${side}/venue/`));

  return { pathname, side, isChat, isBookings, isMessages, isMyProfile, isOnboarding, isHome };
}
