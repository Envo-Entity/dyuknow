"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Page } from "@/components/layout/Page";
import { BookingCard } from "./BookingCard";
import { PastRow } from "./PastRow";
import { ME, PAST, PROP, TALENT } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import type { Side } from "@/lib/types";

export function BookingsView({ side }: { side: Side }) {
  const { data, markSeenBooking } = useAppStore();
  const isVenue = side === "venue";
  const booked = data.proposal === "accepted";
  const past = PAST[side];
  const emptyCtaLabel = isVenue ? "Who do you need today?" : "See venues booking near you";

  useEffect(() => {
    markSeenBooking(side);
  }, [side, markSeenBooking]);

  return (
    <Page>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        {ME[side].name} · the ledger
      </div>
      <h1 className="mt-3.5 font-serif text-[clamp(40px,8.5vw,84px)] font-normal leading-none tracking-[-0.015em]">
        Bookings
      </h1>
      <div className="lg:mt-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-[52px]">
        <div className="mt-[22px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">Upcoming</div>
          {booked ? (
            <BookingCard
              href={`/${side}/chat/larkspur-camille`}
              mono={isVenue ? TALENT.camille.mono : "L"}
              title={isVenue ? "Camille Aubert" : "The Larkspur"}
              sub={isVenue ? "Guest Head Chef · covers the pass" : "You’re booked · Guest Head Chef"}
              dates={PROP.dates}
              rate={PROP.rate}
            />
          ) : (
            <div className="mt-3 flex flex-col gap-[11px] rounded-[28px] bg-mist p-6">
              <span className="font-serif text-2xl leading-[1.1]">Nothing booked — yet.</span>
              <span className="text-[13px] leading-[1.5] text-muted">
                Confirmed bookings live here, visible from both sides of the table.
              </span>
              <Link
                href={`/${side}`}
                className="mt-1 self-start rounded-full border-none bg-ink px-5 py-[13px] text-[13.5px] font-semibold text-white"
              >
                {emptyCtaLabel}
              </Link>
            </div>
          )}
        </div>
        <div className="mt-[26px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">Past</div>
          <div className="mt-3 flex flex-col gap-2.5">
            {past.map((entry, i) => (
              <PastRow key={i} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
