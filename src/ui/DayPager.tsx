import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Button } from './Button';
import { dayNumber, formatDayLong, monthShort, weekdayShort } from './dates';
import { select as tick, warn } from './haptics';
import { Icon } from './Icon';
import { Text } from './Text';
import { alpha, LitContext } from './tone';

export type DayTone = 'free' | 'notFree' | 'booked' | 'none';

export type DayInfo = {
  /** One short word under the number ("Free", "Booked", "3"). */
  note?: string;
  tone?: DayTone;
  /** Can't be picked. */
  disabled?: boolean;
};

export type DayPagerProps = {
  /** 'YYYY-MM-DD' days in order (Europe/London). Paged 14 at a time. */
  days: string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Most days that can be picked. */
  max?: number;
  onMaxReached?: () => void;
  describe?: (day: string) => DayInfo | undefined;
  /** Days per page; default 14 (two weeks, 7 columns). */
  perPage?: number;
  /** Hide the "Clear" button. */
  hideClear?: boolean;
  style?: ViewStyle;
};

const GAP = 6;

function rangeLabel(page: string[]): string {
  if (!page.length) return '';
  const a = page[0];
  const b = page[page.length - 1];
  return monthShort(a) === monthShort(b)
    ? `${dayNumber(a)} – ${dayNumber(b)} ${monthShort(b)}`
    : `${dayNumber(a)} ${monthShort(a)} – ${dayNumber(b)} ${monthShort(b)}`;
}

export function DayPager({ days, value, onChange, max, onMaxReached, describe, perPage = 14, hideClear, style }: DayPagerProps) {
  const t = useTheme();
  const { c } = t;
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);

  const pages: string[][] = [];
  for (let i = 0; i < days.length; i += perPage) pages.push(days.slice(i, i + perPage));
  const tileW = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;

  const goTo = (p: number) => {
    const n = Math.max(0, Math.min(pages.length - 1, p));
    setPage(n);
    scroller.current?.scrollTo({ x: n * width, animated: !t.reduceMotion });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const toggle = (d: string) => {
    const on = value.includes(d);
    if (!on && max != null && value.length >= max) {
      warn();
      onMaxReached?.();
      return;
    }
    tick();
    onChange(on ? value.filter((x) => x !== d) : [...value, d].sort());
  };

  const navBtn = (dir: -1 | 1) => {
    const enabled = dir < 0 ? page > 0 : page < pages.length - 1;
    return (
      <Pressable
        onPress={() => goTo(page + dir)}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={dir < 0 ? 'Previous two weeks' : 'Next two weeks'}
        accessibilityState={{ disabled: !enabled }}
        style={({ pressed }) => ({
          width: t.hit,
          height: t.hit,
          borderRadius: t.hit / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? c.fill : 'transparent',
          opacity: enabled ? 1 : 0.3,
        })}
      >
        <Icon name={dir < 0 ? 'back' : 'forward'} size={16} weight="semibold" />
      </Pressable>
    );
  };

  return (
    <View style={[{ gap: t.space.sm }, style]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
            {rangeLabel(pages[page] ?? [])}
          </Text>
          <Text variant="footnote" color="muted" tabular>
            {value.length === 0 ? 'No days picked' : max != null ? `${value.length} of ${max} picked` : `${value.length} picked`}
          </Text>
        </View>
        {!hideClear && value.length > 0 ? (
          <Button
            label="Clear"
            variant="quiet"
            onPress={() => {
              tick();
              onChange([]);
            }}
            accessibilityLabel="Clear picked days"
          />
        ) : null}
        {navBtn(-1)}
        {navBtn(1)}
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
          >
            {pages.map((p, pi) => (
              <View key={pi} style={[styles.grid, { width, gap: GAP }]}>
                {p.map((d) => {
                  const info = describe?.(d) ?? {};
                  const on = value.includes(d);
                  const tone = info.tone ?? 'none';
                  const bg = on ? c.ink : tone === 'free' ? c.sageSoft : tone === 'notFree' ? 'transparent' : c.card;
                  const border = on ? c.ink : tone === 'notFree' ? c.border : tone === 'free' ? c.sageSoft : c.border;
                  const numColor = on ? 'onInk' : tone === 'notFree' ? 'faint' : tone === 'free' ? 'sageText' : 'text';
                  const noteColor = on ? 'onInk' : tone === 'free' || tone === 'booked' ? 'sageText' : 'faint';
                  const spoken = [formatDayLong(d), info.note, on ? 'picked' : null].filter(Boolean).join(', ');
                  return (
                    <Pressable
                      key={d}
                      onPress={() => toggle(d)}
                      disabled={info.disabled}
                      accessibilityRole="checkbox"
                      accessibilityLabel={spoken}
                      accessibilityState={{ checked: on, disabled: !!info.disabled }}
                      style={({ pressed }) => [
                        styles.tile,
                        {
                          width: tileW,
                          minHeight: Math.round(72 * t.scale),
                          borderRadius: t.radius.md,
                          backgroundColor: bg,
                          borderColor: border,
                          opacity: info.disabled && !on ? 0.5 : 1,
                          transform: [{ scale: pressed && !t.reduceMotion ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      <LitContext.Provider value={false}>
                        <Text variant="caption" color={on ? 'onInk' : 'muted'} numberOfLines={1} style={on ? { color: alpha(c.onInk, 0.75) } : undefined}>
                          {weekdayShort(d)}
                        </Text>
                        <Text variant="headline" tabular color={numColor} numberOfLines={1} style={tone === 'notFree' && !on ? { textDecorationLine: 'line-through' } : undefined}>
                          {String(dayNumber(d))}
                        </Text>
                        <View style={styles.noteRow}>
                          {tone === 'booked' && !on ? <Icon name="check" size={9} color="sageText" weight="bold" /> : null}
                          {info.note ? (
                            <Text variant="caption" color={noteColor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: Math.round(10 * t.scale), lineHeight: Math.round(13 * t.scale) }}>
                              {info.note}
                            </Text>
                          ) : null}
                        </View>
                      </LitContext.Provider>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6, paddingHorizontal: 2, gap: 1 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 13, maxWidth: '100%' },
});
