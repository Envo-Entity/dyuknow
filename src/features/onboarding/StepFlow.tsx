// The one step engine for both onboarding flows (talent 9 steps, venue 8).
// A flow hands over an array of step definitions; this file owns the chrome:
// back, progress, the step header, the slide between steps, the keyboard and
// the single Continue button with its reason underneath. `useJoinDraft`
// keeps the answers and the step reached on this device after every change.
import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadJoinDraft, updateJoinDraft, useLive } from '@/data';
import type { JoinDraft, JoinSide } from '@/domain';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/ui';

import { RoundButton, StepFooter, type StepAction } from './parts';

export type StepDef = {
  /** Stable key for the step (used for the slide). */
  key: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  render: () => ReactNode;
  /** Continue is disabled while false. Default true. */
  canContinue?: boolean;
  /** Shown under the disabled Continue button. */
  reason?: string | null;
  /** Runs on Continue; return false to stay on this step (e.g. a validation failed). */
  onContinue?: () => boolean | void;
  /** Runs each time the step opens (the last step submits here). */
  onEnter?: () => void;
  /** Replaces Continue (the last step's own button). */
  action?: StepAction;
  /** Hide Back on this step. Default false. */
  hideBack?: boolean;
};

export type StepFlowProps = {
  steps: StepDef[];
  step: number;
  onStep: (step: number) => void;
};

export function StepFlow({ steps, step, onStep }: StepFlowProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = steps[Math.min(step, steps.length - 1)];
  const last = step === steps.length - 1;
  // Which way the steps are moving, for the slide.
  const [forward, setForward] = useState(true);

  const go = (next: number) => {
    setForward(next > step);
    onStep(next);
  };
  const back = () => {
    if (step === 0) {
      // Step 0 goes back to "Who are you?" (FEATURES §10.3).
      if (router.canGoBack()) router.back();
      else router.replace('/join');
      return;
    }
    go(step - 1);
  };
  const next = () => {
    if (current.canContinue === false) return;
    if (current.onContinue?.() === false) return;
    if (step < steps.length - 1) go(step + 1);
  };

  // Each step's onEnter (the last one submits as soon as it opens).
  const enter = current.onEnter;
  useEffect(() => {
    enter?.();
    // Only when the step changes, not when the callback identity does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Android back walks the steps like the round back button.
  const canBack = !current.hideBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canBack) return true;
      if (step === 0) return false;
      go(step - 1);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canBack, step]);

  const entering = t.reduceMotion
    ? FadeIn.duration(t.motion.normal)
    : (forward ? FadeInRight : FadeInLeft).duration(t.motion.normal);
  // The leaving step only fades: it can't know which way the next one comes from.
  const exiting = FadeOut.duration(t.motion.fast);

  const primary: StepAction = current.action ?? {
    label: 'Continue',
    onPress: next,
    disabled: current.canContinue === false,
  };
  const reason = current.action ? null : current.canContinue === false ? current.reason : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.c.page }}>
      {/* The swipe back leaves onboarding, so it only works on the first step. */}
      <Stack.Screen options={{ gestureEnabled: step === 0 }} />
      <View style={[styles.top, { paddingTop: insets.top + t.space.sm, paddingHorizontal: gutter, paddingBottom: t.space.sm, gap: t.space.md }]}>
        <RoundButton icon="back" label={step === 0 ? 'Back to Who are you?' : 'Previous step'} onPress={back} hidden={!canBack} />
        <Progress count={steps.length} index={step} complete={last} />
        <View style={{ width: t.hit }} />
      </View>
      {/* The keyboard: iOS insets the scroll view and scrolls to the field; Android resizes the window. */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View key={current.key} entering={entering} exiting={exiting} style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: t.space.lg, paddingBottom: t.space.xxxl, gap: t.space.xxl }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              {current.eyebrow || current.title ? (
                <View style={{ gap: t.space.sm, paddingHorizontal: t.space.xs }}>
                  {current.eyebrow ? (
                    <Text variant="label" color="muted" style={{ textTransform: 'uppercase' }}>
                      {current.eyebrow}
                    </Text>
                  ) : null}
                  {current.title ? (
                    <Text variant="largeTitle" accessibilityRole="header">
                      {current.title}
                    </Text>
                  ) : null}
                  {current.description ? (
                    <Text variant="callout" color="muted">
                      {current.description}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {current.render()}
            </ScrollView>
          </Animated.View>
        </View>
        <StepFooter primary={primary} reason={reason} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ progress */

function Progress({ count, index, complete }: { count: number; index: number; complete: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[styles.dots, { gap: t.space.xs + 1 }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index && !complete} filled={complete || i <= index} />
      ))}
    </View>
  );
}

function Dot({ active, filled }: { active: boolean; filled: boolean }) {
  const t = useTheme();
  const short = Math.round(6 * t.scale);
  const long = Math.round(22 * t.scale);
  const width = useSharedValue(active ? long : short);
  useEffect(() => {
    width.value = withTiming(active ? long : short, { duration: t.reduceMotion ? 0 : t.motion.normal });
  }, [active, long, short, width, t.reduceMotion, t.motion.normal]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={[
        {
          height: Math.round(6 * t.scale),
          borderRadius: t.radius.pill,
          backgroundColor: filled ? (active ? t.c.sageDot : t.c.sage) : t.c.borderStrong,
        },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ draft */

type Saved<T> = { identity: T; step: number };

/**
 * Loads this login's join draft for one side, then saves every answer and
 * step change back to the device (capped so the submit step never resumes).
 * `done()` stops saving once the profile is submitted.
 */
export function useJoinDraft<T extends object>(
  side: JoinSide,
  resume: (draft: JoinDraft, email: string) => Saved<T>,
  fix?: (identity: T, email: string) => T,
) {
  const { userId, email = '' } = useLive();
  const [state, setState] = useState<{ identity: T; step: number } | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadJoinDraft(userId).then((draft) => {
      if (!alive) return;
      setState(resume(draft, email));
      if (draft.side !== side) void updateJoinDraft(userId, { side });
    });
    return () => {
      alive = false;
    };
    // The draft is read once per login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || !state || done.current) return;
    const patch: Partial<JoinDraft> = { side, [side]: { identity: state.identity, step: state.step } };
    void updateJoinDraft(userId, patch);
  }, [userId, side, state]);

  return {
    ready: !!state,
    userId,
    email,
    identity: state?.identity ?? null,
    step: state?.step ?? 0,
    setStep: (step: number) => setState((s) => (s ? { ...s, step } : s)),
    patch: (p: Partial<T>) =>
      setState((s) => {
        if (!s) return s;
        const identity = { ...s.identity, ...p };
        return { ...s, identity: fix ? fix(identity, email) : identity };
      }),
    done: () => {
      done.current = true;
    },
  };
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center' },
  dots: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
