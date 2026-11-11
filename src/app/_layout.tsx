import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic, useFonts } from '@expo-google-fonts/instrument-serif';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AdminProvider } from '@/data/adminStore';
import { LiveProvider, useLive } from '@/data/store';
import { fonts } from '@/theme/tokens';
import { ThemeProvider, useTheme } from '@/theme/useTheme';
import { haptics, ToastProvider, useToast } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <Live>
            <Navigator />
          </Live>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** The data layer reports through the kit's toast and haptics. */
function Live({ children }: { children: ReactNode }) {
  const toast = useToast();
  return (
    <LiveProvider notify={(text, tone) => toast.show(text, { tone })} haptic={{ commit: haptics.commit, warn: haptics.warn }}>
      {children}
    </LiveProvider>
  );
}

function Navigator() {
  const { c, scheme } = useTheme();
  const live = useLive();
  const ready = live.status === 'ready';

  useEffect(() => {
    if (live.status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [live.status]);

  const nav = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...nav,
    colors: { ...nav.colors, background: c.page, card: c.page, text: c.text, primary: c.ink, border: c.border },
  };

  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    headerShown: false,
    contentStyle: { backgroundColor: c.page },
  };

  return (
    <AdminProvider enabled={live.isAdmin}>
      <NavThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: c.page },
            headerTintColor: c.ink,
            headerTitleStyle: { fontFamily: fonts.sans, fontWeight: '600', color: c.text },
            contentStyle: { backgroundColor: c.page },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />

          <Stack.Protected guard={live.status === 'signed-out'}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={live.status === 'no-member'}>
            <Stack.Screen name="join" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* Dyuknow admins: with no member row they open here; members who are admins push it from Profile or Account. */}
          <Stack.Protected guard={live.isAdmin}>
            <Stack.Screen name="admin/index" options={{ title: '' }} />
            <Stack.Screen name="admin/member/[id]" options={{ title: '' }} />
            <Stack.Screen name="admin/reject-document" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
          </Stack.Protected>

          <Stack.Protected guard={ready && live.side === 'talent'}>
            <Stack.Screen name="t" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={ready && live.side === 'venue'}>
            <Stack.Screen name="v" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={ready}>
            <Stack.Screen name="shift/[id]" options={{ title: '' }} />
            <Stack.Screen name="booking/[id]" options={{ title: '' }} />
            <Stack.Screen name="chat/[id]" options={{ title: '' }} />
            <Stack.Screen name="talent/[id]" options={{ title: '' }} />
            <Stack.Screen name="venue/[id]" options={{ title: '' }} />
            <Stack.Screen name="team/[team]" options={{ title: '' }} />
            <Stack.Screen name="compose" options={{ title: '' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="account" options={{ title: 'Account' }} />
            <Stack.Screen name="profile-edit" options={{ title: 'Edit profile', presentation: 'modal' }} />

            <Stack.Screen name="sheet/which-days" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            <Stack.Screen name="sheet/book-confirm" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            <Stack.Screen name="sheet/cancel-days" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            <Stack.Screen name="sheet/confirm-hours" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            <Stack.Screen name="sheet/close-shift" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            <Stack.Screen name="sheet/send-more" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
          </Stack.Protected>

          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="kit" options={{ title: 'Kit' }} />
          </Stack.Protected>
        </Stack>
      </NavThemeProvider>
    </AdminProvider>
  );
}
