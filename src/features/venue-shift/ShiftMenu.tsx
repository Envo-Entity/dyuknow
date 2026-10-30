import { Stack } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon } from '@/ui';

/**
 * The shift's "⋯" menu: Send to more people, and Cancel request / Remove job
 * post. A native menu on iOS; Android toolbar icons must be images, so it
 * gets the kit icon in a view that opens the same two choices.
 */
export function ShiftMenu({ closeLabel, onSendMore, onClose }: { closeLabel: string; onSendMore: () => void; onClose: () => void }) {
  const { hit } = useTheme();
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More actions">
          <Stack.Toolbar.MenuAction icon="person.badge.plus" onPress={onSendMore}>
            Send to more people
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="xmark.circle" destructive onPress={onClose}>
            {closeLabel}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.View>
        <Pressable
          onPress={() =>
            Alert.alert('More actions', undefined, [
              { text: 'Send to more people', onPress: onSendMore },
              { text: closeLabel, style: 'destructive', onPress: onClose },
            ], { cancelable: true })
          }
          accessibilityRole="button"
          accessibilityLabel="More actions"
          style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" size={24} color="text" />
        </Pressable>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
}
