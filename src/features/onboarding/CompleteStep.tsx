// The last step of both flows: the member pass. It submits the moment it
// opens; the seal turns from a spinner to a tick (or a cross), and the one
// button reads Saving… / Try again / Enter Dyuknow.
import { useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useLive, type SelfServeResult } from '@/data';
import type { HeadlinePart } from '@/ui';
import { useTheme } from '@/theme/useTheme';
import { Headline, Notice, Pass, Text, haptics } from '@/ui';

import type { StepAction } from './parts';

type Status = 'pending' | 'success' | 'error';

/** Submit-on-open state for the pass step. */
export function useSubmitOnce(submit: () => Promise<SelfServeResult>, onSaved: () => void) {
  const { reload } = useLive();
  const [status, setStatus] = useState<Status>('pending');
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const busy = useRef(false);

  const save = async () => {
    // One submit at a time (the step opening twice, or a quick double tap).
    if (busy.current) return;
    busy.current = true;
    setStatus('pending');
    setError(null);
    const r = await submit();
    busy.current = false;
    if (r.ok) {
      onSaved();
      setStatus('success');
      haptics.commit();
    } else {
      setStatus('error');
      setError(r.message);
      haptics.warn();
    }
  };

  const action: StepAction =
    status === 'pending'
      ? { label: 'Saving…', loading: true, disabled: true }
      : status === 'error'
        ? { label: 'Try again', onPress: () => void save() }
        : {
            label: 'Enter Dyuknow',
            loading: entering,
            onPress: async () => {
              // The member row now exists: reloading moves the root guard into the app.
              setEntering(true);
              await reload();
              setEntering(false);
            },
          };

  return { status, error, save, action };
}

export function CompleteStep({
  kind,
  name,
  meta,
  photo,
  facts,
  headline,
  body,
  status,
  error,
}: {
  kind: 'member' | 'venue';
  name: string;
  meta?: string;
  photo: string | null;
  facts: { label: string; value: string }[];
  headline: HeadlinePart[];
  body: string;
  status: Status;
  error: string | null;
}) {
  const t = useTheme();
  const rise = (delay: number) => (t.reduceMotion ? FadeIn.duration(t.motion.normal) : FadeInDown.duration(t.motion.slow).delay(delay));
  return (
    <View style={{ gap: t.space.xxl, paddingTop: t.space.lg }}>
      <Animated.View entering={rise(0)}>
        <Pass kind={kind} name={name} role={meta || undefined} photo={photo} facts={facts} status={status} />
      </Animated.View>
      <Animated.View entering={rise(120)} style={{ gap: t.space.sm, paddingHorizontal: t.space.xs }}>
        <Headline parts={headline} variant="title" />
        <Text variant="callout" color="muted">
          {body}
        </Text>
      </Animated.View>
      {error ? <Notice tone="danger" text={error} /> : null}
    </View>
  );
}
