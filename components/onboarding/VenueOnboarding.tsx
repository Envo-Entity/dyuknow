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
import { submitVenueOnboarding } from "@/lib/onboardingSubmit";
import type { VenueIdentity } from "@/lib/types";

const TOTAL_STEPS = 8;

interface VenueOnboardingProps {
  /** Overrides where the draft lives. Omit to use the shared AppData store (the consumer flow at /app/venue/onboarding). */
  identity?: VenueIdentity | null;
  onPatch?: (patch: Partial<VenueIdentity>) => void;
  /** Called instead of pushing to /app when back is pressed on step 0. */
  onBack0?: () => void;
  /** Called after the Supabase submit instead of completeOnboarding()+redirect into the mock app. Providing this also skips the "already onboarded" gate, since that flag belongs to the consumer flow, not an admin draft. */
  onDone?: () => void;
}

export function VenueOnboarding({ identity: identityProp, onPatch, onBack0, onDone }: VenueOnboardingProps = {}) {
  const router = useRouter();
  const { data, completeOnboarding, setVenueIdentity } = useAppStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAdmin = identityProp !== undefined;
  const identity = isAdmin ? identityProp : data.venueIdentity;
  const setVenueIdentityFn = onPatch ?? setVenueIdentity;
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
    if (!isAdmin && data.onboarded.venue) router.replace("/app/venue");
  }, [isAdmin, data.onboarded.venue, router]);

  if (!isAdmin && data.onboarded.venue) return null;

  function toggleFromList(list: string[], value: string, onChange: (next: string[]) => void) {
    onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleKnownFor(trait: string) {
    toggleFromList(knownFor, trait, (next) => setVenueIdentityFn({ knownFor: next }));
  }

  function toggleAgreement(item: string) {
    toggleFromList(agreedCommunity, item, (next) => setVenueIdentityFn({ agreedCommunity: next }));
  }

  async function finish() {
    setSubmitError(null);
    setSubmitting(true);
    const result = identity ? await submitVenueOnboarding(identity) : { ok: true as const };
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError("Couldn't save that — check your connection and try again.");
      return;
    }

    if (onDone) {
      onDone();
    } else {
      completeOnboarding("venue");
      router.push("/app/venue");
    }
  }

  return (
    <OnboardingShell
      step={step}
      total={TOTAL_STEPS}
      onBack={() => (step === 0 ? (onBack0 ? onBack0() : router.push("/app")) : setStep(step - 1))}
    >
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Your venue" title="Tell us about your venue." description="What we're called, who to reach, and how to find us." />
          <FormField label="Business name" value={name} onChange={(v) => setVenueIdentityFn({ name: v })} placeholder="e.g. The Larkspur" />
          <FormField label="Trading name" value={tradingName} onChange={(v) => setVenueIdentityFn({ tradingName: v })} placeholder="e.g. Larkspur Mayfair" />
          <FormField label="Registered company (optional)" value={registeredCompany} onChange={(v) => setVenueIdentityFn({ registeredCompany: v })} placeholder="e.g. Larkspur Hospitality Ltd" />
          <FormField label="Website" value={website} onChange={(v) => setVenueIdentityFn({ website: v })} placeholder="e.g. thelarkspur.co.uk" />
          <FormField label="Instagram" value={instagram} onChange={(v) => setVenueIdentityFn({ instagram: v })} placeholder="e.g. @thelarkspur" />
          <FormField label="Contact person" value={contactName} onChange={(v) => setVenueIdentityFn({ contactName: v })} placeholder="e.g. Jonathan Reeve" />
          <FormField label="Position" value={contactPosition} onChange={(v) => setVenueIdentityFn({ contactPosition: v })} placeholder="e.g. General Manager" />
          <FormField label="Phone" value={contactPhone} onChange={(v) => setVenueIdentityFn({ contactPhone: v })} placeholder="e.g. 020 7946 0958" type="tel" inputMode="tel" />
          <FormField label="Email" value={contactEmail} onChange={(v) => setVenueIdentityFn({ contactEmail: v })} placeholder="e.g. jonathan@thelarkspur.co.uk" type="email" inputMode="email" />
          <ContinueButton onClick={() => setStep(1)} />
        </div>
      )}

      {step === 1 && (
        <PhotoStep
          description="Talent see this before they say yes to a pass. You can change it anytime."
          mono={mono}
          photo={photo}
          onPhoto={(p) => setVenueIdentityFn({ photo: p })}
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
            onToggle={(v) => toggleFromList(venueType, v, (next) => setVenueIdentityFn({ venueType: next }))}
          />
          <ChipField
            label="Cuisine"
            options={CUISINES}
            selected={cuisine}
            onToggle={(v) => toggleFromList(cuisine, v, (next) => setVenueIdentityFn({ cuisine: next }))}
          />
          <ChipField label="Number of covers" options={COVERS_BANDS} selected={covers ? [covers] : []} onToggle={(v) => setVenueIdentityFn({ covers: v })} />
          <FormField label="Average team size" value={teamSize} onChange={(v) => setVenueIdentityFn({ teamSize: v })} placeholder="e.g. 18" inputMode="numeric" />
          <ContinueButton onClick={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Staffing" title="What do you usually need covered?" description="We'll surface the right talent first. You can change this anytime." />
          <ChipField label="Roles you need" options={ROLES_NEEDED} selected={needs} onToggle={(v) => toggleFromList(needs, v, (next) => setVenueIdentityFn({ needs: next }))} />
          <ChipField
            label="Typical shifts"
            options={SHIFT_TYPES}
            selected={typicalShifts}
            onToggle={(v) => toggleFromList(typicalShifts, v, (next) => setVenueIdentityFn({ typicalShifts: next }))}
          />
          <ChipField
            label="Typical notice"
            options={TYPICAL_NOTICE}
            selected={typicalNotice}
            onToggle={(v) => toggleFromList(typicalNotice, v, (next) => setVenueIdentityFn({ typicalNotice: next }))}
          />
          <ContinueButton onClick={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="Venue standards & pay" title="What's it like to work your floor?" description="Sets expectations before anyone takes the pass." />
          <ChipField label="Dress code" options={DRESS_CODES} selected={dressCode ? [dressCode] : []} onToggle={(v) => setVenueIdentityFn({ dressCode: v })} />
          <SwitchField label="Uniform provided?" value={!!uniformProvided} onChange={(v) => setVenueIdentityFn({ uniformProvided: v })} />
          <SwitchField label="Staff meal?" value={!!staffMeal} onChange={(v) => setVenueIdentityFn({ staffMeal: v })} />
          <FormField label="Typical hourly rate — Chef" value={rateChef} onChange={(v) => setVenueIdentityFn({ rateChef: v })} placeholder="e.g. 20" prefix="£" inputMode="decimal" />
          <FormField label="Typical hourly rate — FOH" value={rateFoh} onChange={(v) => setVenueIdentityFn({ rateFoh: v })} placeholder="e.g. 18" prefix="£" inputMode="decimal" />
          <ContinueButton onClick={() => setStep(5)} />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-6">
          <StepHeader eyebrow="About your venue" title="Tell talent about your venue." description="A couple of lines — what it's like to work your room." />
          <TextareaField
            label="About your venue"
            value={bio}
            onChange={(v) => setVenueIdentityFn({ bio: v })}
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
        <div className="flex flex-col items-center gap-6 text-center lg:gap-7">
          <Avatar mono={mono} photoUrl={photo} size={64} tone="dark" />
          <div>
            <Eyebrow className="justify-center">You&rsquo;re in</Eyebrow>
            <div className="mt-2 font-serif text-[34px] leading-[1.05] tracking-[-0.01em] lg:text-[44px]">{name || "Your venue"}</div>
            {bio && <div className="mt-1.5 text-[13px] text-muted lg:text-[14px]">{bio}</div>}
          </div>
          <div className="flex w-full items-center gap-2 rounded-full bg-mist px-5 py-3 text-[13px] font-semibold text-ink lg:py-3.5 lg:text-[14px]">
            <span className="dot-pulse inline-block h-2.5 w-2.5 flex-none rounded-full bg-sage" />
            The pass is open · Fri 12 – Sun 14 Sep
          </div>
          <p className="max-w-[360px] text-[14.5px] leading-[1.6] text-ink-soft lg:max-w-[420px] lg:text-[16px]">
            We&rsquo;ve already lined up matches for the weekend your head chef is away. See who&rsquo;s available now.
          </p>
          {submitError && <p className="text-[13px] font-semibold text-ink lg:text-[14px]">{submitError}</p>}
          <ContinueButton onClick={finish} disabled={submitting}>
            {submitting ? "Submitting…" : "Enter Dyuknow"}
          </ContinueButton>
        </div>
      )}
    </OnboardingShell>
  );
}
