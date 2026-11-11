import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { KeyValue } from './KeyValue';
import { Avatar } from './Photo';
import { Text } from './Text';
import { LitContext } from './tone';

export type PassStatus = 'none' | 'pending' | 'success' | 'error';

export type PassProps = {
  kind: 'member' | 'venue';
  name: string;
  /** "Sous chef · Kitchen" or the venue's area. */
  role?: string;
  photo?: string | null;
  /** 2–3 facts. */
  facts?: { label: string; value: string; tabular?: boolean }[];
  /** Seal on the avatar: spinner, animated check, or x. */
  status?: PassStatus;
  style?: ViewStyle;
};

/** The member pass: onboarding's final card and the profile header. */
export function Pass({ kind, name, role, photo, facts = [], status = 'none', style }: PassProps) {
  const t = useTheme();
  const { c } = t;
  const seal = Math.round(26 * t.scale);
  const entering = t.reduceMotion
    ? FadeIn.duration(t.motion.normal)
    : ZoomIn.springify().damping(t.motion.spring.damping - 6).stiffness(t.motion.spring.stiffness);
  const statusWord = status === 'success' ? 'Verified' : status === 'pending' ? 'Checking' : status === 'error' ? 'Not verified' : undefined;

  return (
    <View
      style={[{ backgroundColor: c.sageSoft, borderRadius: t.radius.card, padding: t.space.xl, gap: t.space.lg }, style]}
      accessible
      accessibilityLabel={[kind === 'member' ? 'Dyuknow member' : 'Dyuknow venue', name, role, statusWord, ...facts.map((f) => `${f.label}, ${f.value}`)]
        .filter(Boolean)
        .join('. ')}
    >
      <LitContext.Provider value={false}>
        <View style={[styles.top, { gap: t.space.lg }]}>
          <View>
            <Avatar uri={photo} name={name} size={56} accessibilityLabel="" />
            {status !== 'none' ? (
              <Animated.View
                key={status}
                entering={entering}
                style={[
                  styles.seal,
                  {
                    width: seal,
                    height: seal,
                    borderRadius: seal / 2,
                    borderColor: c.sageSoft,
                    backgroundColor: status === 'success' ? c.sageDot : status === 'error' ? c.danger : c.card,
                  },
                ]}
              >
                {status === 'pending' ? (
                  <ActivityIndicator size="small" color={c.sageText} style={{ transform: [{ scale: 0.7 }] }} />
                ) : (
                  <Icon name={status === 'success' ? 'check' : 'close'} size={12} color="onInk" weight="bold" style={{ opacity: 1 }} />
                )}
              </Animated.View>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: t.space.xxs }}>
            <Text variant="label" color="sageText" style={{ textTransform: 'uppercase' }}>
              {kind === 'member' ? 'Dyuknow member' : 'Dyuknow venue'}
            </Text>
            <Text variant="title" numberOfLines={2}>
              {name}
            </Text>
            {role ? (
              <Text variant="subhead" color="muted" numberOfLines={1}>
                {role}
              </Text>
            ) : null}
          </View>
        </View>
        {facts.length ? (
          <View style={{ gap: t.space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.sage, paddingTop: t.space.md }}>
            {facts.map((f) => (
              <KeyValue key={f.label} label={f.label} value={f.value} tabular={f.tabular} />
            ))}
          </View>
        ) : null}
      </LitContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center' },
  seal: { position: 'absolute', right: -4, bottom: -4, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
