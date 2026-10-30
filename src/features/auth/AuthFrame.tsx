import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { Headline, Notice, Screen, Text, TextLink, type HeadlinePart } from '@/ui';

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

/** "New here? Create an account": a muted lead-in, then a text link. */
export function AuthLink({ lead, label, onPress }: { lead?: string; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: t.space.xs, minHeight: t.hit }}>
      {lead ? (
        <Text variant="callout" color="muted">
          {lead}
        </Text>
      ) : null}
      <TextLink label={label} onPress={onPress} />
    </View>
  );
}

/** Under the code: "Use a different email", then the timer or "Send a new code". */
export function ResendRow({
  seconds,
  sending,
  onResend,
  onDifferentEmail,
}: {
  seconds: number;
  sending: boolean;
  onResend: () => void;
  onDifferentEmail: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: t.space.md }}>
      <TextLink label="Use a different email" onPress={onDifferentEmail} center />
      {seconds > 0 ? (
        <View style={{ minHeight: t.hit, justifyContent: 'center' }} accessible accessibilityLabel={`New code in ${seconds} seconds`}>
          <Text variant="callout" color="muted" tabular>
            {`New code in ${seconds}s`}
          </Text>
        </View>
      ) : (
        <View style={{ minHeight: t.hit, justifyContent: 'center' }}>
          <TextLink label="Send a new code" onPress={onResend} disabled={sending} center />
        </View>
      )}
    </View>
  );
}
