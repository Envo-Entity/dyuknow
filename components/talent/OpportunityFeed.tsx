"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { PhotoMosaic } from "@/components/ui/PhotoMosaic";
import { CHIPS, FEED } from "@/lib/data";

// Same rule as RoleMosaic: tall on phone (so the photo has room to breathe
// under a dense text overlay), relaxing to landscape at md — no per-venue
// tuning needed, any feed length keeps repeating it.
const ASPECT_PATTERN = [
  "aspect-[4/5] md:aspect-[16/10]",
  "aspect-[3/4] md:aspect-[4/3]",
  "aspect-square",
  "aspect-[5/6] md:aspect-[3/2]",
];

export function OpportunityFeed() {
  const [filter, setFilter] = useState<string>("All");
  const feed = FEED.filter((f) => filter === "All" || f.tag === filter);
  const items = feed.map((item) => ({ ...item, href: `/app/talent/venue/${item.id}` }));

  return (
    <>
      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-2 pt-1 lg:mx-0 lg:mt-7 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0">
        {CHIPS.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </div>
      {items.length > 0 ? (
        <PhotoMosaic
          className="mt-4"
          items={items}
          aspectPattern={ASPECT_PATTERN}
          renderBadge={(item) =>
            item.isNew ? (
              <span className="absolute left-[11px] top-[11px] rounded-full bg-sage px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                New · 12 min
              </span>
            ) : null
          }
          renderOverlay={(item) => (
            <>
              <div className="truncate font-serif text-[19px] leading-[1.05] md:text-[22px]">{item.venue}</div>
              <div className="truncate text-[12.5px] font-semibold">
                {item.role} · {item.dates}
              </div>
              <div className="truncate text-[11.5px] text-muted">{item.rate}</div>
            </>
          )}
        />
      ) : (
        <div className="mt-4 flex items-center justify-center rounded-[26px] bg-mist p-6 font-serif text-lg italic text-muted">
          Nothing in this register tonight.
        </div>
      )}
    </>
  );
}
