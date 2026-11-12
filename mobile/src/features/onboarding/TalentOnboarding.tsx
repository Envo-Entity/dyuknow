// join/talent: the talent sign-up, 9 steps (FEATURES §3). Step 8 is the pass
// and submits create_my_profile as soon as it opens.
import { useState } from 'react';
import { View } from 'react-native';

import { submitTalentSelfServe } from '@/data';
import {
  HOURLY_RATE_OPTIONS,
  KNOWN_FOR_LIMIT,
  LONDON_AREAS,
  MAX_TRAVEL_OPTIONS,
  SHIFT_ALERTS,
  SHIFT_TYPES,
  SKILL_GROUPS,
  TEAMS,
  TEAM_AGREEMENTS,
  TEAM_CATEGORIES,
  TEAM_NAMES,
  YEARS_BANDS,
  addCustomSkill,
  knownForOptions,
  londonToday,
  needsKitchenDocuments,
  resumeTalent,
  talentStepZeroReady,
  validateDatedAvailability,
  type ShiftAlert,
  type TalentIdentity,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { CheckRow, Chip, DateRow, Loading, Notice, PickerRow, Section, SwitchRow, TextRow, haptics } from '@/ui';

import { CompleteStep, useSubmitOnce } from './CompleteStep';
import { DatedAvailabilityField, EmployerRepeater, PhotoStep, UploadRows } from './fields';
import { AddRow, ChipField, CustomChips } from './parts';
import { StepFlow, useJoinDraft, type StepDef } from './StepFlow';

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TalentOnboarding() {
  const t = useTheme();
  const draft = useJoinDraft<TalentIdentity>('talent', resumeTalent, (identity, email) => ({ ...identity, email }));
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const submit = useSubmitOnce(
    () => submitTalentSelfServe(draft.userId ?? '', draft.identity!),
    () => draft.done(),
  );

  if (!draft.ready || !draft.identity) {
    return (
      <View style={{ flex: 1, backgroundColor: t.c.page, paddingTop: 120 }}>
        <Loading variant="rows" />
      </View>
    );
  }

  const id = draft.identity;
  const patch = draft.patch;
  const roleFrom = (positions: string[], category: string) => (positions.length ? positions.join(', ') : category);
  const knownForChoices = knownForOptions(id.category);
  const knownForFull = id.knownFor.length >= KNOWN_FOR_LIMIT;
  const customKnownFor = id.knownFor.filter((k) => !knownForChoices.includes(k));
  const toggleKnownFor = (trait: string) => {
    const on = id.knownFor.includes(trait);
    // Choose up to 3: a 4th tap does nothing.
    if (!on && knownForFull) {
      haptics.warn();
      return;
    }
    haptics.select();
    patch({ knownFor: toggle(id.knownFor, trait) });
  };

  const steps: StepDef[] = [
    {
      key: 'about',
      eyebrow: 'Talent',
      title: 'Tell us about yourself.',
      canContinue: talentStepZeroReady(id),
      reason: 'Add your name, mobile number and postcode to continue.',
      render: () => (
        <>
          <Section>
            <TextRow label="Full name" value={id.name} onChangeText={(v) => patch({ name: v })} placeholder="e.g. Camille Aubert" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="done" />
            <TextRow label="Mobile number" value={id.mobile} onChangeText={(v) => patch({ mobile: v })} placeholder="e.g. 07700 900123" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" returnKeyType="done" />
          </Section>
          <Section footer="This is the email you sign in with.">
            <TextRow label="Email address" value={id.email} onChangeText={() => {}} editable={false} returnKeyType="done" />
          </Section>
          <Section>
            <TextRow label="Home postcode" value={id.postcode} onChangeText={(v) => patch({ postcode: v })} placeholder="e.g. W1J 8HA" autoCapitalize="characters" autoComplete="postal-code" textContentType="postalCode" returnKeyType="done" />
            <DateRow label="Date of birth" value={id.dob || null} onChange={(v) => patch({ dob: v })} maximumDate={londonToday()} />
          </Section>
        </>
      ),
    },
    {
      key: 'photo',
      eyebrow: 'Photo',
      title: 'Add a photo.',
      description: 'Venues see this before they book you. You can change it anytime from your profile.',
      render: () => <PhotoStep photo={id.photo} name={id.name} onPhoto={(uri) => patch({ photo: uri })} />,
    },
    {
      key: 'role',
      eyebrow: 'Your role',
      title: 'What do you do?',
      description: 'Keep your main category, then choose every position and skill that fits across all five teams.',
      canContinue: id.positions.length > 0,
      reason: 'Choose at least one position to continue.',
      render: () => (
        <>
          <ChipField label="Category" options={TEAM_CATEGORIES} value={id.category} onChange={(v) => patch({ category: v, role: roleFrom(id.positions, v) })} />
          {TEAM_NAMES.map((team) => {
            const options: readonly string[] = TEAMS[team];
            return (
              <ChipField
                key={team}
                label={`${team} positions · choose all that apply`}
                options={options}
                multiple
                value={id.positions.filter((p) => options.includes(p))}
                onChange={(picked) => {
                  const positions = [...id.positions.filter((p) => !options.includes(p)), ...picked];
                  patch({ positions, role: roleFrom(positions, id.category) });
                }}
              />
            );
          })}
          {Object.entries(SKILL_GROUPS).map(([group, list]) => {
            const options: readonly string[] = list;
            return (
              <ChipField
                key={group}
                label={`${group} skills`}
                options={options}
                multiple
                value={id.skills.filter((s) => options.includes(s))}
                onChange={(picked) => {
                  // A skill in both groups (Events, Fine Dining…) is one answer.
                  const others = id.skills.filter((s) => !options.includes(s));
                  patch({ skills: [...new Set([...others, ...picked])] });
                }}
              />
            );
          })}
          <Section label="Your own skills · optional" footer="Add a specific skill in up to 80 characters.">
            <CustomChips values={id.customSkills} onRemove={(v) => patch({ customSkills: id.customSkills.filter((s) => s !== v) })} />
            <AddRow label="Add your own skill" maxLength={80} onAdd={(v) => patch({ customSkills: addCustomSkill(id.customSkills, v, id.skills) })} />
          </Section>
        </>
      ),
    },
    {
      key: 'experience',
      eyebrow: 'Experience',
      title: 'Where have you worked?',
      description: 'Your time in hospitality, and up to three recent kitchens or floors.',
      render: () => (
        <>
          <ChipField label="Years in hospitality" options={YEARS_BANDS} value={id.yearsBand} onChange={(v) => patch({ yearsBand: v })} />
          <EmployerRepeater value={id.employers} onChange={(employers) => patch({ employers })} />
        </>
      ),
    },
    {
      key: 'availability',
      eyebrow: 'Availability & pay',
      title: 'When, where and for what?',
      description: "Venues only ever see what's open — you can change this anytime from your profile.",
      onContinue: () => {
        const problem = validateDatedAvailability(id.datedAvailability);
        setAvailabilityError(problem);
        if (problem) haptics.warn();
        return !problem;
      },
      render: () => (
        <>
          <Section>
            <SwitchRow label="Available today?" value={id.availableToday} onValueChange={(v) => patch({ availableToday: v })} />
          </Section>
          <ChipField label="Preferred shifts" options={SHIFT_TYPES} multiple value={id.preferredShifts} onChange={(v) => patch({ preferredShifts: v })} />
          <ChipField label="Maximum travel" options={MAX_TRAVEL_OPTIONS} value={id.maxTravel} onChange={(v) => patch({ maxTravel: v })} />
          <Section label="Preferred areas">
            {LONDON_AREAS.map((area) => (
              <CheckRow key={area} title={area} checked={id.preferredAreas.includes(area)} onToggle={() => patch({ preferredAreas: toggle(id.preferredAreas, area) })} />
            ))}
          </Section>
          <ChipField label="Preferred hourly rate" options={HOURLY_RATE_OPTIONS} value={id.preferredRate} onChange={(v) => patch({ preferredRate: v })} />
          <Section>
            <TextRow stacked
              label="Minimum same-day rate"
              prefix="£"
              value={id.minSameDayRate.replace(/^£/, '')}
              onChangeText={(v) => patch({ minSameDayRate: v })}
              placeholder="e.g. 25"
              keyboardType="decimal-pad" returnKeyType="done"
            />
          </Section>
          <DatedAvailabilityField
            value={id.datedAvailability}
            onChange={(datedAvailability) => {
              setAvailabilityError(null);
              patch({ datedAvailability });
            }}
          />
          <Section>
            <PickerRow<ShiftAlert>
              label="Shift alerts"
              value={id.shiftAlerts ?? 'all'}
              options={SHIFT_ALERTS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => patch({ shiftAlerts: v })}
            />
          </Section>
          {availabilityError ? <Notice tone="danger" text={availabilityError} /> : null}
        </>
      ),
    },
    {
      key: 'verification',
      eyebrow: 'Verification',
      title: "Prove you're good to work.",
      description: 'Optional, and you can add them later. Venues see whether you’ve added each one, never the file.',
      render: () => (
        <UploadRows
          items={[
            { label: 'Right to Work (visa / passport)', optional: true, note: 'recommended', value: id.rightToWork, onChange: (f) => patch({ rightToWork: f }) },
            ...(needsKitchenDocuments(id.positions)
              ? [{ label: 'Food Safety Certificate', optional: true, value: id.foodSafetyCert, onChange: (f: TalentIdentity['foodSafetyCert']) => patch({ foodSafetyCert: f }) }]
              : []),
            { label: 'CV', optional: true, note: 'recommended', value: id.cv, onChange: (f) => patch({ cv: f }) },
          ]}
        />
      ),
    },
    {
      key: 'bio',
      eyebrow: 'About you',
      title: 'Tell venues about yourself.',
      description: 'A couple of lines — calm, specific, no fluff.',
      render: () => (
        <>
          <Section>
            <TextRow
              label="About you"
              multiline
              maxLength={250}
              value={id.bio}
              onChangeText={(v) => patch({ bio: v.slice(0, 250) })}
              placeholder="e.g. Calm under pressure. Five years in Michelin kitchens. Happy on garnish, meat or pass."
            />
          </Section>
          <Section label="What are you known for? Choose up to 3.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, padding: t.space.lg }}>
              {[...knownForChoices, ...customKnownFor].map((trait) => {
                const on = id.knownFor.includes(trait);
                return <Chip key={trait} label={trait} selected={on} dimmed={knownForFull && !on} onPress={() => toggleKnownFor(trait)} />;
              })}
            </View>
            <AddRow
              label="Add your own"
              disabled={knownForFull}
              onAdd={(v) => {
                if (id.knownFor.some((k) => k.toLowerCase() === v.toLowerCase()) || knownForFull) return;
                patch({ knownFor: [...id.knownFor, v] });
              }}
            />
          </Section>
        </>
      ),
    },
    {
      key: 'community',
      eyebrow: 'Community',
      title: 'Our community agreement.',
      description: 'Every venue and every worker on Dyuknow agrees to the same standard.',
      canContinue: TEAM_AGREEMENTS.every((a) => id.agreedCommunity.includes(a)),
      reason: 'Agree to all four to continue.',
      render: () => (
        <Section>
          {TEAM_AGREEMENTS.map((a) => (
            <CheckRow key={a} title={a} checked={id.agreedCommunity.includes(a)} onToggle={() => patch({ agreedCommunity: toggle(id.agreedCommunity, a) })} />
          ))}
        </Section>
      ),
    },
    {
      key: 'complete',
      onEnter: () => void submit.save(),
      action: submit.action,
      hideBack: submit.status !== 'error',
      render: () => (
        <CompleteStep
          kind="member"
          name={id.name.trim() || "You're in"}
          meta={id.positions.length ? id.positions.join(', ') : id.category}
          photo={id.photo}
          facts={[
            { label: 'Member since', value: 'Today' },
            ...(id.yearsBand ? [{ label: 'Experience', value: id.yearsBand }] : []),
            ...(id.availableToday ? [{ label: 'Available', value: 'Today' }] : []),
          ]}
          headline={['Welcome aboard ', { em: 'profile ready.' }]}
          body="You’re in. Add the days you’re free and venues can start booking you."
          status={submit.status}
          error={submit.error}
        />
      ),
    },
  ];

  return <StepFlow steps={steps} step={draft.step} onStep={draft.setStep} />;
}
