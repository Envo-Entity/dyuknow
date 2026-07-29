"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { FormField } from "@/components/onboarding/FormField";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { ContinueButton } from "@/components/onboarding/ContinueButton";
import { ChipField } from "@/components/onboarding/ChipField";
import { CheckboxGroup } from "@/components/onboarding/CheckboxGroup";
import { SwitchField } from "@/components/onboarding/Switch";
import { TextareaField } from "@/components/onboarding/Textarea";
import { UploadRow } from "@/components/onboarding/UploadRow";
import { EmployerRepeater } from "@/components/onboarding/EmployerRepeater";
import { PhotoStep } from "@/components/onboarding/PhotoStep";
import {
  CHEF_POSITIONS,
  CHEF_SKILLS,
  FOH_POSITIONS,
  FOH_SKILLS,
  HOURLY_RATE_OPTIONS,
  LONDON_AREAS,
  MAX_TRAVEL_OPTIONS,
  SHIFT_TYPES,
  TEAM_AGREEMENTS,
  TEAM_CATEGORIES,
  YEARS_BANDS,
  knownForOptions,
} from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { submitTalentOnboarding } from "@/lib/onboardingSubmit";

const TOTAL_STEPS = 9;

export function TalentOnboarding() {
  const router = useRouter();
  const { data, completeOnboarding, setTalentIdentity } = useAppStore();
  const [step, setStep] = useState(0);

  const identity = data.talentIdentity;
  const name = identity?.name ?? "";
  const mobile = identity?.mobile ?? "";
  const email = identity?.email ?? "";
  const postcode = identity?.postcode ?? "";
  const dob = identity?.dob ?? "";
  const photo = identity?.photo ?? null;
  const category = identity?.category ?? "";
  const position = identity?.position ?? "";
  const skills = identity?.skills ?? [];
  const yearsBand = identity?.yearsBand ?? "";
  const employers = identity?.employers ?? [];
  const availableToday = identity?.availableToday ?? false;
  const preferredShifts = identity?.preferredShifts ?? [];
  const maxTravel = identity?.maxTravel ?? "";
  const preferredAreas = identity?.preferredAreas ?? [];
  const preferredRate = identity?.preferredRate ?? "";
  const minSameDayRate = identity?.minSameDayRate ?? "";
  const rightToWork = identity?.rightToWork ?? null;
  const foodSafetyCert = identity?.foodSafetyCert ?? null;
  const cv = identity?.cv ?? null;
  const bio = identity?.bio ?? "";
  const knownFor = identity?.knownFor ?? [];
  const agreedCommunity = identity?.agreedCommunity ?? [];
  const role = identity?.role ?? "";
  const mono = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

  useEffect(() => {
    if (data.onboarded.talent) router.replace("/app/talent");
  }, [data.onboarded.talent, router]);

  if (data.onboarded.talent) return null;

  const needsPosition = category === "Chef" || category === "Front of House";
  const positionOptions = category === "Chef" ? CHEF_POSITIONS : FOH_POSITIONS;
  const skillOptions = category === "Chef" ? CHEF_SKILLS : FOH_SKILLS;
  const knownForChoices = knownForOptions(category);

  function setCategory(next: string) {
    setTalentIdentity({ category: next, position: "", skills: [], role: next });
  }

  function setPosition(next: string) {
    setTalentIdentity({ position: next, role: next });
  }

  function toggleFromList(list: string[], value: string, onChange: (next: string[]) => void) {
    onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleKnownFor(trait: string) {
    toggleFromList(knownFor, trait, (next) => setTalentIdentity({ knownFor: next }));
  }

  function toggleAgreement(item: string) {
    toggleFromList(agreedCommunity, item, (next) => setTalentIdentity({ agreedCommunity: next }));
  }

  function finish() {
    if (identity) void submitTalentOnboarding(identity);
    completeOnboarding("talent");
    router.push("/app/talent");
  }

  return (
    <OnboardingShell step={step} total={TOTAL_STEPS} onBack={() => (step === 0 ? router.push("/app") : setStep(step - 1))}>
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Talent" title="Tell us about yourself." description="Nothing here is a job posting — just who's taking the pass." />
          <FormField label="Full name" value={name} onChange={(v) => setTalentIdentity({ name: v })} placeholder="e.g. Camille Aubert" />
          <FormField label="Mobile number" value={mobile} onChange={(v) => setTalentIdentity({ mobile: v })} placeholder="e.g. 07700 900123" type="tel" inputMode="tel" />
          <FormField label="Email address" value={email} onChange={(v) => setTalentIdentity({ email: v })} placeholder="e.g. camille@email.com" type="email" inputMode="email" />
          <FormField label="Home postcode" value={postcode} onChange={(v) => setTalentIdentity({ postcode: v })} placeholder="e.g. W1J 8HA" />
          <FormField label="Date of birth" value={dob} onChange={(v) => setTalentIdentity({ dob: v })} type="date" />
          <ContinueButton onClick={() => setStep(1)} />
        </div>
      )}

      {step === 1 && (
        <PhotoStep
          description="Venues see this before they book you. You can change it anytime from your profile."
          mono={mono}
          photo={photo}
          onPhoto={(p) => setTalentIdentity({ photo: p })}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Your role" title="What do you do?" description="Pick the category closest to what you do, then the position that fits." />
          <ChipField label="Category" options={TEAM_CATEGORIES} selected={category ? [category] : []} onToggle={setCategory} />
          {needsPosition && (
            <div key={category} className="animate-view-in flex flex-col gap-6">
              <ChipField label="Position" options={positionOptions} selected={position ? [position] : []} onToggle={setPosition} />
              <ChipField
                label="Skills"
                options={skillOptions}
                selected={skills}
                onToggle={(v) => toggleFromList(skills, v, (next) => setTalentIdentity({ skills: next }))}
              />
            </div>
          )}
          <ContinueButton onClick={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Experience" title="Where have you worked?" description="Your time in hospitality, and up to three recent kitchens or floors." />
          <ChipField label="Years in hospitality" options={YEARS_BANDS} selected={yearsBand ? [yearsBand] : []} onToggle={(v) => setTalentIdentity({ yearsBand: v })} />
          <EmployerRepeater label="Recent employers" value={employers} onChange={(next) => setTalentIdentity({ employers: next })} />
          <ContinueButton onClick={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Availability & pay" title="When, where and for what?" description="Venues only ever see what's open — you can change this anytime from your profile." />
          <SwitchField label="Available today?" value={availableToday} onChange={(v) => setTalentIdentity({ availableToday: v })} />
          <ChipField
            label="Preferred shifts"
            options={SHIFT_TYPES}
            selected={preferredShifts}
            onToggle={(v) => toggleFromList(preferredShifts, v, (next) => setTalentIdentity({ preferredShifts: next }))}
          />
          <ChipField label="Maximum travel" options={MAX_TRAVEL_OPTIONS} selected={maxTravel ? [maxTravel] : []} onToggle={(v) => setTalentIdentity({ maxTravel: v })} />
          <CheckboxGroup
            label="Preferred areas"
            options={LONDON_AREAS}
            selected={preferredAreas}
            onToggle={(v) => toggleFromList(preferredAreas, v, (next) => setTalentIdentity({ preferredAreas: next }))}
          />
          <ChipField label="Preferred hourly rate" options={HOURLY_RATE_OPTIONS} selected={preferredRate ? [preferredRate] : []} onToggle={(v) => setTalentIdentity({ preferredRate: v })} />
          <FormField
            label="Minimum same-day rate"
            value={minSameDayRate}
            onChange={(v) => setTalentIdentity({ minSameDayRate: v })}
            placeholder="e.g. 25"
            prefix="£"
            inputMode="decimal"
          />
          <ContinueButton onClick={() => setStep(5)} />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Verification" title="Prove you're good to work." description="Held privately and shown to venues only once you're booked." />
          <UploadRow label="Right to Work" value={rightToWork} onChange={(v) => setTalentIdentity({ rightToWork: v })} />
          <UploadRow label="Food Safety Certificate" value={foodSafetyCert} onChange={(v) => setTalentIdentity({ foodSafetyCert: v })} />
          <UploadRow label="CV" optional value={cv} onChange={(v) => setTalentIdentity({ cv: v })} />
          <ContinueButton onClick={() => setStep(6)} />
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="About you" title="Tell venues about yourself." description="A couple of lines — calm, specific, no fluff." />
          <TextareaField
            label="About you"
            value={bio}
            onChange={(v) => setTalentIdentity({ bio: v })}
            placeholder="e.g. Calm under pressure. Five years in Michelin kitchens. Happy on garnish, meat or pass."
            maxLength={250}
          />
          <ChipField label="What are you known for? Choose up to 3." options={knownForChoices} selected={knownFor} onToggle={toggleKnownFor} />
          <ContinueButton onClick={() => setStep(7)} />
        </div>
      )}

      {step === 7 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Community" title="Our community agreement." description="Every venue and every worker on Dyuknow agrees to the same standard." />
          <CheckboxGroup options={TEAM_AGREEMENTS} selected={agreedCommunity} onToggle={toggleAgreement} />
          <ContinueButton disabled={agreedCommunity.length < TEAM_AGREEMENTS.length} onClick={() => setStep(8)} />
        </div>
      )}

      {step === 8 && (
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
          <ContinueButton onClick={finish}>Enter Dyuknow</ContinueButton>
        </div>
      )}
    </OnboardingShell>
  );
}
