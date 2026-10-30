import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInUp, SlideOutDown, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Text } from './Text';
import { alpha, LitContext } from './tone';

export type ToastTone = 'good' | 'error';
export type ToastOptions = { tone?: ToastTone; position?: 'top' | 'bottom'; duration?: number };
type ToastItem = { id: number; text: string; tone: ToastTone; position: 'top' | 'bottom'; duration: number };

type ToastApi = { show: (text: string, options?: ToastOptions) => void; hide: () => void };

/** Default time on screen per tone (FEATURES §10.9). */
export const TOAST_DURATION: Record<ToastTone, number> = { good: 3500, error: 6000 };

const ToastContext = createContext<ToastApi | null>(null);
type Layer = { toast: ToastItem | null; dismiss: () => void; hosts: string[]; addHost: (id: string) => void; removeHost: (id: string) => void };
const ToastLayerContext = createContext<Layer | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: (text) => console.warn(`[toast] ToastProvider missing: ${text}`),
      hide: () => {},
    };
  }
  return ctx;
}

/** Wrap the app once (inside ThemeProvider and SafeAreaProvider). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [hosts, setHosts] = useState<string[]>([]);
  const nextId = useRef(1);

  const [api] = useState<ToastApi>(() => ({
    show: (text, options) => {
      const tone = options?.tone ?? 'good';
      const item: ToastItem = {
        id: nextId.current++,
        text,
        tone,
        position: options?.position ?? 'top',
        duration: options?.duration ?? TOAST_DURATION[tone],
      };
      setToast(item);
      AccessibilityInfo.announceForAccessibility(text);
    },
    hide: () => setToast(null),
  }));

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.duration);
    return () => clearTimeout(id);
  }, [toast]);

  const [hostApi] = useState(() => ({
    dismiss: () => setToast(null),
    addHost: (id: string) => setHosts((h) => [...h.filter((x) => x !== id), id]),
    removeHost: (id: string) => setHosts((h) => h.filter((x) => x !== id)),
  }));
  const dismiss = hostApi.dismiss;
  const layer: Layer = { toast, hosts, ...hostApi };
  // iOS draws the toast in a window above everything, React Native Modals
  // included. Android has no such window: a mounted <ToastHost> (inside a
  // Modal) takes the toast over while it is open.
  const root = <ToastLayer toast={toast} onDismiss={dismiss} />;
  return (
    <ToastContext.Provider value={api}>
      <ToastLayerContext.Provider value={layer}>
        {children}
        {Platform.OS === 'ios' ? <FullWindowOverlay>{root}</FullWindowOverlay> : hosts.length === 0 ? root : null}
      </ToastLayerContext.Provider>
    </ToastContext.Provider>
  );
}

/**
 * Put one inside every React Native `<Modal>` (last child) so toasts still show
 * above it on Android. Renders nothing on iOS, where toasts already float above
 * modals. `PhotoCropModal` includes one.
 */
export function ToastHost() {
  const layer = useContext(ToastLayerContext);
  const id = useId();
  const add = layer?.addHost;
  const remove = layer?.removeHost;
  useEffect(() => {
    if (Platform.OS === 'ios' || !add || !remove) return;
    add(id);
    return () => remove(id);
  }, [id, add, remove]);
  if (Platform.OS === 'ios' || !layer || layer.hosts[layer.hosts.length - 1] !== id) return null;
  return <ToastLayer toast={layer.toast} onDismiss={layer.dismiss} />;
}

function ToastLayer({ toast, onDismiss }: { toast: ToastItem | null; onDismiss: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const top = toast.position === 'top';
  const entering = t.reduceMotion
    ? FadeIn.duration(t.motion.fast)
    : (top ? SlideInUp : SlideInDown).springify().damping(t.motion.spring.damping).stiffness(t.motion.spring.stiffness);
  const exiting = t.reduceMotion ? FadeOut.duration(t.motion.fast) : (top ? SlideOutUp : SlideOutDown).duration(t.motion.normal);
  const error = toast.tone === 'error';

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: top ? 'flex-start' : 'flex-end' }]}>
      <Animated.View
        key={toast.id}
        entering={entering}
        exiting={exiting}
        style={{
          alignSelf: 'center',
          marginTop: top ? insets.top + t.space.sm : 0,
          marginBottom: top ? 0 : insets.bottom + 72,
          marginHorizontal: t.space.lg,
          maxWidth: 520,
        }}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="alert"
          accessibilityLabel={toast.text}
          accessibilityHint="Tap to dismiss"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.sm,
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.md,
            minHeight: t.hit,
            borderRadius: t.radius.pill,
            backgroundColor: error ? t.c.dangerBg : t.c.ink,
            boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 24, color: alpha(t.c.shadow, t.scheme === 'dark' ? 0.5 : 0.18) }],
          }}
        >
          <LitContext.Provider value={!error}>
            <Icon name={error ? 'alert' : 'checkCircle'} size={17} color={error ? 'dangerText' : 'sage'} />
            <Text variant="subhead" weight="600" color={error ? 'dangerText' : 'onInk'} numberOfLines={2} style={{ flexShrink: 1 }}>
              {toast.text}
            </Text>
          </LitContext.Provider>
        </Pressable>
      </Animated.View>
    </View>
  );
}
