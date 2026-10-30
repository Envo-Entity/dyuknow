// Email + password sign-in with 6-digit email codes, as the website's
// components/auth/LoginForm.tsx: the same calls, the same words. Each helper
// returns { ok: true } or { ok: false, message }, plus `stage` when the next
// screen differs from the obvious one. After { ok: true } the session is
// stored and LiveProvider reloads on its own (onAuthStateChange).
import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthStage = 'signin' | 'signup' | 'signup-code' | 'forgot' | 'reset-code';
export type AuthResult = { ok: true; stage?: AuthStage } | { ok: false; message: string; code?: string; stage?: AuthStage };

export const RESEND_AFTER_SECONDS = 60;
export const CODE_LENGTH = 6;
export const MIN_PASSWORD = 8;

export const AUTH_MESSAGES = {
  badEmail: 'Enter a valid email address.',
  wrongLogin: 'That email and password don’t match. Check them, or reset your password.',
  shortPassword: `Use at least ${MIN_PASSWORD} characters.`,
  mismatch: 'The two passwords don’t match.',
  wrongCode: 'That code is wrong or has expired. Check it, or send a new one.',
  tooSoon: 'Wait a minute before asking for another code.',
  noConnection: 'Couldn’t reach Dyuknow. Check your connection and try again.',
  weakPassword: 'Choose a stronger password.',
  samePassword: 'Choose a password you haven’t used here before.',
} as const;

export function looksLikeEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
/** Trimmed, lower-case: what every helper sends. */
export function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}
/** The new-password check before sign-up or reset; null when fine. */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return AUTH_MESSAGES.shortPassword;
  if (password !== confirm) return AUTH_MESSAGES.mismatch;
  return null;
}
/** Keeps digits only, up to 6 (paste-friendly). */
export function cleanCode(value: string) {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

function sendMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return AUTH_MESSAGES.noConnection;
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit' || error.status === 429)
    return AUTH_MESSAGES.tooSoon;
  if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return AUTH_MESSAGES.badEmail;
  if (error.code === 'weak_password') return AUTH_MESSAGES.weakPassword;
  return AUTH_MESSAGES.noConnection;
}
function codeMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return AUTH_MESSAGES.noConnection;
  if (isAuthApiError(error)) return AUTH_MESSAGES.wrongCode;
  return AUTH_MESSAGES.noConnection;
}
const fail = (message: string, error?: AuthError | null, stage?: AuthStage): AuthResult => ({
  ok: false,
  message,
  code: error?.code,
  stage,
});
async function guard(work: () => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await work();
  } catch {
    return fail(AUTH_MESSAGES.noConnection);
  }
}

/**
 * Sign in. An account that never entered its code gets a fresh one:
 * { ok: true, stage: 'signup-code' } (show the code screen, start the resend timer).
 */
export function signIn(email: string, password: string) {
  return guard(async () => {
    const clean = cleanEmail(email);
    if (!looksLikeEmail(clean)) return fail(AUTH_MESSAGES.badEmail);
    const { error: e } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (e) {
      if (e.code === 'email_not_confirmed') {
        const { error: r } = await supabase.auth.resend({ type: 'signup', email: clean });
        if (r) return fail(sendMessage(r), r);
        return { ok: true, stage: 'signup-code' };
      }
      return fail(isAuthRetryableFetchError(e) ? AUTH_MESSAGES.noConnection : AUTH_MESSAGES.wrongLogin, e);
    }
    return { ok: true };
  });
}

/**
 * Create an account. With email confirmation on there is no session until the
 * code is entered: { ok: true, stage: 'signup-code' }. With a session: { ok: true }.
 */
export function signUp(email: string, password: string, confirm: string) {
  return guard(async () => {
    const clean = cleanEmail(email);
    if (!looksLikeEmail(clean)) return fail(AUTH_MESSAGES.badEmail);
    const bad = checkNewPassword(password, confirm);
    if (bad) return fail(bad);
    const { data, error: e } = await supabase.auth.signUp({ email: clean, password });
    if (e) return fail(sendMessage(e), e);
    if (data.session) return { ok: true };
    return { ok: true, stage: 'signup-code' };
  });
}

/** The 6-digit sign-up code. Signed in on { ok: true }. */
export function verifySignupCode(email: string, code: string) {
  return guard(async () => {
    const token = cleanCode(code);
    if (token.length !== CODE_LENGTH) return fail(AUTH_MESSAGES.wrongCode);
    const { error: e } = await supabase.auth.verifyOtp({ email: cleanEmail(email), token, type: 'signup' });
    if (e) return fail(codeMessage(e), e);
    return { ok: true };
  });
}

/** Sends a new code: for sign-up ('signup-code') or password reset ('reset-code'). */
export function resendSignupCode(email: string, stage: 'signup-code' | 'reset-code' = 'signup-code') {
  return guard(async () => {
    const clean = cleanEmail(email);
    const { error: e } =
      stage === 'signup-code'
        ? await supabase.auth.resend({ type: 'signup', email: clean })
        : await supabase.auth.resetPasswordForEmail(clean);
    if (e) return fail(sendMessage(e), e);
    return { ok: true };
  });
}

/**
 * Forgot password: sends a reset code. The same next step whether or not
 * the address has an account ({ ok: true, stage: 'reset-code' }), so this
 * can't be used to find out who is on Dyuknow.
 */
export function requestPasswordReset(email: string) {
  return guard(async () => {
    const clean = cleanEmail(email);
    if (!looksLikeEmail(clean)) return fail(AUTH_MESSAGES.badEmail);
    const { error: e } = await supabase.auth.resetPasswordForEmail(clean);
    if (e && (e.status === 429 || isAuthRetryableFetchError(e))) return fail(sendMessage(e), e);
    return { ok: true, stage: 'reset-code' };
  });
}

/** The reset code plus a new password. Signed in on { ok: true }. */
export function verifyResetAndSetPassword(email: string, code: string, password: string, confirm: string) {
  return guard(async () => {
    const token = cleanCode(code);
    if (token.length !== CODE_LENGTH) return fail(AUTH_MESSAGES.wrongCode);
    const bad = checkNewPassword(password, confirm);
    if (bad) return fail(bad);
    const { error: v } = await supabase.auth.verifyOtp({ email: cleanEmail(email), token, type: 'recovery' });
    if (v) return fail(codeMessage(v), v);
    const { error: u } = await supabase.auth.updateUser({ password });
    if (u)
      return fail(
        u.code === 'same_password'
          ? AUTH_MESSAGES.samePassword
          : u.code === 'weak_password'
            ? AUTH_MESSAGES.weakPassword
            : AUTH_MESSAGES.noConnection,
        u,
      );
    return { ok: true };
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
