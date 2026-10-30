import { useRef } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import { CODE_LENGTH, cleanCode } from '@/data';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button, Text } from '@/ui';

type Props = {
  value: string;
  onChange: (code: string) => void;
  /** Called once when the 6th digit is typed or pasted. */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
};

/**
 * The 6-digit code: one large tabular row. Digits only, paste is cut to 6,
 * and the system offers the code from Mail or Messages (oneTimeCode).
 * Kit candidate.
 */
export function CodeField({ value, onChange, onComplete, autoFocus }: Props) {
  const t = useTheme();
  const ref = useRef<TextInputInstance>(null);
  const size = Math.round(34 * t.scale);

  return (
    <View style={{ gap: t.space.sm }}>
      <Text variant="label" color="muted" style={{ paddingHorizontal: t.space.lg, textTransform: 'uppercase' }}>
        6-digit code
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
            const next = cleanCode(text);
            onChange(next);
            if (next.length === CODE_LENGTH && value.length !== CODE_LENGTH) onComplete?.(next);
          }}
          placeholder="••••••"
          placeholderTextColor={t.c.faint}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel="6-digit code"
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
    </View>
  );
}

/** Under the code: "Use a different email", then the timer or "Send a new code". */
export function ResendRow({
  seconds,
  sending,
  onResend,
  onDifferentEmail,
}: {
  seconds: number;
  sending: boolean;
  onResend: () => void;
  onDifferentEmail: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: t.space.xs }}>
      <Button label="Use a different email" variant="quiet" onPress={onDifferentEmail} />
      {seconds > 0 ? (
        <View style={{ minHeight: t.hit, justifyContent: 'center' }} accessible accessibilityLabel={`New code in ${seconds} seconds`}>
          <Text variant="callout" color="muted" tabular>
            {`New code in ${seconds}s`}
          </Text>
        </View>
      ) : (
        <Button label="Send a new code" variant="quiet" onPress={onResend} loading={sending} disabled={sending} />
      )}
    </View>
  );
}
