import { Stack } from 'expo-router';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * The stack inside each tab. Tab roots get a large serif title that
 * collapses on scroll; the title itself is set by each screen.
 */
export function TabStack() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: false,
        // Tab roots show their serif title in the content (Screen title), so the bar stays clear.
        headerTitle: '',
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.page },
        headerLargeTitleStyle: { color: c.text },
        headerTitleStyle: { fontFamily: fonts.sans, fontWeight: '600', color: c.text },
        headerTintColor: c.ink,
        contentStyle: { backgroundColor: c.page },
      }}
    />
  );
}
