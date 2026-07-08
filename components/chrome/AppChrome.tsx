"use client";

import { useState } from "react";
import { IdentityPill } from "./IdentityPill";
import { NavRail } from "./NavRail";
import { AccountSheet } from "./AccountSheet";
import { ME } from "@/lib/data";
import { useAppStore, unreadForSide } from "@/lib/store";
import { useRouteFlags } from "@/lib/useRoute";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { side } = useRouteFlags();
  const { data } = useAppStore();
  const [acctOpen, setAcctOpen] = useState(false);

  if (!side) {
    return <>{children}</>;
  }

  const me = ME[side];
  const msgBadge = unreadForSide(side, data);
  const bookBadge = data.seenBooking[side] === false;

  return (
    <>
      <IdentityPill side={side} meName={me.name} meMono={me.mono} onClick={() => setAcctOpen((v) => !v)} />
      <NavRail
        side={side}
        meName={me.name}
        meMono={me.mono}
        msgBadge={msgBadge}
        bookBadge={bookBadge}
        acctOpen={acctOpen}
        onAccountClick={() => setAcctOpen((v) => !v)}
      />
      <AccountSheet
        open={acctOpen}
        side={side}
        meName={me.name}
        meMono={me.mono}
        meSub={me.sub}
        onClose={() => setAcctOpen(false)}
      />
      {children}
    </>
  );
}
