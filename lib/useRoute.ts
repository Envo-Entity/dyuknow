"use client";

import { usePathname } from "next/navigation";
import type { Side } from "./types";

export function useRouteFlags() {
  const pathname = usePathname();
  const side: Side | null = pathname.startsWith("/venue")
    ? "venue"
    : pathname.startsWith("/talent")
      ? "talent"
      : null;

  const isChat = pathname.includes("/chat/");
  const isBookings = pathname.endsWith("/bookings");
  const isMessages = pathname.endsWith("/messages");
  const isMyProfile = pathname === "/talent/me" || pathname === "/venue/me";
  const isOnboarding = pathname.endsWith("/onboarding");
  const isHome =
    !!side &&
    (pathname === `/${side}` ||
      pathname.startsWith(`/${side}/role/`) ||
      pathname.startsWith(`/${side}/t/`) ||
      pathname.startsWith(`/${side}/venue/`));

  return { pathname, side, isChat, isBookings, isMessages, isMyProfile, isOnboarding, isHome };
}
