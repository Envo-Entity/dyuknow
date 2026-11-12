import { confirmLogout } from '@/features/shell/confirmLogout';
import { router, Stack } from 'expo-router';
import { Linking, View } from 'react-native';

import { LiveGate, useLive, useRefresh } from '@/data';
import { contactLine, fullAddress, money, verifiedDocs, type Member } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, Chip, Icon, Postcard, Row, Screen, Section, Text } from '@/ui';

import { RightToWorkNudge } from './docUpload';
import { usePhotoChange } from './PhotoChange';

const header = (
  <>
    <Stack.Screen options={{ title: 'Profile' }} />
    <HeaderActions />
  </>
);

/** The Profile tab, both sides: the member pass, then the details and the way to Account. */
export function ProfileTab() {
  // Allowed while waiting for approval (§4 Profile).
  return (
    <LiveGate approval={false} header={header} title="Profile" loading={{ count: 2 }}>
      {({ me }) => <ProfileView me={me} />}
    </LiveGate>
  );
}

function ProfileView({ me }: { me: Member }) {
  const t = useTheme();
  const { approved, badges, logout, isAdmin } = useLive();
  const refresh = useRefresh();
  const photo = usePhotoChange();

  const talent = me.side === 'talent';
  const verified = verifiedDocs(me);
  const v = me.venue;
  const kind = v ? [...v.types, ...v.cuisines].join(' · ') : '';

  return (
    <Screen title="Profile" {...refresh}>
      {header}

      {/* The member pass */}
      <Postcard uri={me.photo} name={me.name} detail={talent && me.roles.length ? me.roles.join(' · ') : undefined} saving={photo.saving}>
        {!approved ? <Badge label="Waiting for approval" icon="waiting" style={{ alignSelf: 'flex-start' }} /> : null}
        {verified.length ? <VerifiedLine docs={verified} /> : null}
      </Postcard>

      <RightToWorkNudge me={me} />

      <View style={{ flexDirection: 'row', gap: t.space.sm }}>
        <Button label="Edit profile" icon="edit" fullWidth style={{ flex: 1 }} onPress={() => router.push('/profile-edit')} />
        <Button
          label={me.photo ? 'Change photo' : 'Add a photo'}
          icon="camera"
          variant="secondary"
          fullWidth
          style={{ flex: 1 }}
          loading={photo.saving}
          disabled={photo.saving}
          onPress={() => void photo.start()}
        />
      </View>

      <View style={{ gap: t.space.lg }}>
        {me.bio ? (
          <Text variant="body">{me.bio}</Text>
        ) : (
          <Text variant="body" color="muted">
            No bio yet.
          </Text>
        )}
        {talent ? (
          me.skills.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
              {me.skills.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </View>
          ) : null
        ) : (
          <>
            {kind ? (
              <Text variant="callout" color="muted">
                {kind}
              </Text>
            ) : null}
            {v?.instagram ? (
              <Button
                label={v.instagram}
                icon="instagram"
                variant="quiet"
                style={{ alignSelf: 'flex-start' }}
                accessibilityHint="Opens Instagram"
                onPress={() => void Linking.openURL(`https://instagram.com/${v.instagram.replace(/^@/, '')}`).catch(() => {})}
              />
            ) : null}
          </>
        )}
      </View>

      <Info me={me} />

      <Section>
        <Row
          icon="eye"
          title={talent ? 'View as a venue' : 'View as talent'}
          onPress={() =>
            router.push(talent ? { pathname: '/talent/[id]', params: { id: me.id } } : { pathname: '/venue/[id]', params: { id: me.id } })
          }
        />
        <Row
          icon="settings"
          title="Account"
          accessibilityLabel={badges.accountAttention ? 'Account, needs attention' : 'Account'}
          trailing={badges.accountAttention ? <Icon name="dot" size={10} color="danger" /> : undefined}
          onPress={() => router.push('/account')}
        />
        {isAdmin ? <Row icon="people" title="Dyuknow admin" onPress={() => router.push('/admin')} /> : null}
        <Row icon="logout" title="Log out" chevron={false} onPress={() => confirmLogout(logout)} />
      </Section>

      {photo.modal}
    </Screen>
  );
}

function Info({ me }: { me: Member }) {
  if (me.side === 'talent') {
    return (
      <Section>
        <Row title="Postcode" value={me.postcode ? me.postcode.toUpperCase() : 'Not set'} />
        <Row title="Minimum pay" value={me.minRate ? `${money(me.minRate)} per hour` : 'Not set'} valueTabular />
      </Section>
    );
  }
  if (!me.venue) return null;
  return (
    <Section>
      <Row title="Address" subtitle={fullAddress(me) || undefined} />
      <Row title="On-site contact" subtitle={contactLine(me) || undefined} />
    </Section>
  );
}

/** A tick, then "Verified by Dyuknow · Right to work · Photo ID". */
export function VerifiedLine({ docs }: { docs: string[] }) {
  const t = useTheme();
  const text = `Verified by Dyuknow · ${docs.join(' · ')}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.xs + 2 }} accessible accessibilityLabel={text}>
      <Icon name="verified" size={15} color="sageDot" style={{ marginTop: 2 }} />
      <Text variant="subhead" color="sageText" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
