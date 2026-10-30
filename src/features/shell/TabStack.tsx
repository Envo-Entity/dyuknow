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
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerTransparent: process.env.EXPO_OS === 'ios',
        headerBlurEffect: 'systemChromeMaterial',
        headerStyle: { backgroundColor: process.env.EXPO_OS === 'ios' ? undefined : c.page },
        headerLargeStyle: { backgroundColor: c.page },
        headerLargeTitleStyle: { fontFamily: fonts.serif, color: c.text },
        headerTitleStyle: { fontFamily: fonts.sans, fontWeight: '600', color: c.text },
        headerTintColor: c.ink,
        contentStyle: { backgroundColor: c.page },
      }}
    />
  );
}
