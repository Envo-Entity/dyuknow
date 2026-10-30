import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';
import { LitContext } from './tone';

export type PhotoProps = {
  uri: string | null | undefined;
  /** Used for the monogram initial and the spoken label. */
  name?: string;
  /** width / height. Default 4/5 portrait. Ignored when `circle`. */
  aspect?: number;
  /** Corner radius; default theme.radius.lg. */
  radius?: number;
  /** Width; default fills the parent. */
  width?: DimensionValue;
  /** Circular avatar of `size` points. */
  circle?: boolean;
  size?: number;
  style?: ViewStyle;
  /** Spoken label; default `name`. Pass "" to hide from screen readers. */
  accessibilityLabel?: string;
};

function initialOf(name?: string): string {
  const n = (name ?? '').trim();
  return n ? n[0].toUpperCase() : '·';
}

export function Photo({ uri, name, aspect = 4 / 5, radius, width, circle, size = 40, style, accessibilityLabel }: PhotoProps) {
  const t = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const [measured, setMeasured] = useState(0);
  const showImage = !!uri && failed !== uri;

  const box: ViewStyle = circle
    ? { width: size, height: size, borderRadius: size / 2 }
    : { width: width ?? '100%', aspectRatio: aspect, borderRadius: radius ?? t.radius.lg };
  const w = circle ? size : measured;
  const monoSize = Math.max(12, Math.round(w * (circle ? 0.46 : 0.36)));
  const label = accessibilityLabel ?? (name ? `Photo of ${name}` : 'Photo');

  return (
    <View
      style={[styles.box, { backgroundColor: t.c.monoBg }, box, style]}
      onLayout={circle ? undefined : (e) => setMeasured(e.nativeEvent.layout.width)}
      accessible={label !== ''}
      accessibilityRole="image"
      accessibilityLabel={label || undefined}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={t.reduceMotion ? 0 : t.motion.fast}
          onError={() => setFailed(uri)}
          accessible={false}
        />
      ) : w > 0 ? (
        <LitContext.Provider value={false}>
          <Text
            variant="title"
            color="monoText"
            allowFontScaling={false}
            style={{ fontFamily: fonts.serif, fontSize: monoSize, lineHeight: Math.round(monoSize * 1.15) }}
          >
            {initialOf(name)}
          </Text>
        </LitContext.Provider>
      ) : null}
    </View>
  );
}

export type AvatarProps = {
  uri: string | null | undefined;
  name?: string;
  size?: 28 | 40 | 56 | 96;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Avatar({ size = 40, ...rest }: AvatarProps) {
  return <Photo {...rest} circle size={size} />;
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
