"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { destinationAfterSignIn, safeNext } from "@/components/auth/routing";

// Sign in: email + password, straight in.
// Create account: email + password, then a 6-digit code proves the email.
// Forgot password: a 6-digit code, then a new password.
type Stage = "signin" | "signup" | "signup-code" | "forgot" | "reset-code";

const RESEND_AFTER_SECONDS = 60;
const CODE_LENGTH = 6;
const MIN_PASSWORD = 8;

const MESSAGES = {
  badEmail: "Enter a valid email address.",
  wrongLogin: "That email and password don’t match. Check them, or reset your password.",
  shortPassword: `Use at least ${MIN_PASSWORD} characters.`,
  mismatch: "The two passwords don’t match.",
  wrongCode: "That code is wrong or has expired. Check it, or send a new one.",
  tooSoon: "Wait a minute before asking for another code.",
  noConnection: "Couldn’t reach Dyuknow. Check your connection and try again.",
  weakPassword: "Choose a stronger password.",
  samePassword: "Choose a password you haven’t used here before.",
} as const;

function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return MESSAGES.noConnection;
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) return MESSAGES.tooSoon;
  if (error.code === "email_address_invalid" || error.code === "validation_failed") return MESSAGES.badEmail;
  if (error.code === "weak_password") return MESSAGES.weakPassword;
  return MESSAGES.noConnection;
}

function codeMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return MESSAGES.noConnection;
  if (isAuthApiError(error)) return MESSAGES.wrongCode;
  return MESSAGES.noConnection;
}

const inputClass =
  "w-full rounded-2xl border border-border bg-paper px-4 py-3.5 text-[15px] text-ink placeholder:text-faint focus:border-ink lg:px-5 lg:py-4 lg:text-[16px]";
const primaryClass =
  "w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-30 lg:py-4 lg:text-[15px]";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-label";
const linkClass = "cursor-pointer font-semibold text-ink underline underline-offset-2 disabled:opacity-30";

export function LoginForm({ next: rawNext }: { next: string | null }) {
  const next = safeNext(rawNext);
  const [supabase] = useState(() => createClient());
  const [stage, setStage] = useState<Stage>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    if (sentAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sentAt]);

  useEffect(() => {
    if (stage === "signup-code" || stage === "reset-code") codeRef.current?.focus();
  }, [stage]);

  async function goOn() {
    setRouting(true);
    const destination = await destinationAfterSignIn(supabase, next);
    window.location.replace(destination);
  }

  function go(to: Stage) {
    setStage(to);
    setError(null);
    setCode("");
    setPassword("");
    setConfirm("");
  }

  function cleanEmail(): string | null {
    const clean = email.trim().toLowerCase();
    setEmail(clean);
    if (!looksLikeEmail(clean)) {
      setError(MESSAGES.badEmail);
      return null;
    }
    return clean;
  }

  function checkNewPassword(): boolean {
    if (password.length < MIN_PASSWORD) {
      setError(MESSAGES.shortPassword);
      return false;
    }
    if (password !== confirm) {
      setError(MESSAGES.mismatch);
      return false;
    }
    return true;
  }

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch {
      setError(MESSAGES.noConnection);
    } finally {
      setBusy(false);
    }
  }

  function codeSent() {
    setCode("");
    setSentAt(Date.now());
    setNow(Date.now());
  }

  const signIn = () =>
    run(async () => {
      const clean = cleanEmail();
      if (!clean) return;
      const { error: e } = await supabase.auth.signInWithPassword({ email: clean, password });
      if (e) {
        if (e.code === "email_not_confirmed") {
          // They started an account but never entered the code: send a fresh one.
          const { error: r } = await supabase.auth.resend({ type: "signup", email: clean });
          if (r) return setError(sendMessage(r));
          codeSent();
          setStage("signup-code");
          return;
        }
        return setError(isAuthRetryableFetchError(e) ? MESSAGES.noConnection : MESSAGES.wrongLogin);
      }
      await goOn();
    });

  const signUp = () =>
    run(async () => {
      const clean = cleanEmail();
      if (!clean || !checkNewPassword()) return;
      const { data, error: e } = await supabase.auth.signUp({ email: clean, password });
      if (e) return setError(sendMessage(e));
      // With email confirmation on there is no session until the code is entered.
      if (data.session) return goOn();
      codeSent();
      setStage("signup-code");
    });

  const confirmSignUp = (token: string) =>
    run(async () => {
      if (token.length !== CODE_LENGTH) return;
      const { error: e } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (e) return setError(codeMessage(e));
      await goOn();
    });

  const sendReset = () =>
    run(async () => {
      const clean = cleanEmail();
      if (!clean) return;
      const { error: e } = await supabase.auth.resetPasswordForEmail(clean);
      // The same next step whether or not the address has an account, so this
      // screen can't be used to find out who is on Dyuknow.
      if (e && (e.status === 429 || isAuthRetryableFetchError(e))) return setError(sendMessage(e));
      codeSent();
      setStage("reset-code");
    });

  const resetPassword = () =>
    run(async () => {
      if (code.length !== CODE_LENGTH) return setError(MESSAGES.wrongCode);
      if (!checkNewPassword()) return;
      const { error: v } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (v) return setError(codeMessage(v));
      const { error: u } = await supabase.auth.updateUser({ password });
      if (u) {
        return setError(u.code === "same_password" ? MESSAGES.samePassword : u.code === "weak_password" ? MESSAGES.weakPassword : MESSAGES.noConnection);
      }
      await goOn();
    });

  const resendCode = () =>
    run(async () => {
      const { error: e } =
        stage === "signup-code"
          ? await supabase.auth.resend({ type: "signup", email })
          : await supabase.auth.resetPasswordForEmail(email);
      if (e) return setError(sendMessage(e));
      codeSent();
    });

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError(null);
    if (stage === "signup-code" && digits.length === CODE_LENGTH) void confirmSignUp(digits);
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

  const errorLine = error && (
    <p role="alert" className="-mt-2 text-[13px] font-semibold text-ink">
      {error}
    </p>
  );

  const emailField = (
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
  );

  const passwordField = (label: string, value: string, set: (v: string) => void, autoComplete: string) => (
    <label className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          if (error) setError(null);
        }}
      />
    </label>
  );

  const codeField = (
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
  );

  const resendRow = (back: Stage, backLabel: string) => (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <button type="button" onClick={() => go(back)} className={linkClass}>
        {backLabel}
      </button>
      {secondsLeft > 0 ? (
        <span className="text-muted">New code in {secondsLeft}s</span>
      ) : (
        <button type="button" onClick={() => void resendCode()} disabled={busy} className={linkClass}>
          Send a new code
        </button>
      )}
    </div>
  );

  return (
    <LoginFrame>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (stage === "signin") void signIn();
          else if (stage === "signup") void signUp();
          else if (stage === "signup-code") void confirmSignUp(code);
          else if (stage === "forgot") void sendReset();
          else void resetPassword();
        }}
      >
        {stage === "signin" && (
          <>
            <StepHeader eyebrow="Sign in" title="Welcome back." />
            {emailField}
            {passwordField("Password", password, setPassword, "current-password")}
            {errorLine}
            <button type="submit" className={primaryClass} disabled={busy || !email.trim() || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
              <button type="button" onClick={() => go("forgot")} className={linkClass}>
                Forgot password?
              </button>
              <span className="text-muted">
                New here?{" "}
                <button type="button" onClick={() => go("signup")} className={linkClass}>
                  Create an account
                </button>
              </span>
            </div>
          </>
        )}

        {stage === "signup" && (
          <>
            <StepHeader eyebrow="Create an account" title="Join Dyuknow." description="We’ll email you a 6-digit code to confirm it’s you." />
            {emailField}
            {passwordField("Password", password, setPassword, "new-password")}
            {passwordField("Confirm password", confirm, setConfirm, "new-password")}
            <p className="-mt-3 text-[12.5px] text-muted">At least {MIN_PASSWORD} characters.</p>
            {errorLine}
            <button type="submit" className={primaryClass} disabled={busy || !email.trim() || !password || !confirm}>
              {busy ? "Creating…" : "Create account"}
            </button>
            <div className="text-[13px] text-muted">
              Already have an account?{" "}
              <button type="button" onClick={() => go("signin")} className={linkClass}>
                Sign in
              </button>
            </div>
          </>
        )}

        {stage === "signup-code" && (
          <>
            <StepHeader eyebrow="Create an account" title="Check your email." description={`We sent a 6-digit code to ${email}. Enter it to confirm your account.`} />
            {codeField}
            {errorLine}
            <button type="submit" className={primaryClass} disabled={busy || code.length !== CODE_LENGTH}>
              {busy ? "Checking…" : "Confirm"}
            </button>
            {resendRow("signup", "Use a different email")}
          </>
        )}

        {stage === "forgot" && (
          <>
            <StepHeader eyebrow="Forgot password" title="Reset your password." description="Enter your email and we’ll send you a 6-digit code." />
            {emailField}
            {errorLine}
            <button type="submit" className={primaryClass} disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Send code"}
            </button>
            <div className="text-[13px]">
              <button type="button" onClick={() => go("signin")} className={linkClass}>
                Back to sign in
              </button>
            </div>
          </>
        )}

        {stage === "reset-code" && (
          <>
            <StepHeader eyebrow="Forgot password" title="Choose a new password." description={`If ${email} has an account, we’ve sent it a 6-digit code.`} />
            {codeField}
            {passwordField("New password", password, setPassword, "new-password")}
            {passwordField("Confirm new password", confirm, setConfirm, "new-password")}
            {errorLine}
            <button type="submit" className={primaryClass} disabled={busy || code.length !== CODE_LENGTH || !password || !confirm}>
              {busy ? "Saving…" : "Save password and sign in"}
            </button>
            {resendRow("forgot", "Use a different email")}
          </>
        )}
      </form>
    </LoginFrame>
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
