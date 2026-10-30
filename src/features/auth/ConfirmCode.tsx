import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { CODE_LENGTH, resendSignupCode, verifySignupCode } from '@/data';
import { Button, CodeField } from '@/ui';

import { AuthError, AuthFrame, ResendRow } from './AuthFrame';
import { startResendTimer, useAuthDraft, useResendSeconds, useRouteOn } from './state';

export function ConfirmCode() {
  const { email, sentAt } = useAuthDraft();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const seconds = useResendSeconds(sentAt);
  const { routing, routeOn } = useRouteOn();

  // Opened without an email (a cold start on this route): back to sign-in.
  if (!email) return <Redirect href="/sign-in" />;

  const submit = async (value = code) => {
    if (busy || value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    const r = await verifySignupCode(email, value);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    await routeOn();
  };

  const resend = async () => {
    if (sending || seconds > 0) return;
    setSending(true);
    setError(null);
    const r = await resendSignupCode(email, 'signup-code');
    setSending(false);
    if (!r.ok) return setError(r.message);
    startResendTimer();
  };

  return (
    <AuthFrame
      eyebrow="Create an account"
      title={['Check your ', { em: 'email.' }]}
      description={`We sent a 6-digit code to ${email}. Enter it to confirm your account.`}
      routing={routing}
    >
      <CodeField
        value={code}
        onChange={(v) => {
          setCode(v);
          setError(null);
        }}
        onComplete={(v) => void submit(v)}
        length={CODE_LENGTH}
        editable={!busy}
        autoFocus
      />
      <AuthError error={error} />
      <Button
        label={busy ? 'Checking…' : 'Confirm'}
        size="large"
        fullWidth
        onPress={() => void submit()}
        disabled={busy || code.length !== CODE_LENGTH}
      />
      <ResendRow
        seconds={seconds}
        sending={sending}
        onResend={resend}
        onDifferentEmail={() => {
          setCode('');
          router.dismissTo('/create');
        }}
      />
    </AuthFrame>
  );
}
