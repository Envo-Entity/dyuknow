"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { FormField } from "@/components/onboarding/FormField";
import { PhotoUploadStep } from "@/components/onboarding/PhotoUploadStep";
import { AvailabilityCalendar } from "@/components/onboarding/AvailabilityCalendar";
import { ROLES } from "@/lib/data";
import { computeDays, useAppStore } from "@/lib/store";

const TOTAL_STEPS = 4;

export function TalentOnboarding() {
  const router = useRouter();
  const { data, toggleAvailDay, setAvailWindow, completeOnboarding, setTalentIdentity } = useAppStore();
  const [step, setStep] = useState(0);

  const identity = data.talentIdentity;
  const name = identity?.name ?? "";
  const role = identity?.role ?? "";
  const bio = identity?.bio ?? "";
  const photo = identity?.photo ?? null;
  const mono = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

  useEffect(() => {
    if (data.onboarded.talent) router.replace("/app/talent");
  }, [data.onboarded.talent, router]);

  if (data.onboarded.talent) return null;

  function finish() {
    completeOnboarding("talent");
    router.push("/app/talent");
  }

  return (
    <OnboardingShell step={step} total={TOTAL_STEPS} onBack={() => (step === 0 ? router.push("/app") : setStep(step - 1))}>
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <Eyebrow>Talent</Eyebrow>
            <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">Tell us about yourself.</div>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
              Nothing here is a job posting — just who&rsquo;s taking the pass.
            </p>
          </div>
          <FormField label="Your name" value={name} onChange={(v) => setTalentIdentity({ name: v })} placeholder="e.g. Camille Aubert" />
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">What do you do?</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Chip key={r.id} active={role === r.name} onClick={() => setTalentIdentity({ role: r.name })}>
                  {r.name}
                </Chip>
              ))}
            </div>
          </div>
          <FormField
            label="A line about your experience"
            value={bio}
            onChange={(v) => setTalentIdentity({ bio: v })}
            placeholder="e.g. ex-The Fat Duck · ex-Core by Clare Smyth"
          />
          <button
            type="button"
            disabled={!name.trim() || !role}
            onClick={() => setStep(1)}
            className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div>
            <Eyebrow className="justify-center">Photo</Eyebrow>
            <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">Add a photo.</div>
            <p className="mt-2.5 max-w-[340px] text-[14px] leading-[1.55] text-muted">
              Venues see this before they book you. You can change it anytime from your profile.
            </p>
          </div>
          <PhotoUploadStep mono={mono} photo={photo} onPhoto={(p) => setTalentIdentity({ photo: p })} />
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div>
            <Eyebrow>Availability</Eyebrow>
            <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">
              When can you take a pass?
            </div>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
              Mark the days you&rsquo;re open and the hours you&rsquo;d cover. Venues only ever see what&rsquo;s open —
              you can change this anytime from your profile.
            </p>
          </div>
          <AvailabilityCalendar
            days={computeDays(data)}
            onToggle={toggleAvailDay}
            from={data.availWindow.from}
            to={data.availWindow.to}
            onTimeChange={setAvailWindow}
          />
          <button type="button" onClick={() => setStep(3)} className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white">
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-6 text-center">
          <VerifiedBadge size={40} />
          <Avatar mono={mono} photoUrl={photo} size={64} />
          <div>
            <Eyebrow className="justify-center">You&rsquo;re verified</Eyebrow>
            <div className="mt-2 font-serif text-[34px] leading-[1.05] tracking-[-0.01em]">{name || "You're in"}</div>
            <div className="mt-1.5 text-[13px] text-muted">
              {role}
              {bio ? ` · ${bio}` : ""}
            </div>
          </div>
          <p className="max-w-[360px] text-[14.5px] leading-[1.6] text-ink-soft">
            You&rsquo;re a verified member. Venues booking near you are waiting on the other side.
          </p>
          <button type="button" onClick={finish} className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white">
            Enter Dyuknow
          </button>
        </div>
      )}
    </OnboardingShell>
  );
}
