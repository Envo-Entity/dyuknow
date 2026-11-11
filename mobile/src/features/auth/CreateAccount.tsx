import { router } from 'expo-router';
import { useState } from 'react';

import { cleanEmail, signUp } from '@/data';
import { Button, Section, TextRow } from '@/ui';

import { AuthError, AuthFrame, AuthLink } from './AuthFrame';
import { setAuthDraft, startResendTimer, useAuthDraft, useRouteOn } from './state';

export function CreateAccount() {
  const draft = useAuthDraft();
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { routing, routeOn } = useRouteOn();
  const filled = !!email.trim() && !!password && !!confirm;

  const typing = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  const submit = async () => {
    if (busy || !filled) return;
    setBusy(true);
    setError(null);
    // signUp checks, in order: badEmail, shortPassword, mismatch.
    const r = await signUp(email, password, confirm);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setAuthDraft({ email: cleanEmail(email) });
    if (r.stage === 'signup-code') {
      startResendTimer();
      setPassword('');
      setConfirm('');
      router.push('/code');
      return;
    }
    await routeOn();
  };

  return (
    <AuthFrame
      eyebrow="Create an account"
      title={['Join ', { em: 'Dyuknow.' }]}
      description="We’ll email you a 6-digit code to confirm it’s you."
      routing={routing}
    >
      <Section footer="At least 8 characters.">
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
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextRow
          label="Confirm password"
          value={confirm}
          onChangeText={typing(setConfirm)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </Section>
      <AuthError error={error} />
      <Button label={busy ? 'Creating…' : 'Create account'} size="large" fullWidth onPress={submit} disabled={busy || !filled} />
      <AuthLink lead="Already have an account?" label="Sign in" onPress={() => router.dismissTo('/sign-in')} />
    </AuthFrame>
  );
}
