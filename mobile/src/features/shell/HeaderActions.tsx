import { router, Stack } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useLive } from '@/data/store';
import { useTheme } from '@/theme/useTheme';
import { Icon, Text } from '@/ui';

/**
 * The bell on every tab root: opens Notifications, shows the unread count.
 * iOS gets a native glass toolbar button; Android gets the same in a view.
 */
export function HeaderActions() {
  const { badges } = useLive();
  const { c, hit } = useTheme();
  const unread = badges.unreadNotifications;
  const count = unread > 9 ? '9+' : String(unread);
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  const open = () => router.push('/notifications');

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="bell" onPress={open} accessibilityLabel={label}>
          {unread > 0 ? <Stack.Toolbar.Badge>{count}</Stack.Toolbar.Badge> : null}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    );
  }

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.View>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={24} color="text" />
          {unread > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                paddingHorizontal: 4,
                backgroundColor: c.danger,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text variant="label" color="onInk" tabular>
                {count}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
}
