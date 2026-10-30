import type { ReactNode } from 'react';
import { ActivityIndicator, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { alpha } from './tone';
import { Photo } from './Photo';
import { Text } from './Text';
import { Ticket } from './Ticket';

export type PostcardProps = {
  /** Remote photo; null shows the monogram at the same 4:5 size. */
  uri?: string | null;
  /** Bundled photo (team tiles). */
  source?: number;
  name: string;
  /** One line under the name: positions · area, or venue types · area. */
  detail?: string;
  /** Badges and the verified line, under the name. */
  children?: ReactNode;
  /** Dims the photo with a spinner (a new photo is uploading). */
  saving?: boolean;
  style?: ViewStyle;
};

/**
 * Every profile's hero: a 4:5 photo inside a white card with the name and one
 * detail line beneath, like a postcard. Used for your own profile and for every
 * member you view, so they always look the same.
 */
export function Postcard({ uri, source, name, detail, children, saving, style }: PostcardProps) {
  const t = useTheme();
  return (
    <Ticket padding={12} gap={12} style={style}>
      <View>
        <Photo uri={uri} source={source} name={name} radius={t.radius.md} />
        {saving ? (
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
            accessibilityLabel="Saving photo">
            <ActivityIndicator color={t.c.text} />
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: t.space.xs, paddingBottom: t.space.xs, gap: t.space.sm }}>
        <View style={{ gap: t.space.xxs }}>
          <Text variant="largeTitle" accessibilityRole="header">
            {name}
          </Text>
          {detail ? (
            <Text variant="callout" color="muted">
              {detail}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </Ticket>
  );
}
