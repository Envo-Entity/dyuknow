"use client";

import { useCallback, useEffect, useState } from "react";
import { TalentOnboarding } from "@/components/onboarding/TalentOnboarding";
import { VenueOnboarding } from "@/components/onboarding/VenueOnboarding";
import { ForkPanel } from "@/components/fork/ForkPanel";
import { CheckIcon } from "@/components/icons";
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
    <div className="animate-view-in flex min-h-screen flex-col bg-paper lg:bg-mist">
      <div className="flex flex-col items-center gap-1.5 px-6 pb-2 pt-9 lg:pt-14">
        <div className="font-serif text-[30px] tracking-[-0.01em] lg:text-[40px]">Who are you today?</div>
        {submittedCount > 0 && (
          <p className="mt-1 text-center text-[12.5px] font-semibold uppercase tracking-[0.1em] text-label">
            {submittedCount} submitted this session
          </p>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-4 pb-[26px] pt-[18px] lg:flex-row lg:gap-5 lg:px-10 lg:pb-16">
        <ForkPanel
          onClick={() => setMode("venue")}
          eyebrow="Venue"
          heading={
            <>
              Venue, looking <span className="font-serif italic font-normal">to hire</span>
            </>
          }
          body="A restaurant, hotel, bar or venue signing up — start their listing and match them with vetted, verified talent."
          continueLabel="Start venue intake"
        />
        <ForkPanel
          onClick={() => setMode("talent")}
          dark
          eyebrow="Talent"
          heading={
            <>
              Talent, looking <span className="font-serif italic font-normal">for work</span>
            </>
          }
          body="A chef, FOH, bar, events or management hire — start their profile and match them to shifts worth taking."
          continueLabel="Start talent intake"
        />
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
