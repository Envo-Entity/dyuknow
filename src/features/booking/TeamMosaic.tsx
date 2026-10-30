// The team mosaic (web `TeamMosaic`): Book and Post a job both start by
// choosing a team. Teams this venue has asked for most come first; ties keep
// the catalogue order.
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FAMILIES, TEAM_NAMES, teamOf, teamPhoto, type Data, type Member } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Icon, Text } from '@/ui';

import { OnPhoto, Scrim } from './parts';

/** Approved talent who hold a position in this team. */
export function teamMembers(data: Data, team: string): Member[] {
  const roles = FAMILIES[team]?.roles ?? [];
  return data.members.filter((m) => m.side === 'talent' && m.approved && m.roles.some((r) => roles.includes(r)));
}

export function TeamMosaic({
  data,
  venue,
  caption,
  onPick,
}: {
  data: Data;
  venue: string;
  caption: (team: Member[]) => string;
  onPick: (team: string) => void;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const gap = t.space.md;
  const asked = (team: string) => data.shifts.filter((s) => s.venue === venue && teamOf(s.roles) === team).length;
  // Array sort is stable: ties keep the catalogue order.
  const teams = [...TEAM_NAMES].sort((a, b) => asked(b) - asked(a));
  const small = width > 0 ? (width - gap) / 2 : 0;

  return (
    <View style={[styles.grid, { gap }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0
        ? teams.map((name, i) => {
            const first = i === 0;
            const text = caption(teamMembers(data, name));
            return (
              <Pressable
                key={name}
                onPress={() => onPick(name)}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${text}`}
                style={({ pressed }) => ({
                  width: first ? width : small,
                  aspectRatio: 4 / 5,
                  borderRadius: first ? t.radius.card : t.radius.lg,
                  overflow: 'hidden',
                  backgroundColor: t.c.monoBg,
                  transform: [{ scale: pressed && !t.reduceMotion ? 0.98 : 1 }],
                })}
              >
                <Image source={teamPhoto(name)} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={t.reduceMotion ? 0 : t.motion.fast} />
                <Scrim />
                <OnPhoto>
                  <View style={[styles.caption, { padding: first ? t.space.xl : t.space.md, gap: t.space.xxs }]}>
                    <Text variant={first ? 'largeTitle' : 'title2'} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={[styles.row, { gap: t.space.xs }]}>
                      <Text variant={first ? 'callout' : 'footnote'} weight="600" tabular numberOfLines={1} style={{ flexShrink: 1 }}>
                        {text}
                      </Text>
                      <Icon name="forward" size={first ? 13 : 11} weight="bold" />
                    </View>
                  </View>
                </OnPhoto>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
