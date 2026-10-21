"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { destinationAfterSignIn, safeNext } from "@/components/auth/routing";

const RESEND_AFTER_SECONDS = 60;
const CODE_LENGTH = 6;

const MESSAGES = {
  wrongCode: "That code is wrong or has expired. Check it, or send a new one.",
  tooSoon: "Wait a minute before asking for another code.",
  badEmail: "Enter a valid email address.",
  noConnection: "Couldn’t send the code. Check your connection and try again.",
  noConnectionCheck: "Couldn’t check the code. Check your connection and try again.",
  testSignIn: "That email and password don’t match a test account.",
} as const;

function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendCodeMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return MESSAGES.noConnection;
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) return MESSAGES.tooSoon;
  if (error.code === "email_address_invalid" || error.code === "validation_failed") return MESSAGES.badEmail;
  return MESSAGES.noConnection;
}

function verifyMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return MESSAGES.noConnectionCheck;
  if (isAuthApiError(error)) return MESSAGES.wrongCode;
  return MESSAGES.noConnectionCheck;
}

const inputClass =
  "w-full rounded-2xl border border-border bg-paper px-4 py-3.5 text-[15px] text-ink placeholder:text-faint focus:border-ink lg:px-5 lg:py-4 lg:text-[16px]";
const primaryClass =
  "w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-30 lg:py-4 lg:text-[15px]";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-label";

export function LoginForm({ next: rawNext, devLogin }: { next: string | null; devLogin: boolean }) {
  const next = safeNext(rawNext);
  const [supabase] = useState(() => createClient());
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [routing, setRouting] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Already signed in on this device: go straight to where they belong.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) void goOn();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "code" || sentAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stage, sentAt]);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  async function goOn() {
    setRouting(true);
    const destination = await destinationAfterSignIn(supabase, next);
    window.location.replace(destination);
  }

  async function sendCode() {
    const clean = email.trim().toLowerCase();
    setEmail(clean);
    if (!looksLikeEmail(clean)) {
      setError(MESSAGES.badEmail);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
      if (otpError) {
        setError(sendCodeMessage(otpError));
        return;
      }
      setCode("");
      setSentAt(Date.now());
      setNow(Date.now());
      setStage("code");
    } catch {
      setError(MESSAGES.noConnection);
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(token: string) {
    if (token.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (verifyError) {
        setError(verifyMessage(verifyError));
        setBusy(false);
        return;
      }
      await goOn();
    } catch {
      setError(MESSAGES.noConnectionCheck);
      setBusy(false);
    }
  }

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === CODE_LENGTH) void checkCode(digits);
  }

  function changeEmail() {
    setStage("email");
    setCode("");
    setError(null);
    setSentAt(null);
  }

  const secondsLeft = sentAt === null ? 0 : Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000));

  if (routing) {
    return (
      <LoginFrame>
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-8 w-8 flex-none animate-spin rounded-full border-2 border-border border-t-ink" />
          <div className="text-sm font-semibold text-ink">Signing you in…</div>
        </div>
      </LoginFrame>
    );
  }

  return (
    <LoginFrame>
      {stage === "email" ? (
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <StepHeader eyebrow="Sign in" title="Your email." description="We’ll send you a 6-digit code. New here? The same code gets you started." />
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Email address</span>
            <input
              className={inputClass}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="e.g. camille@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
          </label>
          {error && (
            <p role="alert" className="-mt-2 text-[13px] font-semibold text-ink">
              {error}
            </p>
          )}
          <button type="submit" className={primaryClass} disabled={busy || !email.trim()}>
            {busy ? "Sending…" : "Continue"}
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void checkCode(code);
          }}
        >
          <StepHeader eyebrow="Sign in" title="Check your email." description={`We sent a 6-digit code to ${email}.`} />
          <label className="flex flex-col gap-2">
            <span className={labelClass}>6-digit code</span>
            <input
              ref={codeRef}
              className={`${inputClass} text-center font-semibold tracking-[0.5em]`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={CODE_LENGTH + 10}
              placeholder="••••••"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={busy}
            />
          </label>
          {error && (
            <p role="alert" className="-mt-2 text-[13px] font-semibold text-ink">
              {error}
            </p>
          )}
          <button type="submit" className={primaryClass} disabled={busy || code.length !== CODE_LENGTH}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <button type="button" onClick={changeEmail} className="cursor-pointer font-semibold text-ink underline underline-offset-2">
              Use a different email
            </button>
            {secondsLeft > 0 ? (
              <span className="text-muted">New code in {secondsLeft}s</span>
            ) : (
              <button type="button" onClick={() => void sendCode()} disabled={busy} className="cursor-pointer font-semibold text-ink underline underline-offset-2 disabled:opacity-30">
                Send a new code
              </button>
            )}
          </div>
        </form>
      )}

      {devLogin && <TestSignIn onSignedIn={goOn} />}
    </LoginFrame>
  );
}

function TestSignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) {
        setError(MESSAGES.testSignIn);
        setBusy(false);
        return;
      }
      await onSignedIn();
    } catch {
      setError(MESSAGES.testSignIn);
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-10 flex flex-col gap-4 border-t border-dashed border-hairline pt-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void signIn();
      }}
    >
      <div>
        <div className={labelClass}>Test sign-in</div>
        <p className="mt-1.5 text-[13px] text-muted">For the seeded test accounts only. Not shown in production.</p>
      </div>
      <input className={inputClass} type="email" autoComplete="off" placeholder="Test email" aria-label="Test email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={inputClass} type="password" autoComplete="off" placeholder="Password" aria-label="Test password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="w-full cursor-pointer rounded-full border border-border bg-paper px-5 py-3 text-sm font-semibold text-ink disabled:cursor-default disabled:opacity-30"
      >
        {busy ? "Signing in…" : "Test sign-in"}
      </button>
    </form>
  );
}

function LoginFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-view-in flex min-h-screen flex-col items-center bg-paper px-5 pb-14 pt-9 lg:gap-8 lg:bg-mist lg:px-10 lg:py-16">
      <div className="flex w-full max-w-[440px] items-center justify-center lg:max-w-[520px]">
        <Link href="/" className="font-serif text-2xl tracking-[-0.01em]">
          Dyuknow
        </Link>
      </div>
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center py-10 lg:max-w-[520px] lg:flex-none lg:rounded-[30px] lg:bg-paper lg:px-14 lg:py-14 lg:shadow-[0_20px_60px_rgba(5,5,5,0.08)]">
        {children}
      </div>
    </div>
  );
}
