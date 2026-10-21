"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TalentOnboarding } from "@/components/onboarding/TalentOnboarding";
import { VenueOnboarding } from "@/components/onboarding/VenueOnboarding";
import { EMPTY_TALENT_IDENTITY, EMPTY_VENUE_IDENTITY } from "@/lib/store";
import {
  clearJoinDraft,
  loadJoinDraft,
  submitTalentSelfServe,
  submitVenueSelfServe,
  updateJoinDraft,
} from "@/lib/onboardingSelfServe";
import type { TalentIdentity, VenueIdentity } from "@/lib/types";

// The last step submits as soon as it opens, so a resumed draft reopens one before it.
const TALENT_LAST_RESUMABLE_STEP = 7;
const VENUE_LAST_RESUMABLE_STEP = 6;

interface JoinProps {
  userId: string;
  email: string;
}

type Loaded<T> = { identity: T; step: number };

export function JoinTalent({ userId, email }: JoinProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded<TalentIdentity> | null>(null);
  const [identity, setIdentity] = useState<TalentIdentity | null>(null);
  const [step, setStep] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const draft = loadJoinDraft(userId);
    const saved = draft.talent;
    const start: Loaded<TalentIdentity> = {
      // The login email is the identity; it is shown read-only and never asked.
      identity: { ...EMPTY_TALENT_IDENTITY, ...saved?.identity, email },
      step: Math.min(Math.max(saved?.step ?? 0, 0), TALENT_LAST_RESUMABLE_STEP),
    };
    // Local storage only exists in the browser, so the draft is read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(start);
    setStep(start.step);
    setIdentity(start.identity);
    if (draft.side !== "talent") updateJoinDraft(userId, { side: "talent" });
  }, [userId, email]);

  // Keep the draft current: every answer and the step reached, until submitted.
  useEffect(() => {
    if (doneRef.current || !loaded || !identity) return;
    updateJoinDraft(userId, { side: "talent", talent: { identity, step: Math.min(step, TALENT_LAST_RESUMABLE_STEP) } });
  }, [userId, loaded, identity, step]);

  const onPatch = useCallback(
    (patch: Partial<TalentIdentity>) => {
      setIdentity((prev) => ({ ...EMPTY_TALENT_IDENTITY, ...prev, ...patch, email }));
    },
    [email]
  );

  const submit = useCallback(
    async (answers: TalentIdentity) => {
      const result = await submitTalentSelfServe(userId, answers);
      if (result.ok) {
        doneRef.current = true;
        clearJoinDraft(userId);
      }
      return result;
    },
    [userId]
  );

  if (!loaded) return <div className="min-h-screen bg-paper lg:bg-mist" />;

  return (
    <TalentOnboarding
      identity={identity}
      onPatch={onPatch}
      onBack0={() => router.push("/join")}
      onDone={() => window.location.assign("/app")}
      submit={submit}
      loginEmail={email}
      initialStep={loaded.step}
      onStepChange={setStep}
    />
  );
}

export function JoinVenue({ userId, email }: JoinProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded<VenueIdentity> | null>(null);
  const [identity, setIdentity] = useState<VenueIdentity | null>(null);
  const [step, setStep] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const draft = loadJoinDraft(userId);
    const saved = draft.venue;
    const start: Loaded<VenueIdentity> = {
      // The on-site contact's email starts as the login email but stays editable.
      identity: saved?.identity ? { ...EMPTY_VENUE_IDENTITY, ...saved.identity } : { ...EMPTY_VENUE_IDENTITY, contactEmail: email },
      step: Math.min(Math.max(saved?.step ?? 0, 0), VENUE_LAST_RESUMABLE_STEP),
    };
    // Local storage only exists in the browser, so the draft is read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(start);
    setStep(start.step);
    setIdentity(start.identity);
    if (draft.side !== "venue") updateJoinDraft(userId, { side: "venue" });
  }, [userId, email]);

  // Keep the draft current: every answer and the step reached, until submitted.
  useEffect(() => {
    if (doneRef.current || !loaded || !identity) return;
    updateJoinDraft(userId, { side: "venue", venue: { identity, step: Math.min(step, VENUE_LAST_RESUMABLE_STEP) } });
  }, [userId, loaded, identity, step]);

  const onPatch = useCallback(
    (patch: Partial<VenueIdentity>) => {
      setIdentity((prev) => ({ ...EMPTY_VENUE_IDENTITY, ...prev, ...patch }));
    },
    []
  );

  const submit = useCallback(
    async (answers: VenueIdentity) => {
      const result = await submitVenueSelfServe(userId, answers);
      if (result.ok) {
        doneRef.current = true;
        clearJoinDraft(userId);
      }
      return result;
    },
    [userId]
  );

  if (!loaded) return <div className="min-h-screen bg-paper lg:bg-mist" />;

  return (
    <VenueOnboarding
      identity={identity}
      onPatch={onPatch}
      onBack0={() => router.push("/join")}
      onDone={() => window.location.assign("/app")}
      submit={submit}
      initialStep={loaded.step}
      onStepChange={setStep}
    />
  );
}
