"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { FormField } from "@/components/onboarding/FormField";
import { PhotoUploadStep } from "@/components/onboarding/PhotoUploadStep";
import { ROLES } from "@/lib/data";
import { useAppStore } from "@/lib/store";

const TOTAL_STEPS = 4;

export function VenueOnboarding() {
  const router = useRouter();
  const { data, completeOnboarding, setVenueIdentity } = useAppStore();
  const [step, setStep] = useState(0);

  const identity = data.venueIdentity;
  const name = identity?.name ?? "";
  const bio = identity?.bio ?? "";
  const photo = identity?.photo ?? null;
  const needs = identity?.needs ?? [];
  const mono = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

  useEffect(() => {
    if (data.onboarded.venue) router.replace("/app/venue");
  }, [data.onboarded.venue, router]);

  if (data.onboarded.venue) return null;

  function toggleNeed(roleName: string) {
    const next = needs.includes(roleName) ? needs.filter((n) => n !== roleName) : [...needs, roleName];
    setVenueIdentity({ needs: next });
  }

  function finish() {
    completeOnboarding("venue");
    router.push("/app/venue");
  }

  return (
    <OnboardingShell step={step} total={TOTAL_STEPS} onBack={() => (step === 0 ? router.push("/app") : setStep(step - 1))}>
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <Eyebrow>Your venue</Eyebrow>
            <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">
              Tell us about your venue.
            </div>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
              What we&rsquo;re called, and what we are — a hotel, a restaurant, Michelin-starred or not, in one line.
            </p>
          </div>
          <FormField label="Venue name" value={name} onChange={(v) => setVenueIdentity({ name: v })} placeholder="e.g. The Larkspur" />
          <FormField
            label="Describe it in one line"
            value={bio}
            onChange={(v) => setVenueIdentity({ bio: v })}
            placeholder="e.g. One Michelin star · Mayfair · Modern British"
          />
          <button
            type="button"
            disabled={!name.trim()}
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
              Talent see this before they say yes to a pass. You can change it anytime.
            </p>
          </div>
          <PhotoUploadStep mono={mono} photo={photo} onPhoto={(p) => setVenueIdentity({ photo: p })} />
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
            <Eyebrow>Your room</Eyebrow>
            <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em]">
              What do you usually need covered?
            </div>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
              We&rsquo;ll surface the right talent first. You can change this anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Chip key={role.id} active={needs.includes(role.name)} onClick={() => toggleNeed(role.name)}>
                {role.name}
              </Chip>
            ))}
          </div>
          <button type="button" onClick={() => setStep(3)} className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white">
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-6 text-center">
          <Avatar mono={mono} photoUrl={photo} size={64} tone="dark" />
          <div>
            <Eyebrow className="justify-center">You&rsquo;re in</Eyebrow>
            <div className="mt-2 font-serif text-[34px] leading-[1.05] tracking-[-0.01em]">{name || "Your venue"}</div>
            {bio && <div className="mt-1.5 text-[13px] text-muted">{bio}</div>}
          </div>
          <div className="flex w-full items-center gap-2 rounded-full bg-mist px-5 py-3 text-[13px] font-semibold text-ink">
            <span className="dot-pulse inline-block h-2.5 w-2.5 flex-none rounded-full bg-sage" />
            The pass is open · Fri 12 – Sun 14 Sep
          </div>
          <p className="max-w-[360px] text-[14.5px] leading-[1.6] text-ink-soft">
            We&rsquo;ve already lined up matches for the weekend your head chef is away. See who&rsquo;s available now.
          </p>
          <button type="button" onClick={finish} className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white">
            Enter Dyuknow
          </button>
        </div>
      )}
    </OnboardingShell>
  );
}
