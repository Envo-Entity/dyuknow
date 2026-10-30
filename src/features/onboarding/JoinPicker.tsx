// join/index, "Who are you?": two large choices, venue or talent, each aware
// of a draft saved on this device. Log out stays in reach.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadJoinDraft, updateJoinDraft, useLive } from '@/data';
import type { JoinDraft, JoinSide } from '@/domain';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button, Headline, Icon, Text, Ticket, type IconName } from '@/ui';

import { clearKeptFiles } from './parts';

export function JoinPicker() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { userId, logout } = useLive();
  const [draft, setDraft] = useState<JoinDraft | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Re-read on focus, so coming back from a flow shows "Continue…".
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let alive = true;
      loadJoinDraft(userId).then((d) => alive && setDraft(d));
      return () => {
        alive = false;
      };
    }, [userId]),
  );

  const choose = (side: JoinSide) => {
    if (userId) void updateJoinDraft(userId, { side });
    setDraft((d) => (d ? { ...d, side } : d));
    router.push(side === 'venue' ? '/join/venue' : '/join/talent');
  };

  const rise = (delay: number) => (t.reduceMotion ? FadeIn.duration(t.motion.normal) : FadeInDown.duration(t.motion.slow).delay(delay));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.c.page }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + t.space.xxxl,
        paddingBottom: insets.bottom + t.space.lg,
        paddingHorizontal: gutter,
        gap: t.space.lg,
      }}
    >
      <Animated.View entering={rise(0)} style={{ gap: t.space.sm, alignItems: 'center', paddingHorizontal: t.space.lg, paddingBottom: t.space.md }}>
        <Text variant="largeTitle" center accessibilityRole="header">
          Who are you?
        </Text>
        <Text variant="callout" color="muted" center>
          Choose once. Your answers stay on this device until you submit.
        </Text>
      </Animated.View>

      <Animated.View entering={rise(90)}>
        <Choice
          eyebrow="Venue"
          icon="floor"
          heading={['Venue, looking ', { em: 'to hire' }]}
          body="A restaurant, hotel, bar or venue — set up your listing and book vetted, verified talent."
          label={draft?.venue ? 'Continue your venue profile' : 'Set up your venue'}
          sub={draft?.side === 'venue' && draft.venue ? 'Draft saved on this device' : undefined}
          onPress={() => choose('venue')}
        />
      </Animated.View>
      <Animated.View entering={rise(180)}>
        <Choice
          lit
          eyebrow="Talent"
          icon="person"
          heading={['Talent, looking ', { em: 'for work' }]}
          body="A chef, front of house, bar, events or management pro — build your profile and take shifts worth taking."
          label={draft?.talent ? 'Continue your profile' : 'Build your profile'}
          sub={draft?.side === 'talent' && draft.talent ? 'Draft saved on this device' : undefined}
          onPress={() => choose('talent')}
        />
      </Animated.View>

      <View style={{ flex: 1 }} />
      <Button
        label="Log out"
        variant="quiet"
        icon="logout"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          // Log out clears the drafts; the files they kept go with them.
          clearKeptFiles();
          await logout();
          setLeaving(false);
        }}
        style={{ alignSelf: 'center' }}
      />
    </ScrollView>
  );
}

function Choice({
  lit,
  eyebrow,
  icon,
  heading,
  body,
  label,
  sub,
  onPress,
}: {
  lit?: boolean;
  eyebrow: string;
  icon: IconName;
  heading: (string | { em: string })[];
  body: string;
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const spoken = heading.map((p) => (typeof p === 'string' ? p : p.em)).join('');
  return (
    <Ticket
      lit={lit}
      onPress={onPress}
      padding={t.space.xl}
      gap={t.space.md}
      accessibilityLabel={[spoken, body, label, sub].filter(Boolean).join('. ')}
      style={{ minHeight: Math.round(220 * Math.min(t.scale, 1.1)) }}
    >
      <View style={styles.head}>
        <Text variant="label" color={lit ? undefined : 'sageText'} style={{ textTransform: 'uppercase', opacity: lit ? 0.7 : 1 }}>
          {eyebrow}
        </Text>
        <Icon name={icon} size={20} />
      </View>
      <Headline parts={heading} variant="title" />
      <Text variant="subhead" color="muted" style={{ flexShrink: 1 }}>
        {body}
      </Text>
      <View style={{ flex: 1 }} />
      <View style={[styles.foot, { gap: t.space.md, paddingTop: t.space.sm }]}>
        <View style={{ flex: 1, gap: t.space.xxs }}>
          <Text variant="headline">{label}</Text>
          {sub ? (
            <Text variant="footnote" color="muted">
              {sub}
            </Text>
          ) : null}
        </View>
        <Icon name="forward" size={15} weight="semibold" />
      </View>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foot: { flexDirection: 'row', alignItems: 'center' },
});
