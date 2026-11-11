import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Icon, SelectSheet } from '@/ui';

type Choice = 'more' | 'close';

/**
 * The shift's "⋯" menu: Send to more people, and Cancel request / Remove job
 * post. A native menu on iOS. On Android a toolbar menu needs an image icon
 * and the app bundles none (no Material Symbols package), so the kit icon in
 * a toolbar view opens the same two choices in a SelectSheet, which closes on
 * a tap outside or Back (the cancel).
 */
export function ShiftMenu({ closeLabel, onSendMore, onClose }: { closeLabel: string; onSendMore: () => void; onClose: () => void }) {
  const { hit } = useTheme();
  const [open, setOpen] = useState(false);

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
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="More actions"
            style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="more" size={24} color="text" />
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <SelectSheet<Choice>
        visible={open}
        title="More actions"
        value={null}
        options={[
          { value: 'more', label: 'Send to more people' },
          { value: 'close', label: closeLabel },
        ]}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          setOpen(false);
          if (v === 'more') onSendMore();
          else onClose();
        }}
      />
    </>
  );
}
