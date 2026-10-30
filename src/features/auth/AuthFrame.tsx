import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { Button, Headline, Notice, Screen, Text, type HeadlinePart } from '@/ui';

type Props = {
  eyebrow: string;
  title: HeadlinePart[];
  description?: string;
  /** Signed in and on the way into the app. */
  routing?: boolean;
  children: ReactNode;
};

/** One auth screen: wordmark, eyebrow, serif headline, then the form. */
export function AuthFrame({ eyebrow, title, description, routing, children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = (Platform.OS === 'ios' ? 0 : insets.top) + t.space.lg;

  if (routing) {
    return (
      <View
        style={{ flex: 1, backgroundColor: t.c.page, alignItems: 'center', justifyContent: 'center', gap: t.space.md }}
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={t.c.muted} />
        <Text variant="callout" color="muted">
          Signing you in…
        </Text>
      </View>
    );
  }

  return (
    <Screen gap="xxl" contentStyle={{ paddingTop: top }}>
      <Text variant="title2" accessibilityRole="header" accessibilityLabel="Dyuknow">
        Dyuknow
      </Text>
      <View style={{ gap: t.space.sm, marginTop: t.space.xxl }}>
        <Text variant="label" color="muted" style={{ textTransform: 'uppercase' }}>
          {eyebrow}
        </Text>
        <Headline parts={title} />
        {description ? (
          <Text variant="callout" color="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}

/** The form's error line; typing clears it. */
export function AuthError({ error }: { error: string | null }) {
  const t = useTheme();
  if (!error) return null;
  return (
    <Animated.View entering={FadeIn.duration(t.motion.fast)}>
      <Notice tone="danger" text={error} />
    </Animated.View>
  );
}

/** "New here? Create an account": a muted lead-in, then a quiet link button. */
export function AuthLink({ lead, label, onPress }: { lead?: string; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: t.space.xxs }}>
      {lead ? (
        <Text variant="callout" color="muted">
          {lead}
        </Text>
      ) : null}
      <Button label={label} variant="quiet" onPress={onPress} />
    </View>
  );
}
