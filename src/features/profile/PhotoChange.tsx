import { useState } from 'react';

import { setMyPhoto, useLive } from '@/data';
import { haptics, PhotoCropModal, pickPhoto, useToast, type PickedPhoto } from '@/ui';

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
    await run('photo', () => setMyPhoto(userId, photo.uri, 'image/jpeg'), { success: 'Photo saved.', args: photo.uri });
    setSaving(false);
  };

  const modal = (
    <PhotoCropModal
      photo={picked}
      hint="Drag to move it. This is how it will look everywhere on Dyuknow."
      quality={0.92}
      onCancel={() => setPicked(null)}
      onDone={(p) => void save(p)}
    />
  );
  return { start, saving, modal };
}
