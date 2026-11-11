import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Button } from './Button';
import { Notice } from './States';
import { Text } from './Text';
import { ToastHost } from './Toast';
import { alpha } from './tone';

export type PickedPhoto = { uri: string; width: number; height: number };

export type PhotoCropperProps = {
  /** Local image uri and its pixel size (from `pickPhoto`). */
  uri: string;
  width: number;
  height: number;
  onDone: (photo: PickedPhoto) => void;
  onCancel: () => void;
  /** width / height of the frame; default 4/5. */
  aspect?: number;
  /** Longest output width; default 1080 (→ 1080×1350 at 4:5). */
  maxWidth?: number;
  /** JPEG quality 0–1; default 0.9. */
  quality?: number;
  /** One short line above the frame. Default "Pinch and drag to frame". */
  hint?: string;
  style?: ViewStyle;
};

const MAX_ZOOM = 3;

/** 4:5 cover-fit cropper with pan + pinch (1–3×). Outputs a JPEG via expo-image-manipulator. */
export function PhotoCropper({ uri, width, height, onDone, onCancel, aspect = 4 / 5, maxWidth = 1080, quality = 0.9, hint = 'Pinch and drag to frame', style }: PhotoCropperProps) {
  const t = useTheme();
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Frame size: as wide as the gutter allows, capped by available height.
  let frameW = 0;
  let frameH = 0;
  if (area) {
    frameW = area.w;
    frameH = frameW / aspect;
    if (frameH > area.h) {
      frameH = area.h;
      frameW = frameH * aspect;
    }
  }
  // Base cover scale so the image fills the frame at zoom 1.
  const base = frameW > 0 ? Math.max(frameW / width, frameH / height) : 1;
  const dispW = width * base;
  const dispH = height * base;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const clampT = (v: number, s: number, disp: number, frame: number) => {
    'worklet';
    const limit = Math.max(0, (disp * s - frame) / 2);
    return Math.min(limit, Math.max(-limit, v));
  };

  const pan = usePanGesture({
    maxPointers: 2,
    onActivate: () => {
      'worklet';
      startX.value = tx.value;
      startY.value = ty.value;
    },
    onUpdate: (e) => {
      'worklet';
      tx.value = clampT(startX.value + e.translationX, scale.value, dispW, frameW);
      ty.value = clampT(startY.value + e.translationY, scale.value, dispH, frameH);
    },
    onDeactivate: () => {
      'worklet';
      tx.value = withSpring(clampT(tx.value, scale.value, dispW, frameW));
      ty.value = withSpring(clampT(ty.value, scale.value, dispH, frameH));
    },
  });

  // Pinch scales about the frame centre; the two-finger pan moves the image
  // at the same time, which keeps the photo under the fingers in practice.
  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      startScale.value = scale.value;
    },
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(MAX_ZOOM, Math.max(1, startScale.value * e.scale));
      scale.value = next;
      tx.value = clampT(tx.value, next, dispW, frameW);
      ty.value = clampT(ty.value, next, dispH, frameH);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const confirm = async () => {
    if (!frameW) return;
    setBusy(true);
    setError(null);
    try {
      const s = scale.value;
      const shownW = dispW * s;
      const shownH = dispH * s;
      const toSource = width / shownW;
      let originX = ((shownW - frameW) / 2 - tx.value) * toSource;
      let originY = ((shownH - frameH) / 2 - ty.value) * toSource;
      let cropW = frameW * toSource;
      let cropH = frameH * toSource;
      cropW = Math.min(width, Math.round(cropW));
      cropH = Math.min(height, Math.round(cropH));
      originX = Math.max(0, Math.min(width - cropW, Math.round(originX)));
      originY = Math.max(0, Math.min(height - cropH, Math.round(originY)));

      const ctx = ImageManipulator.manipulate(uri).crop({ originX, originY, width: cropW, height: cropH });
      if (cropW > maxWidth) ctx.resize({ width: maxWidth, height: Math.round(maxWidth / aspect) });
      const rendered = await ctx.renderAsync();
      const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
      onDone({ uri: out.uri, width: out.width, height: out.height });
    } catch {
      setError("Couldn't crop this photo. Try another one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[{ flex: 1, backgroundColor: t.c.page, paddingHorizontal: gutter, paddingVertical: t.space.lg, gap: t.space.lg }, style]}>
      <Text variant="subhead" color="muted" center>
        {hint}
      </Text>
      <View style={styles.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area && frameW > 0 ? (
          <GestureDetector gesture={gesture}>
            <View
              style={{ width: frameW, height: frameH, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: t.c.monoBg }}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Photo crop frame. Pinch and drag to adjust."
            >
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: dispW,
                    height: dispH,
                    left: (frameW - dispW) / 2,
                    top: (frameH - dispH) / 2,
                  },
                  imageStyle,
                ]}
              >
                <Image source={{ uri }} style={{ width: dispW, height: dispH }} contentFit="fill" />
              </Animated.View>
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { borderRadius: t.radius.lg, borderWidth: 1, borderColor: alpha(t.c.card, 0.55) }]}
              />
            </View>
          </GestureDetector>
        ) : null}
      </View>
      {error ? <Notice tone="danger" text={error} /> : null}
      <View style={[styles.buttons, { gap: t.space.sm }]}>
        <Button label="Cancel" variant="secondary" size="large" fullWidth style={{ flex: 1 }} onPress={onCancel} disabled={busy} />
        <Button label="Use photo" size="large" fullWidth style={{ flex: 1.4 }} onPress={confirm} loading={busy} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ PhotoCropModal */

export type PhotoCropModalProps = {
  /** The picked photo to crop; the modal shows while this is set (and `visible` isn't false). */
  photo: PickedPhoto | null;
  visible?: boolean;
  onDone: (photo: PickedPhoto) => void;
  onCancel: () => void;
  /** Default "Position your photo". */
  title?: string;
  aspect?: number;
  hint?: string;
  maxWidth?: number;
  quality?: number;
};

/**
 * `PhotoCropper` in a full-screen modal with its title, gestures and toasts
 * working on both platforms. Typical use: `pickPhoto()` → set `photo` → upload in `onDone`.
 */
export function PhotoCropModal({ photo, visible = true, onDone, onCancel, title = 'Position your photo', aspect, hint, maxWidth, quality }: PhotoCropModalProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const open = visible && !!photo;
  return (
    <Modal
      visible={open}
      presentationStyle="fullScreen"
      animationType={t.reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onCancel}
      statusBarTranslucent={Platform.OS === 'android'}
      navigationBarTranslucent={Platform.OS === 'android'}
    >
      {/* Gestures need their own root inside a Modal on Android. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.c.page }}>
        <View style={{ flex: 1, paddingTop: insets.top + t.space.lg, paddingBottom: insets.bottom }}>
          <Text variant="title" center accessibilityRole="header" style={{ paddingHorizontal: gutter }}>
            {title}
          </Text>
          {photo ? (
            <PhotoCropper
              uri={photo.uri}
              width={photo.width}
              height={photo.height}
              onDone={onDone}
              onCancel={onCancel}
              aspect={aspect}
              hint={hint}
              maxWidth={maxWidth}
              quality={quality}
            />
          ) : null}
        </View>
        <ToastHost />
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ pickPhoto */

export type PickPhotoResult = { status: 'picked'; photo: PickedPhoto } | { status: 'cancelled' } | { status: 'error'; error: string };

/**
 * Pick one photo from the library (or camera). No system editing (it's square on iOS);
 * crop with `PhotoCropper`. Returns a JPEG-compatible asset so HEIC works.
 */
export async function pickPhoto(source: 'library' | 'camera' = 'library'): Promise<PickPhotoResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return { status: 'error', error: 'Dyuknow can’t use your camera. Allow camera access in Settings.' };
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.92,
      exif: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
    const a = result.assets[0];
    if (!a.width || !a.height) return { status: 'error', error: 'That photo couldn’t be read. Try another one.' };
    return { status: 'picked', photo: { uri: a.uri, width: a.width, height: a.height } };
  } catch {
    return {
      status: 'error',
      error: source === 'camera' ? 'Couldn’t open the camera. Try again.' : 'Couldn’t open your photos. Allow photo access in Settings and try again.',
    };
  }
}

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row' },
});
