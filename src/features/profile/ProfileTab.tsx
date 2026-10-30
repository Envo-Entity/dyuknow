import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import { useLive } from '@/data';
import { contactLine, fullAddress, verifiedDocs, type Member } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { alpha, Badge, Button, Chip, ErrorState, Icon, Loading, Photo, Row, Screen, Section, Text, Ticket } from '@/ui';

import { usePhotoChange } from './PhotoChange';
import { pounds } from './format';

/** The Profile tab, both sides: the member pass, then the details and the way to Account. */
export function ProfileTab() {
  const t = useTheme();
  const { me, approved, reload, error, badges, logout } = useLive();
  const photo = usePhotoChange();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const header = (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <HeaderActions />
    </>
  );

  if (!me) {
    return (
      <Screen>
        {header}
        {error ? <ErrorState message={error} onRetry={reload} /> : <Loading count={2} />}
      </Screen>
    );
  }

  const talent = me.side === 'talent';
  const verified = verifiedDocs(me);
  const v = me.venue;
  const kind = v ? [...v.types, ...v.cuisines].join(' · ') : '';

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {header}

      {/* The member pass */}
      <Ticket padding={12} gap={12}>
        <View>
          <Photo uri={me.photo} name={me.name} radius={t.radius.md} />
          {photo.saving ? (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: t.radius.md,
                backgroundColor: alpha(t.c.card, 0.55),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessible
              accessibilityLabel="Saving photo"
            >
              <ActivityIndicator color={t.c.text} />
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: t.space.xs, paddingBottom: t.space.xs, gap: t.space.sm }}>
          <View style={{ gap: t.space.xxs }}>
            <Text variant="largeTitle" accessibilityRole="header">
              {me.name}
            </Text>
            {talent && me.roles.length ? (
              <Text variant="callout" color="muted">
                {me.roles.join(' · ')}
              </Text>
            ) : null}
          </View>
          {!approved ? <Badge label="Waiting for approval" icon="waiting" style={{ alignSelf: 'flex-start' }} /> : null}
          {verified.length ? <VerifiedLine docs={verified} /> : null}
        </View>
      </Ticket>

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

      <View style={{ gap: t.space.md }}>
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
        <Row icon="logout" title="Log out" chevron={false} onPress={() => void logout()} />
      </Section>

      {photo.modal}
    </Screen>
  );
}

function Info({ me }: { me: Member }) {
  if (me.side === 'talent') {
    return (
      <Section>
        <Row title="Postcode" value={me.postcode || 'Not set'} />
        <Row title="Minimum pay" value={me.minRate ? `${pounds(me.minRate)} per hour` : 'Not set'} valueTabular />
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
