import { useState } from 'react';
import { Modal, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setMyPhoto, useLive } from '@/data';
import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { haptics, PhotoCropper, pickPhoto, Text, useToast, type PickedPhoto } from '@/ui';

/**
 * Add or change the profile photo: pick, position it in the 4:5 frame,
 * then compress, upload, set_my_photo and remove the old file (§4, §1.11, §1.12).
 * `start()` opens the picker; render `modal` once in the screen.
 */
export function usePhotoChange() {
  const { run, userId } = useLive();
  const toast = useToast();
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [saving, setSaving] = useState(false);

  const start = async () => {
    if (saving) return;
    const r = await pickPhoto('library');
    if (r.status === 'error') {
      toast.show(r.error, { tone: 'error' });
      haptics.warn();
    } else if (r.status === 'picked') setPicked(r.photo);
  };

  const save = async (photo: PickedPhoto) => {
    setPicked(null);
    if (!userId) return;
    setSaving(true);
    await run('photo', () => setMyPhoto(userId, photo.uri, 'image/jpeg'), { success: 'Photo saved.' });
    setSaving(false);
  };

  const modal = <CropModal photo={picked} onCancel={() => setPicked(null)} onDone={save} />;
  return { start, saving, modal };
}

function CropModal({ photo, onCancel, onDone }: { photo: PickedPhoto | null; onCancel: () => void; onDone: (p: PickedPhoto) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!photo} presentationStyle="fullScreen" animationType="slide" onRequestClose={onCancel}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.c.page }}>
        <View style={{ flex: 1, paddingTop: insets.top + t.space.lg, paddingBottom: insets.bottom }}>
          <Text variant="title" accessibilityRole="header" style={{ paddingHorizontal: gutter }}>
            Position your photo
          </Text>
          {photo ? (
            <PhotoCropper
              uri={photo.uri}
              width={photo.width}
              height={photo.height}
              hint="Drag to move it. This is how it will look everywhere on Dyuknow."
              quality={0.92}
              onCancel={onCancel}
              onDone={onDone}
            />
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
