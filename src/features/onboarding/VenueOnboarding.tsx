// join/venue: the venue sign-up, 8 steps (FEATURES §3). Step 7 is the pass
// and submits create_my_profile as soon as it opens.
import { View } from 'react-native';

import { submitVenueSelfServe } from '@/data';
import {
  COVERS_BANDS,
  CUISINES,
  DRESS_CODES,
  KNOWN_FOR_LIMIT,
  ROLES_NEEDED,
  SHIFT_TYPES,
  TEAM_NAMES,
  TYPICAL_NOTICE,
  VENUE_AGREEMENTS,
  VENUE_KNOWN_FOR,
  VENUE_TYPES,
  resumeVenue,
  teamsFromLegacyRoles,
  venueDisplayName,
  venueStepZeroMissing,
  type VenueIdentity,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { CheckRow, Loading, Section, SwitchRow, TextRow } from '@/ui';

import { CompleteStep, useSubmitOnce } from './CompleteStep';
import { PhotoStep } from './fields';
import { ChipField, Field } from './parts';
import { StepFlow, useJoinDraft, type StepDef } from './StepFlow';

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function VenueOnboarding() {
  const t = useTheme();
  const draft = useJoinDraft<VenueIdentity>('venue', resumeVenue);
  const submit = useSubmitOnce(
    () => submitVenueSelfServe(draft.userId ?? '', draft.identity!),
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
  const missing = venueStepZeroMissing(id);
  // With no answer yet, the teams start from the roles chosen (Chefs → Kitchen + Pastry…).
  const teamsNeeded = id.teamsNeeded?.length ? id.teamsNeeded : teamsFromLegacyRoles(id.needs);
  const name = venueDisplayName(id);

  const steps: StepDef[] = [
    {
      key: 'venue',
      eyebrow: 'Your venue',
      title: 'Tell us about your venue.',
      description: "What we're called, who to reach, and how to find us.",
      canContinue: !missing,
      reason: missing ? `Add ${missing} to continue.` : null,
      render: () => (
        <>
          <Section>
            <Field label="Business name" value={id.name} onChangeText={(v) => patch({ name: v })} placeholder="e.g. The Larkspur" autoCapitalize="words" autoComplete="organization" textContentType="organizationName" />
            <Field label="Trading name" value={id.tradingName} onChangeText={(v) => patch({ tradingName: v })} placeholder="e.g. Larkspur Mayfair" autoCapitalize="words" />
            <Field label="Registered company (optional)" value={id.registeredCompany} onChangeText={(v) => patch({ registeredCompany: v })} placeholder="e.g. Larkspur Hospitality Ltd" autoCapitalize="words" />
          </Section>
          <Section footer="Talent see your area before booking. The full address is shared once booked.">
            <Field label="Street address" value={id.address} onChangeText={(v) => patch({ address: v })} placeholder="e.g. 14 Church Road, Richmond, London" autoCapitalize="words" autoComplete="street-address" textContentType="fullStreetAddress" />
            <Field label="Venue postcode" value={id.postcode} onChangeText={(v) => patch({ postcode: v })} placeholder="e.g. TW9 1UA" autoCapitalize="characters" autoComplete="postal-code" textContentType="postalCode" />
          </Section>
          <Section>
            <TextRow label="Website" value={id.website} onChangeText={(v) => patch({ website: v })} placeholder="e.g. thelarkspur.co.uk" keyboardType="url" autoCapitalize="none" autoCorrect={false} returnKeyType="done" />
            <TextRow label="Instagram" value={id.instagram} onChangeText={(v) => patch({ instagram: v })} placeholder="e.g. @thelarkspur" autoCapitalize="none" autoCorrect={false} returnKeyType="done" />
          </Section>
          <Section>
            <Field label="Contact person" value={id.contactName} onChangeText={(v) => patch({ contactName: v })} placeholder="e.g. Jonathan Reeve" autoCapitalize="words" autoComplete="name" textContentType="name" />
            <TextRow label="Position" value={id.contactPosition} onChangeText={(v) => patch({ contactPosition: v })} placeholder="e.g. General Manager" autoCapitalize="words" returnKeyType="done" />
            <TextRow label="Phone" value={id.contactPhone} onChangeText={(v) => patch({ contactPhone: v })} placeholder="e.g. 020 7946 0958" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" returnKeyType="done" />
            <Field label="Email" value={id.contactEmail} onChangeText={(v) => patch({ contactEmail: v })} placeholder="e.g. jonathan@thelarkspur.co.uk" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
          </Section>
        </>
      ),
    },
    {
      key: 'photo',
      eyebrow: 'Photo',
      title: 'Add a photo.',
      description: 'Talent see this before they say yes to a pass. You can change it anytime.',
      render: () => <PhotoStep photo={id.photo} name={name || id.name} onPhoto={(uri) => patch({ photo: uri })} />,
    },
    {
      key: 'room',
      eyebrow: 'Your venue',
      title: 'What kind of room is it?',
      description: 'Helps us match the right talent to your kitchen and floor.',
      render: () => (
        <>
          <ChipField label="Venue type" options={VENUE_TYPES} multiple value={id.venueType} onChange={(v) => patch({ venueType: v })} />
          <ChipField label="Cuisine" options={CUISINES} multiple value={id.cuisine} onChange={(v) => patch({ cuisine: v })} />
          <ChipField label="Number of covers" options={COVERS_BANDS} value={id.covers} onChange={(v) => patch({ covers: v })} />
          <Section>
            <Field label="Average team size" value={id.teamSize} onChangeText={(v) => patch({ teamSize: v })} placeholder="e.g. 18" keyboardType="number-pad" />
            <Field label="Average team vacancies per week" value={id.teamVacanciesPerWeek} onChangeText={(v) => patch({ teamVacanciesPerWeek: v })} placeholder="e.g. 2" keyboardType="number-pad" />
          </Section>
        </>
      ),
    },
    {
      key: 'staffing',
      eyebrow: 'Staffing',
      title: 'What do you usually need covered?',
      description: "We'll surface the right talent first. You can change this anytime.",
      // Keep the teams shown, including the ones that came from the roles.
      onContinue: () => {
        if (!id.teamsNeeded?.length && teamsNeeded.length) patch({ teamsNeeded });
      },
      render: () => (
        <>
          <ChipField label="Roles you need" options={ROLES_NEEDED} multiple value={id.needs} onChange={(v) => patch({ needs: v })} />
          <ChipField label="Teams you need · choose all that apply" options={TEAM_NAMES} multiple value={teamsNeeded} onChange={(v) => patch({ teamsNeeded: v })} />
          <ChipField label="Typical shifts" options={SHIFT_TYPES} multiple value={id.typicalShifts} onChange={(v) => patch({ typicalShifts: v })} />
          <ChipField label="Typical notice" options={TYPICAL_NOTICE} multiple value={id.typicalNotice} onChange={(v) => patch({ typicalNotice: v })} />
        </>
      ),
    },
    {
      key: 'standards',
      eyebrow: 'Venue standards & pay',
      title: "What's it like to work your floor?",
      description: 'Sets expectations before anyone takes the pass.',
      render: () => (
        <>
          <ChipField label="Dress code" options={DRESS_CODES} value={id.dressCode} onChange={(v) => patch({ dressCode: v })} />
          <Section>
            <SwitchRow label="Uniform provided?" value={!!id.uniformProvided} onValueChange={(v) => patch({ uniformProvided: v })} />
            <SwitchRow label="Staff meal?" value={!!id.staffMeal} onValueChange={(v) => patch({ staffMeal: v })} />
          </Section>
          <Section>
            <Field label="Typical hourly rate — Chef" prefix="£" value={id.rateChef.replace(/^£/, '')} onChangeText={(v) => patch({ rateChef: v })} placeholder="e.g. 20" keyboardType="decimal-pad" />
            <Field label="Typical hourly rate — FOH" prefix="£" value={id.rateFoh.replace(/^£/, '')} onChangeText={(v) => patch({ rateFoh: v })} placeholder="e.g. 18" keyboardType="decimal-pad" />
          </Section>
        </>
      ),
    },
    {
      key: 'bio',
      eyebrow: 'About your venue',
      title: 'Tell talent about your venue.',
      description: "A couple of lines — what it's like to work your room.",
      render: () => (
        <>
          <Section>
            <TextRow
              label="About your venue"
              multiline
              maxLength={250}
              value={id.bio}
              onChangeText={(v) => patch({ bio: v.slice(0, 250) })}
              placeholder="e.g. Independent neighbourhood restaurant serving seasonal British cooking. Fast paced but supportive team."
            />
          </Section>
          <ChipField
            label="What's your venue known for? Choose up to 3."
            options={VENUE_KNOWN_FOR}
            multiple
            max={KNOWN_FOR_LIMIT}
            value={id.knownFor}
            onChange={(v) => patch({ knownFor: v })}
          />
        </>
      ),
    },
    {
      key: 'community',
      eyebrow: 'Community promise',
      title: 'Our community promise.',
      description: 'Every venue and every worker on Dyuknow agrees to the same standard.',
      canContinue: VENUE_AGREEMENTS.every((a) => id.agreedCommunity.includes(a)),
      reason: 'Agree to all four to continue.',
      render: () => (
        <Section>
          {VENUE_AGREEMENTS.map((a) => (
            <CheckRow
              key={a}
              title={a}
              checked={id.agreedCommunity.includes(a)}
              onToggle={() => patch({ agreedCommunity: toggle(id.agreedCommunity, a) })}
            />
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
          kind="venue"
          name={name || 'Your venue'}
          meta={id.venueType.join(' · ')}
          photo={id.photo}
          facts={[
            { label: 'Member since', value: 'Today' },
            ...(id.covers ? [{ label: 'Covers', value: id.covers }] : []),
            ...(id.teamSize ? [{ label: 'Team', value: id.teamSize }] : []),
          ]}
          headline={['Welcome aboard — ', { em: 'venue ready.' }]}
          body="Your venue is submitted for the owner to review. You can look around while you wait for approval."
          status={submit.status}
          error={submit.error}
        />
      ),
    },
  ];

  return <StepFlow steps={steps} step={draft.step} onStep={draft.setStep} />;
}
