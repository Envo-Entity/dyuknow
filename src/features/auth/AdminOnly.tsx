import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLive } from '@/data';
import { useTheme } from '@/theme/useTheme';
import { Button, Headline, Screen, Text } from '@/ui';

/** A Dyuknow admin with no member row: the team area lives on the website (§10.2). */
export function AdminOnly() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useLive();
  return (
    <Screen gap="xxl" contentStyle={{ paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + t.space.lg }}>
      <Text variant="title2" accessibilityRole="header">
        Dyuknow
      </Text>
      <View style={{ gap: t.space.sm, marginTop: t.space.xxl }}>
        <Headline parts={['The Dyuknow team area is ', { em: 'on the web.' }]} />
      </View>
      <Button label="Log out" variant="secondary" size="large" icon="logout" fullWidth onPress={() => void logout()} />
    </Screen>
  );
}
