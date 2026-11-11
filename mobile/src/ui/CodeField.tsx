import { useRef } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Text } from './Text';

export type CodeFieldProps = {
  value: string;
  /** Digits only, already cut to `length`. */
  onChange: (code: string) => void;
  /** Called once when the last digit is typed or pasted (auto-submit). */
  onComplete?: (code: string) => void;
  /** Default 6. */
  length?: number;
  /** Small label above; default "6-digit code". */
  label?: string;
  error?: string | null;
  autoFocus?: boolean;
  editable?: boolean;
};

/**
 * A one-time code: one large tabular row in a card. Digits only, a paste is
 * cut to length, and the system offers the code from Mail or Messages.
 */
export function CodeField({ value, onChange, onComplete, length = 6, label, error, autoFocus, editable = true }: CodeFieldProps) {
  const t = useTheme();
  const ref = useRef<TextInputInstance>(null);
  const size = Math.round(34 * t.scale);
  const shown = label ?? `${length}-digit code`;

  return (
    <View style={{ gap: t.space.sm }}>
      <Text variant="label" color="muted" style={{ paddingHorizontal: t.space.lg, textTransform: 'uppercase' }}>
        {shown}
      </Text>
      <Pressable
        onPress={() => ref.current?.focus()}
        accessible={false}
        style={{ backgroundColor: t.c.card, borderRadius: t.radius.lg, paddingVertical: t.space.lg, paddingHorizontal: t.space.lg }}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, '').slice(0, length);
            onChange(next);
            if (next.length === length && value.length !== length) onComplete?.(next);
          }}
          placeholder={'•'.repeat(length)}
          placeholderTextColor={t.c.faint}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={length + 8 /* room for a pasted code with spaces */}
          accessibilityLabel={shown}
          accessibilityHint={error ?? undefined}
          selectionColor={t.c.focus}
          style={{
            fontFamily: fonts.sans,
            fontSize: size,
            lineHeight: Math.round(size * 1.2),
            fontWeight: '600',
            letterSpacing: Math.round(10 * t.scale),
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
            color: t.c.text,
            paddingVertical: 0,
            minHeight: t.hit,
          }}
        />
      </Pressable>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs, paddingHorizontal: t.space.lg }} accessibilityLiveRegion="polite">
          <Icon name="alert" size={13} color="dangerText" />
          <Text variant="footnote" color="dangerText" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
