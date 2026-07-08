"use client";

import { IdentityPill } from "./IdentityPill";
import { NavRail } from "./NavRail";
import { ME } from "@/lib/data";
import { useAppStore, unreadForSide } from "@/lib/store";
import { useRouteFlags } from "@/lib/useRoute";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { side } = useRouteFlags();
  const { data } = useAppStore();

  if (!side) {
    return <>{children}</>;
  }

  const me = ME[side];
  const msgBadge = unreadForSide(side, data);
  const bookBadge = data.seenBooking[side] === false;

  return (
    <>
      <IdentityPill side={side} meName={me.name} meMono={me.mono} />
      <NavRail side={side} meName={me.name} meMono={me.mono} msgBadge={msgBadge} bookBadge={bookBadge} />
      {children}
    </>
  );
}
