"use client";

import { useCallback, useEffect, useState } from "react";
import { TalentOnboarding } from "@/components/onboarding/TalentOnboarding";
import { VenueOnboarding } from "@/components/onboarding/VenueOnboarding";
import { CheckIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { EMPTY_TALENT_IDENTITY, EMPTY_VENUE_IDENTITY } from "@/lib/store";
import type { TalentIdentity, VenueIdentity } from "@/lib/types";

type Mode = "picker" | "talent" | "venue";

export default function AdminOnboardingPage() {
  const [mode, setMode] = useState<Mode>("picker");
  const [talentDraft, setTalentDraft] = useState<TalentIdentity | null>(null);
  const [venueDraft, setVenueDraft] = useState<VenueIdentity | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

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

  // Only reached once TalentOnboarding/VenueOnboarding have confirmed the
  // Supabase submit actually succeeded — see their finish() functions.
  function startNext(side: "talent" | "venue") {
    setTalentDraft(null);
    setVenueDraft(null);
    setSubmittedCount((n) => n + 1);
    setToast(side === "talent" ? "Talent onboarding submitted." : "Venue onboarding submitted.");
    setMode("picker");
  }

  if (mode === "talent") {
    return <TalentOnboarding identity={talentDraft} onPatch={patchTalent} onBack0={backToPicker} onDone={() => startNext("talent")} />;
  }

  if (mode === "venue") {
    return <VenueOnboarding identity={venueDraft} onPatch={patchVenue} onBack0={backToPicker} onDone={() => startNext("venue")} />;
  }

  return (
    <div className="animate-view-in flex min-h-screen flex-col items-center bg-paper px-6 pb-14 pt-9 lg:bg-mist lg:px-10 lg:py-16">
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center gap-8 py-10 lg:max-w-[600px] lg:rounded-[30px] lg:bg-paper lg:px-14 lg:py-14 lg:shadow-[0_20px_60px_rgba(5,5,5,0.08)]">
        <div>
          <Eyebrow>Dyuknow · Onboarding intake</Eyebrow>
          <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em] lg:text-[40px]">Who are we onboarding?</div>
          <p className="mt-2.5 text-[14px] leading-[1.55] text-muted lg:text-[16px] lg:leading-[1.6]">
            Pick a side to start a new entry. Each submission is independent — there&rsquo;s no limit, and nothing
            carries over between entries.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("talent")}
            className="w-full cursor-pointer rounded-2xl border border-border bg-paper px-5 py-4 text-left transition-colors hover:border-ink lg:py-5"
          >
            <span className="block text-[15px] font-semibold text-ink lg:text-[16px]">Talent</span>
            <span className="mt-0.5 block text-[13px] text-muted lg:text-[14px]">A chef, FOH, bar, events or management hire.</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("venue")}
            className="w-full cursor-pointer rounded-2xl border border-border bg-paper px-5 py-4 text-left transition-colors hover:border-ink lg:py-5"
          >
            <span className="block text-[15px] font-semibold text-ink lg:text-[16px]">Venue</span>
            <span className="mt-0.5 block text-[13px] text-muted lg:text-[14px]">A restaurant, hotel, bar or venue signing up.</span>
          </button>
        </div>
        {submittedCount > 0 && (
          <p className="text-center text-[12.5px] font-semibold uppercase tracking-[0.1em] text-label">
            {submittedCount} submitted this session
          </p>
        )}
      </div>

      {toast && (
        <div className="animate-fade-in fixed inset-x-0 bottom-8 flex justify-center px-6">
          <div className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white shadow-lg">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sage">
              <CheckIcon size={11} className="text-ink" />
            </span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
