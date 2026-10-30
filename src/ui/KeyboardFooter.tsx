import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Dimensions, Platform, useWindowDimensions, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  KeyboardState,
  measure,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

type FooterContextValue = {
  /** Points at the bottom of the footer that may sit behind the keyboard (its safe-area padding). */
  overlap: SharedValue<number> | null;
  /** True when something outside the footer already keeps it clear of the home indicator / tab bar. */
  insetHandled: boolean;
};

const FooterContext = createContext<FooterContextValue>({ overlap: null, insetHandled: false });

/** For footer contents (StickyAction): whether to add the bottom safe-area inset themselves. */
export function useFooterInsetHandled() {
  return useContext(FooterContext).insetHandled;
}

/**
 * For footer contents: declare how much bottom padding (usually the safe-area
 * inset) may hide behind the keyboard, so the visible part sits right on it.
 */
export function useKeyboardOverlap(points: number) {
  const overlap = useContext(FooterContext).overlap;
  useEffect(() => {
    if (!overlap) return;
    overlap.value = points;
    return () => {
      overlap.value = 0;
    };
  }, [overlap, points]);
}

export type KeyboardFooterProps = {
  children: ReactNode;
  /** Set when the footer is already kept clear of the bottom inset / tab bar by its container. */
  insetHandled?: boolean;
  /** Extra points at the bottom that may hide behind the keyboard (e.g. a tab-bar inset). Default 0. */
  overlap?: number;
  /**
   * The container always reaches the bottom of the screen (an iOS form sheet):
   * lift by the keyboard height without measuring. Default false (measure).
   */
  anchored?: boolean;
  style?: ViewStyle;
  onLayout?: ViewProps['onLayout'];
};

/**
 * Lifts its children above the keyboard on both platforms, frame by frame
 * (Android edge-to-edge never resizes the window). It measures where it sits,
 * so it works at the bottom of a screen or above a tab bar (`anchored` skips
 * the measuring for containers pinned to the screen's bottom edge). `Screen` and `SheetScreen` wrap their `footer` in one;
 * use it directly only for a custom bottom bar (e.g. a chat composer).
 */
export function KeyboardFooter({ children, insetHandled = false, overlap: baseOverlap = 0, anchored = false, style, onLayout }: KeyboardFooterProps) {
  // Android is edge-to-edge: the root view, and the keyboard's height, run to the
  // bottom of the screen. iOS measures against the window.
  const win = useWindowDimensions();
  const screen = Platform.OS === 'android' ? Dimensions.get('screen') : win;
  const windowH = screen.height;
  const keyboard = useAnimatedKeyboard();
  const frame = useAnimatedRef<Animated.View>();
  const overlap = useSharedValue(0);
  const base = useSharedValue(baseOverlap);
  const lift = useSharedValue(0);
  useEffect(() => {
    base.value = baseOverlap;
  }, [base, baseOverlap]);

  useAnimatedReaction(
    () => ({ h: keyboard.height.value, s: keyboard.state.value }),
    ({ h, s }) => {
      if (h <= 0 || s === KeyboardState.CLOSED) {
        lift.value = 0;
        return;
      }
      if (anchored) {
        lift.value = Math.max(0, h - overlap.value - base.value);
        return;
      }
      const m = measure(frame);
      if (!m) return;
      const bottom = m.pageY + m.height;
      const keyboardTop = windowH - h;
      lift.value = Math.max(0, bottom - keyboardTop - overlap.value - base.value);
    },
    [windowH, anchored],
  );

  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));

  return (
    <FooterContext.Provider value={{ overlap, insetHandled }}>
      <Animated.View ref={frame} style={style} onLayout={onLayout} collapsable={false}>
        <Animated.View style={moved}>{children}</Animated.View>
      </Animated.View>
    </FooterContext.Provider>
  );
}

/**
 * A spacer as tall as the keyboard, for the end of a scroll view on Android
 * (where the window doesn't shrink), so the last fields can scroll clear.
 */
export function KeyboardSpacer() {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({ height: Math.max(0, keyboard.height.value) }));
  return <Animated.View style={style} pointerEvents="none" />;
}
