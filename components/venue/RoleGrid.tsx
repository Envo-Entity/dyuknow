"use client";

import { BackButton } from "@/components/ui/BackButton";
import { Page } from "@/components/layout/Page";
import { TalentCard } from "./TalentCard";
import { ROLES, TALENT } from "@/lib/data";
import { availabilityOf, useAppStore } from "@/lib/store";

export function RoleGrid({ roleId }: { roleId: string }) {
  const { data } = useAppStore();
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  const roleIds = role.top ? [role.top, ...role.talent] : role.talent;

  return (
    <Page variant="detail">
      <div className="flex items-center gap-3">
        <BackButton fallback="/app/venue" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">{role.sub}</span>
      </div>
      <h1 className="mt-4 font-serif text-[clamp(40px,8vw,80px)] font-normal leading-none tracking-[-0.015em]">
        {role.name}
      </h1>
      <div className="mt-[26px] px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
        {role.metric}
      </div>
      <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-4">
        {roleIds.map((id) => {
          const t = TALENT[id];
          const avail = availabilityOf(id, data);
          return (
            <TalentCard
              key={id}
              talent={t}
              availText={avail.text}
              availSage={avail.sage}
              showAvail={id === "camille"}
            />
          );
        })}
      </div>
    </Page>
  );
}
