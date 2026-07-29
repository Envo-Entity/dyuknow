"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { FormField } from "@/components/onboarding/FormField";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { ContinueButton } from "@/components/onboarding/ContinueButton";
import { ChipField } from "@/components/onboarding/ChipField";
import { CheckboxGroup } from "@/components/onboarding/CheckboxGroup";
import { SwitchField } from "@/components/onboarding/Switch";
import { TextareaField } from "@/components/onboarding/Textarea";
import { PhotoStep } from "@/components/onboarding/PhotoStep";
import {
  COVERS_BANDS,
  CUISINES,
  DRESS_CODES,
  ROLES_NEEDED,
  SHIFT_TYPES,
  TYPICAL_NOTICE,
  VENUE_AGREEMENTS,
  VENUE_KNOWN_FOR,
  VENUE_TYPES,
} from "@/lib/data";
import { useAppStore } from "@/lib/store";

const TOTAL_STEPS = 8;

export function VenueOnboarding() {
  const router = useRouter();
  const { data, completeOnboarding, setVenueIdentity } = useAppStore();
  const [step, setStep] = useState(0);

  const identity = data.venueIdentity;
  const name = identity?.name ?? "";
  const tradingName = identity?.tradingName ?? "";
  const registeredCompany = identity?.registeredCompany ?? "";
  const website = identity?.website ?? "";
  const instagram = identity?.instagram ?? "";
  const contactName = identity?.contactName ?? "";
  const contactPosition = identity?.contactPosition ?? "";
  const contactPhone = identity?.contactPhone ?? "";
  const contactEmail = identity?.contactEmail ?? "";
  const photo = identity?.photo ?? null;
  const venueType = identity?.venueType ?? [];
  const cuisine = identity?.cuisine ?? [];
  const covers = identity?.covers ?? "";
  const teamSize = identity?.teamSize ?? "";
  const needs = identity?.needs ?? [];
  const typicalShifts = identity?.typicalShifts ?? [];
  const typicalNotice = identity?.typicalNotice ?? [];
  const dressCode = identity?.dressCode ?? "";
  const uniformProvided = identity?.uniformProvided ?? null;
  const staffMeal = identity?.staffMeal ?? null;
  const rateChef = identity?.rateChef ?? "";
  const rateFoh = identity?.rateFoh ?? "";
  const bio = identity?.bio ?? "";
  const knownFor = identity?.knownFor ?? [];
  const agreedCommunity = identity?.agreedCommunity ?? [];
  const mono = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

  useEffect(() => {
    if (data.onboarded.venue) router.replace("/app/venue");
  }, [data.onboarded.venue, router]);

  if (data.onboarded.venue) return null;

  function toggleFromList(list: string[], value: string, onChange: (next: string[]) => void) {
    onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleKnownFor(trait: string) {
    toggleFromList(knownFor, trait, (next) => setVenueIdentity({ knownFor: next }));
  }

  function toggleAgreement(item: string) {
    toggleFromList(agreedCommunity, item, (next) => setVenueIdentity({ agreedCommunity: next }));
  }

  function finish() {
    completeOnboarding("venue");
    router.push("/app/venue");
  }

  return (
    <OnboardingShell step={step} total={TOTAL_STEPS} onBack={() => (step === 0 ? router.push("/app") : setStep(step - 1))}>
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Your venue" title="Tell us about your venue." description="What we're called, who to reach, and how to find us." />
          <FormField label="Business name" value={name} onChange={(v) => setVenueIdentity({ name: v })} placeholder="e.g. The Larkspur" />
          <FormField label="Trading name" value={tradingName} onChange={(v) => setVenueIdentity({ tradingName: v })} placeholder="e.g. Larkspur Mayfair" />
          <FormField label="Registered company (optional)" value={registeredCompany} onChange={(v) => setVenueIdentity({ registeredCompany: v })} placeholder="e.g. Larkspur Hospitality Ltd" />
          <FormField label="Website" value={website} onChange={(v) => setVenueIdentity({ website: v })} placeholder="e.g. thelarkspur.co.uk" />
          <FormField label="Instagram" value={instagram} onChange={(v) => setVenueIdentity({ instagram: v })} placeholder="e.g. @thelarkspur" />
          <FormField label="Contact person" value={contactName} onChange={(v) => setVenueIdentity({ contactName: v })} placeholder="e.g. Jonathan Reeve" />
          <FormField label="Position" value={contactPosition} onChange={(v) => setVenueIdentity({ contactPosition: v })} placeholder="e.g. General Manager" />
          <FormField label="Phone" value={contactPhone} onChange={(v) => setVenueIdentity({ contactPhone: v })} placeholder="e.g. 020 7946 0958" type="tel" inputMode="tel" />
          <FormField label="Email" value={contactEmail} onChange={(v) => setVenueIdentity({ contactEmail: v })} placeholder="e.g. jonathan@thelarkspur.co.uk" type="email" inputMode="email" />
          <ContinueButton onClick={() => setStep(1)} />
        </div>
      )}

      {step === 1 && (
        <PhotoStep
          description="Talent see this before they say yes to a pass. You can change it anytime."
          mono={mono}
          photo={photo}
          onPhoto={(p) => setVenueIdentity({ photo: p })}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Your venue" title="What kind of room is it?" description="Helps us match the right talent to your kitchen and floor." />
          <ChipField
            label="Venue type"
            options={VENUE_TYPES}
            selected={venueType}
            onToggle={(v) => toggleFromList(venueType, v, (next) => setVenueIdentity({ venueType: next }))}
          />
          <ChipField
            label="Cuisine"
            options={CUISINES}
            selected={cuisine}
            onToggle={(v) => toggleFromList(cuisine, v, (next) => setVenueIdentity({ cuisine: next }))}
          />
          <ChipField label="Number of covers" options={COVERS_BANDS} selected={covers ? [covers] : []} onToggle={(v) => setVenueIdentity({ covers: v })} />
          <FormField label="Average team size" value={teamSize} onChange={(v) => setVenueIdentity({ teamSize: v })} placeholder="e.g. 18" inputMode="numeric" />
          <ContinueButton onClick={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Staffing" title="What do you usually need covered?" description="We'll surface the right talent first. You can change this anytime." />
          <ChipField label="Roles you need" options={ROLES_NEEDED} selected={needs} onToggle={(v) => toggleFromList(needs, v, (next) => setVenueIdentity({ needs: next }))} />
          <ChipField
            label="Typical shifts"
            options={SHIFT_TYPES}
            selected={typicalShifts}
            onToggle={(v) => toggleFromList(typicalShifts, v, (next) => setVenueIdentity({ typicalShifts: next }))}
          />
          <ChipField
            label="Typical notice"
            options={TYPICAL_NOTICE}
            selected={typicalNotice}
            onToggle={(v) => toggleFromList(typicalNotice, v, (next) => setVenueIdentity({ typicalNotice: next }))}
          />
          <ContinueButton onClick={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Venue standards & pay" title="What's it like to work your floor?" description="Sets expectations before anyone takes the pass." />
          <ChipField label="Dress code" options={DRESS_CODES} selected={dressCode ? [dressCode] : []} onToggle={(v) => setVenueIdentity({ dressCode: v })} />
          <SwitchField label="Uniform provided?" value={!!uniformProvided} onChange={(v) => setVenueIdentity({ uniformProvided: v })} />
          <SwitchField label="Staff meal?" value={!!staffMeal} onChange={(v) => setVenueIdentity({ staffMeal: v })} />
          <FormField label="Typical hourly rate — Chef" value={rateChef} onChange={(v) => setVenueIdentity({ rateChef: v })} placeholder="e.g. 20" prefix="£" inputMode="decimal" />
          <FormField label="Typical hourly rate — FOH" value={rateFoh} onChange={(v) => setVenueIdentity({ rateFoh: v })} placeholder="e.g. 18" prefix="£" inputMode="decimal" />
          <ContinueButton onClick={() => setStep(5)} />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="About your venue" title="Tell talent about your venue." description="A couple of lines — what it's like to work your room." />
          <TextareaField
            label="About your venue"
            value={bio}
            onChange={(v) => setVenueIdentity({ bio: v })}
            placeholder="e.g. Independent neighbourhood restaurant serving seasonal British cooking. Fast paced but supportive team."
            maxLength={250}
          />
          <ChipField label="What's your venue known for? Choose up to 3." options={VENUE_KNOWN_FOR} selected={knownFor} onToggle={toggleKnownFor} />
          <ContinueButton onClick={() => setStep(6)} />
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Community promise" title="Our community promise." description="Every venue and every worker on Dyuknow agrees to the same standard." />
          <CheckboxGroup options={VENUE_AGREEMENTS} selected={agreedCommunity} onToggle={toggleAgreement} />
          <ContinueButton onClick={() => setStep(7)} />
        </div>
      )}

      {step === 7 && (
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
          <ContinueButton onClick={finish}>Enter Dyuknow</ContinueButton>
        </div>
      )}
    </OnboardingShell>
  );
}
