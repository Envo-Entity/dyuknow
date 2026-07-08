"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { FeedCard } from "./FeedCard";
import { CHIPS, FEED } from "@/lib/data";

const SPAN_DESKTOP: Record<string, string> = {
  larkspur: "lg:col-[1/span_2] lg:row-[1/span_2]",
  meridian: "lg:col-[3] lg:row-[1/span_2]",
  ansley: "lg:col-[1] lg:row-[3]",
  belgravia: "lg:col-[2/span_2] lg:row-[3]",
};

export function OpportunityFeed({ showScarcity }: { showScarcity: boolean }) {
  const [filter, setFilter] = useState<string>("All");
  const feed = FEED.filter((f) => filter === "All" || f.tag === filter);
  const unfiltered = filter === "All";

  return (
    <>
      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-2 pt-1 lg:mx-0 lg:mt-7 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0">
        {CHIPS.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </div>
      {feed.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:auto-rows-[190px] lg:gap-[18px]">
          {feed.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              showScarcity={showScarcity}
              large={item.id === "larkspur"}
              className={unfiltered ? SPAN_DESKTOP[item.id] : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-center rounded-[26px] bg-mist p-6 font-serif text-lg italic text-muted">
          Nothing in this register tonight.
        </div>
      )}
    </>
  );
}
