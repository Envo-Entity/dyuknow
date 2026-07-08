"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { AccountIcon, BookingsIcon, HomeIcon, MessagesIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useRouteFlags } from "@/lib/useRoute";
import type { Side } from "@/lib/types";

interface NavRailProps {
  side: Side;
  meName: string;
  meMono: string;
  msgBadge: boolean;
  bookBadge: boolean;
}

function NavButton({
  href,
  active,
  title,
  badge,
  children,
}: {
  href: string;
  active: boolean;
  title: string;
  badge?: boolean;
  children: React.ReactNode;
}) {
  const classes = cn(
    "relative flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full transition-transform hover:-translate-y-0.5",
    "shadow-[0_12px_32px_rgba(5,5,5,0.14)] lg:shadow-[0_12px_32px_rgba(5,5,5,0.14)]",
    active ? "bg-ink text-white" : "bg-paper text-ink"
  );
  const badgeDot = badge ? (
    <span className="dot-pulse absolute right-[2px] top-[2px] h-[12px] w-[12px] rounded-full border-2 border-white bg-sage" />
  ) : null;

  return (
    <Link href={href} title={title} className={classes}>
      {children}
      {badgeDot}
    </Link>
  );
}

export function NavRail({ side, meName, meMono, msgBadge, bookBadge }: NavRailProps) {
  const { isHome, isBookings, isMessages, isChat, isMyProfile } = useRouteFlags();
  const messagesActive = isMessages || isChat;

  return (
    <div
      className={cn(
        "fixed z-[65] flex items-center gap-[7px] rounded-full bg-white/96 p-2 shadow-[0_20px_54px_rgba(5,5,5,0.20)] backdrop-blur-md",
        "bottom-4 left-1/2 -translate-x-1/2 flex-row",
        "lg:left-6 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col lg:gap-3 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
        isChat && "hidden lg:flex"
      )}
    >
      <div className="mb-3 hidden flex-col items-center gap-[5px] text-center lg:flex">
        <Link href={`/${side}/me`}>
          <Avatar mono={meMono} size={46} className="shadow-[0_8px_24px_rgba(5,5,5,0.12)]" />
        </Link>
        <div className="max-w-[86px] text-[11.5px] font-semibold leading-tight">{meName}</div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-label">{side}</div>
      </div>
      <NavButton href={`/${side}`} active={isHome} title="Home">
        <HomeIcon />
      </NavButton>
      <NavButton href={`/${side}/bookings`} active={isBookings} title="Bookings" badge={bookBadge}>
        <BookingsIcon />
      </NavButton>
      <NavButton href={`/${side}/messages`} active={messagesActive} title="Messages" badge={msgBadge}>
        <MessagesIcon />
      </NavButton>
      <NavButton href={`/${side}/me`} active={isMyProfile} title="Profile">
        <AccountIcon />
      </NavButton>
    </div>
  );
}
