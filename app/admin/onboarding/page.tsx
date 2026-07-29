"use client";

import { useCallback, useState } from "react";
import { TalentOnboarding } from "@/components/onboarding/TalentOnboarding";
import { VenueOnboarding } from "@/components/onboarding/VenueOnboarding";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { EMPTY_TALENT_IDENTITY, EMPTY_VENUE_IDENTITY } from "@/lib/store";
import type { TalentIdentity, VenueIdentity } from "@/lib/types";

type Mode = "picker" | "talent" | "venue";

export default function AdminOnboardingPage() {
  const [mode, setMode] = useState<Mode>("picker");
  const [talentDraft, setTalentDraft] = useState<TalentIdentity | null>(null);
  const [venueDraft, setVenueDraft] = useState<VenueIdentity | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);

  const patchTalent = useCallback((patch: Partial<TalentIdentity>) => {
    setTalentDraft((prev) => ({ ...EMPTY_TALENT_IDENTITY, ...prev, ...patch }));
  }, []);

  const patchVenue = useCallback((patch: Partial<VenueIdentity>) => {
    setVenueDraft((prev) => ({ ...EMPTY_VENUE_IDENTITY, ...prev, ...patch }));
  }, []);

  function backToPicker() {
    setTalentDraft(null);
    setVenueDraft(null);
    setMode("picker");
  }

  function startNext() {
    setTalentDraft(null);
    setVenueDraft(null);
    setSubmittedCount((n) => n + 1);
    setMode("picker");
  }

  if (mode === "talent") {
    return <TalentOnboarding identity={talentDraft} onPatch={patchTalent} onBack0={backToPicker} onDone={startNext} />;
  }

  if (mode === "venue") {
    return <VenueOnboarding identity={venueDraft} onPatch={patchVenue} onBack0={backToPicker} onDone={startNext} />;
  }

  return (
    <div className="animate-view-in flex min-h-screen flex-col items-center bg-paper px-6 pb-14 pt-9">
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center gap-8 py-10">
        <div>
          <Eyebrow>Dyuknow · Onboarding intake</Eyebrow>
          <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">Who are we onboarding?</div>
          <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
            Pick a side to start a new entry. Each submission is independent — there&rsquo;s no limit, and nothing
            carries over between entries.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("talent")}
            className="w-full cursor-pointer rounded-2xl border border-border bg-paper px-5 py-4 text-left transition-colors hover:border-ink"
          >
            <span className="block text-[15px] font-semibold text-ink">Talent</span>
            <span className="mt-0.5 block text-[13px] text-muted">A chef, FOH, bar, events or management hire.</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("venue")}
            className="w-full cursor-pointer rounded-2xl border border-border bg-paper px-5 py-4 text-left transition-colors hover:border-ink"
          >
            <span className="block text-[15px] font-semibold text-ink">Venue</span>
            <span className="mt-0.5 block text-[13px] text-muted">A restaurant, hotel, bar or venue signing up.</span>
          </button>
        </div>
        {submittedCount > 0 && (
          <p className="text-center text-[12.5px] font-semibold uppercase tracking-[0.1em] text-label">
            {submittedCount} submitted this session
          </p>
        )}
      </div>
    </div>
  );
}
