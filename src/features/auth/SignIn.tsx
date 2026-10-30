import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { signIn } from '@/data';
import { useTheme } from '@/theme/useTheme';
import { Button, Section, TextRow } from '@/ui';

import { AuthError, AuthFrame, AuthLink } from './AuthFrame';
import { setAuthDraft, startResendTimer, useAuthDraft, useRouteOn } from './state';

export function SignIn() {
  const t = useTheme();
  const draft = useAuthDraft();
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { routing, routeOn } = useRouteOn();

  const typing = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  const submit = async () => {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    setBusy(false);
    setAuthDraft({ email: email.trim().toLowerCase() });
    if (!r.ok) return setError(r.message);
    if (r.stage === 'signup-code') {
      // Never entered the code: a fresh one is on its way.
      startResendTimer();
      setPassword('');
      router.push('/code');
      return;
    }
    await routeOn();
  };

  return (
    <AuthFrame eyebrow="Sign in" title={['Welcome ', { em: 'back.' }]} routing={routing}>
      <Section>
        <TextRow
          label="Email address"
          value={email}
          onChangeText={typing(setEmail)}
          placeholder="e.g. camille@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
        />
        <TextRow
          label="Password"
          value={password}
          onChangeText={typing(setPassword)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </Section>
      <AuthError error={error} />
      <View style={{ gap: t.space.sm }}>
        <Button
          label={busy ? 'Signing in…' : 'Sign in'}
          size="large"
          fullWidth
          onPress={submit}
          disabled={busy || !email.trim() || !password}
        />
        <AuthLink label="Forgot password?" onPress={() => router.push('/reset')} />
      </View>
      <AuthLink lead="New here?" label="Create an account" onPress={() => router.push('/create')} />
    </AuthFrame>
  );
}
