import { router } from 'expo-router';
import { useState } from 'react';

import { CODE_LENGTH, cleanEmail, requestPasswordReset, resendSignupCode, verifyResetAndSetPassword } from '@/data';
import { Button, Section, TextRow } from '@/ui';

import { AuthError, AuthFrame, AuthLink } from './AuthFrame';
import { CodeField, ResendRow } from './CodeField';
import { setAuthDraft, startResendTimer, useAuthDraft, useResendSeconds, useRouteOn } from './state';

/** Forgot password: the email, then the code and a new password. */
export function ResetPassword() {
  const draft = useAuthDraft();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(draft.email);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const seconds = useResendSeconds(draft.sentAt);
  const { routing, routeOn } = useRouteOn();

  const typing = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  const sendCode = async () => {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    // The same next step whether or not the address has an account.
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setAuthDraft({ email: cleanEmail(email) });
    startResendTimer();
    setStep('code');
  };

  const filled = code.length === CODE_LENGTH && !!password && !!confirm;
  const save = async () => {
    if (busy || !filled) return;
    setBusy(true);
    setError(null);
    // Checks, in order: the code, shortPassword, mismatch; then the server.
    const r = await verifyResetAndSetPassword(email, code, password, confirm);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    await routeOn();
  };

  const resend = async () => {
    if (sending || seconds > 0) return;
    setSending(true);
    setError(null);
    const r = await resendSignupCode(email, 'reset-code');
    setSending(false);
    if (!r.ok) return setError(r.message);
    startResendTimer();
  };

  if (step === 'email') {
    return (
      <AuthFrame
        eyebrow="Forgot password"
        title={['Reset your ', { em: 'password.' }]}
        description="Enter your email and we’ll send you a 6-digit code."
        routing={routing}
      >
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
            returnKeyType="send"
            onSubmitEditing={sendCode}
            autoFocus={!email}
          />
        </Section>
        <AuthError error={error} />
        <Button label={busy ? 'Sending…' : 'Send code'} size="large" fullWidth onPress={sendCode} disabled={busy || !email.trim()} />
        <AuthLink label="Back to sign in" onPress={() => router.dismissTo('/sign-in')} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="Forgot password"
      title={['Choose a new ', { em: 'password.' }]}
      description={`If ${cleanEmail(email)} has an account, we’ve sent it a 6-digit code.`}
      routing={routing}
    >
      <CodeField value={code} onChange={typing(setCode)} autoFocus />
      <Section>
        <TextRow
          label="New password"
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
          label="Confirm new password"
          value={confirm}
          onChangeText={typing(setConfirm)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={save}
        />
      </Section>
      <AuthError error={error} />
      <Button label={busy ? 'Saving…' : 'Save password and sign in'} size="large" fullWidth onPress={save} disabled={busy || !filled} />
      <ResendRow
        seconds={seconds}
        sending={sending}
        onResend={resend}
        onDifferentEmail={() => {
          setCode('');
          setPassword('');
          setConfirm('');
          setError(null);
          setStep('email');
        }}
      />
    </AuthFrame>
  );
}
