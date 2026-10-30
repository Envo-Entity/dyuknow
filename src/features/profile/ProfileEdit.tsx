import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { LiveGate, profileChanges, updateMyProfile, useLive } from '@/data';
import { CUISINES, SKILL_GROUPS, TEAM_NAMES, TEAMS, VENUE_TYPES, type Member, type VenueDetails } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Button, ChipGroup, haptics, Screen, Section, StickyAction, Text, TextRow, useToast } from '@/ui';

/** Edit profile: a modal of Settings-style rows; Save sends only what changed (§4 Profile, edit mode). */
export function ProfileEdit() {
  return (
    <LiveGate approval={false} loading={{ variant: 'rows', count: 4 }}>
      {({ me }) => <EditForm me={me} />}
    </LiveGate>
  );
}

const BIO_MAX = 250;
const asOptions = (list: readonly string[]) => list.map((value) => ({ value, label: value }));

function EditForm({ me }: { me: Member }) {
  const { run } = useLive();
  const toast = useToast();
  const talent = me.side === 'talent';

  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [postcode, setPostcode] = useState(me.postcode);
  const [phone, setPhone] = useState(me.phone);
  const [roles, setRoles] = useState(me.roles);
  const [skills, setSkills] = useState(me.skills);
  const [minRate, setMinRate] = useState(me.minRate != null ? String(me.minRate) : '');
  const [venue, setVenueState] = useState<VenueDetails | undefined>(me.venue);
  const [saving, setSaving] = useState(false);
  const setVenue = (patch: Partial<VenueDetails>) => setVenueState((v) => (v ? { ...v, ...patch } : v));

  // Empty clears minimum pay; otherwise a number, at least 0.
  const rateText = minRate.trim().replace(',', '.');
  const rate = rateText ? Number(rateText) : undefined;
  const rateBad = rate !== undefined && (!Number.isFinite(rate) || rate < 0);

  const patch: Partial<Member> = talent
    ? { name, bio, postcode, phone, roles, skills, minRate: rateBad ? me.minRate : rate }
    : { name, bio, postcode, phone, venue };
  const changes = profileChanges(me, patch);
  const dirty = Object.keys(changes).length > 0;

  const refuse = (text: string) => {
    toast.show(text, { tone: 'error' });
    haptics.warn();
  };
  const save = async () => {
    if (saving) return;
    if (!name.trim()) return refuse('Add a name.');
    if (!postcode.trim()) return refuse('Add a postcode.');
    if (talent && !roles.length) return refuse('Choose at least one position.');
    if (rateBad) return refuse('Check your answers and try again.');
    if (!dirty) return router.back();
    setSaving(true);
    const done = await run('profile', () => updateMyProfile(changes), { success: 'Profile saved.', args: changes });
    setSaving(false);
    if (done !== undefined) router.back();
  };
  const cancel = () => router.back();

  return (
    <>
      <Stack.Screen options={{ title: 'Edit profile', gestureEnabled: !dirty, ...androidHeader(cancel) }} />
      {process.env.EXPO_OS === 'ios' ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button onPress={cancel} accessibilityLabel="Cancel">
            Cancel
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}

      <Screen
        gap="xxl"
        footer={
          <StickyAction
            primary={{ label: 'Save profile', accessibilityLabel: 'Save profile', onPress: () => void save(), loading: saving, disabled: saving }}
            secondary={{ label: 'Cancel', onPress: cancel, disabled: saving }}
          />
        }
      >
        <Section>
          <TextRow
            label={talent ? 'Name' : 'Venue name'}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType={talent ? 'name' : 'organizationName'}
            autoComplete={talent ? 'name' : 'off'}
          />
          {!talent && venue ? (
            <TextRow
              label="Street address"
              value={venue.address}
              onChangeText={(address) => setVenue({ address })}
              autoCapitalize="words"
              textContentType="streetAddressLine1"
              autoComplete="street-address"
            />
          ) : null}
          <TextRow
            label={talent ? 'Home postcode' : 'Postcode'}
            value={postcode}
            onChangeText={setPostcode}
            autoCapitalize="characters"
            autoCorrect={false}
            textContentType="postalCode"
            autoComplete="postal-code"
          />
        </Section>

        <Section>
          {/* The count lives in the label, as the spec words it ("Bio · 12/250"). */}
          <TextRow
            label={`Bio · ${bio.length}/${BIO_MAX}`}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
            multiline
            placeholder={talent ? 'e.g. 8 years on grill. Ex-Core by Clare Smyth. Calm on a busy pass.' : 'What it’s like to work here.'}
          />
        </Section>

        <Section footer={talent ? 'Only shared with a venue that books you.' : 'Only shared with talent you book.'}>
          <TextRow
            label={talent ? 'Mobile number' : 'On-site phone'}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
        </Section>

        {talent ? (
          <>
            <Section label="Positions">
              {TEAM_NAMES.map((team) => (
                <ChipBlock key={team} title={team}>
                  <ChipGroup multiple options={asOptions(TEAMS[team])} value={roles} onChange={setRoles} accessibilityLabel={`${team} positions`} />
                </ChipBlock>
              ))}
            </Section>
            <Section label="Skills">
              {Object.entries(SKILL_GROUPS).map(([group, list]) => (
                <ChipBlock key={group} title={group}>
                  <ChipGroup multiple options={asOptions(list)} value={skills} onChange={setSkills} accessibilityLabel={`${group} skills`} />
                </ChipBlock>
              ))}
            </Section>
            <Section>
              <TextRow
                stacked
                label="Minimum pay · £ per hour"
                prefix="£"
                value={minRate}
                onChangeText={setMinRate}
                placeholder="Not set"
                keyboardType="decimal-pad"
                error={rateBad ? 'Check your answers and try again.' : null}
              />
            </Section>
          </>
        ) : venue ? (
          <>
            <Section>
              <TextRow label="On-site contact name" value={venue.contactName} onChangeText={(contactName) => setVenue({ contactName })} autoCapitalize="words" />
              <TextRow label="Their role" value={venue.contactRole} onChangeText={(contactRole) => setVenue({ contactRole })} autoCapitalize="words" />
            </Section>
            <Section label="Venue type">
              <ChipBlock>
                <ChipGroup multiple options={asOptions(VENUE_TYPES)} value={venue.types} onChange={(types) => setVenue({ types })} accessibilityLabel="Venue type" />
              </ChipBlock>
            </Section>
            <Section label="Cuisine">
              <ChipBlock>
                <ChipGroup multiple options={asOptions(CUISINES)} value={venue.cuisines} onChange={(cuisines) => setVenue({ cuisines })} accessibilityLabel="Cuisine" />
              </ChipBlock>
            </Section>
            <Section>
              <TextRow
                label="Instagram"
                value={venue.instagram}
                onChangeText={(instagram) => setVenue({ instagram })}
                placeholder="@yourvenue"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Section>
          </>
        ) : null}
      </Screen>
    </>
  );
}

/** Android has no header toolbar text buttons: Cancel as a header view. */
function androidHeader(cancel: () => void) {
  if (process.env.EXPO_OS === 'ios') return {};
  return { headerLeft: () => <Button label="Cancel" variant="quiet" onPress={cancel} /> };
}

/** A padded block of chips inside a Section, with an optional sub-heading. */
function ChipBlock({ title, children }: { title?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ padding: t.space.lg, gap: t.space.sm }}>
      {title ? (
        <Text variant="subhead" color="muted" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
