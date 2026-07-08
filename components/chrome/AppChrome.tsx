"use client";

import { IdentityPill } from "./IdentityPill";
import { NavRail } from "./NavRail";
import { useAppStore, unreadForSide, displayIdentity } from "@/lib/store";
import { useRouteFlags } from "@/lib/useRoute";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { side, isOnboarding } = useRouteFlags();
  const { data } = useAppStore();

  if (!side || isOnboarding) {
    return <>{children}</>;
  }

  const me = displayIdentity(side, data);
  const msgBadge = unreadForSide(side, data);
  const bookBadge = data.seenBooking[side] === false;

  return (
    <>
      <IdentityPill side={side} meName={me.name} meMono={me.mono} mePhoto={me.photo} />
      <NavRail side={side} meName={me.name} meMono={me.mono} mePhoto={me.photo} msgBadge={msgBadge} bookBadge={bookBadge} />
      {children}
    </>
  );
}
