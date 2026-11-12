import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, View } from 'react-native';

import { saveDocument, useLive } from '@/data';
import { needsRightToWork, RIGHT_TO_WORK, type Member, type UploadedFile } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Button, haptics, pickPhoto, Text, useToast } from '@/ui';

const MIME_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const mimeOf = (name: string) => MIME_BY_EXT[name.split('.').pop()?.toLowerCase() ?? ''];

/** Asks for a photo or a file; resolves the chosen file, or null. */
function chooseFile(label: string): Promise<UploadedFile | null> {
  return new Promise((resolve, reject) => {
    const fromPhotos = async () => {
      const r = await pickPhoto('library');
      if (r.status === 'error') return reject(new Error(r.error));
      if (r.status !== 'picked') return resolve(null);
      const name = r.photo.uri.split('/').pop() || `${label}.jpg`;
      resolve({ name, uri: r.photo.uri, mimeType: mimeOf(name) ?? 'image/jpeg' });
    };
    const fromFiles = async () => {
      try {
        const r = await DocumentPicker.getDocumentAsync({
          type: ['image/jpeg', 'image/png', 'application/pdf'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (r.canceled || !r.assets?.length) return resolve(null);
        const a = r.assets[0];
        resolve({ name: a.name, uri: a.uri, mimeType: a.mimeType || mimeOf(a.name) || '', size: a.size });
      } catch {
        resolve(null);
      }
    };
    const options = ['Choose a photo', 'Choose a file', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: label, options, cancelButtonIndex: 2 }, (i) => {
        if (i === 0) void fromPhotos();
        else if (i === 1) void fromFiles();
        else resolve(null);
      });
    } else {
      Alert.alert(label, undefined, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Choose a photo', onPress: () => void fromPhotos() },
        { text: 'Choose a file', onPress: () => void fromFiles() },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

/** The document upload flow: choose a photo or file, then save it. `busy` is the label being saved. */
export function useDocUpload() {
  const { snapshot, userId, run } = useLive();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const upload = async (label: string) => {
    if (busy || !userId) return;
    let file: UploadedFile | null;
    try {
      file = await chooseFile(label);
    } catch (e) {
      toast.show((e as Error).message, { tone: 'error' });
      haptics.warn();
      return;
    }
    if (!file) return;
    setBusy(label);
    await run(`doc:${label}`, () => saveDocument(userId, snapshot?.docCodes[label], file), {
      success: `${label} added.`,
      args: { label, uri: file.uri },
    });
    setBusy(null);
  };
  return { upload, busy };
}

/** Talent without a right to work document: a gentle nudge on Profile and Account. */
export function RightToWorkNudge({ me }: { me: Member }) {
  const t = useTheme();
  const { snapshot } = useLive();
  const { upload, busy } = useDocUpload();
  if (!needsRightToWork(me, snapshot?.rejected)) return null;
  return (
    <View style={{ backgroundColor: t.c.sageSoft, borderRadius: t.radius.lg, padding: t.space.lg, gap: t.space.md }}>
      <Text variant="subhead" color="sageText">
        Add your right to work. Venues can see whether you’ve added it, and it gives you a better chance of being booked.
      </Text>
      <Button
        label="Upload"
        icon="upload"
        style={{ alignSelf: 'flex-start' }}
        loading={busy === RIGHT_TO_WORK}
        disabled={!!busy}
        accessibilityLabel="Upload your right to work"
        onPress={() => void upload(RIGHT_TO_WORK)}
      />
    </View>
  );
}
