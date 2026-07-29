"use client";

import { useState } from "react";
import { GoogleG } from "@/components/ui/GoogleG";

interface LoginModalProps {
  onClose: () => void;
  onContinue: () => void;
}

export function LoginModal({ onClose, onContinue }: LoginModalProps) {
  const [signingIn, setSigningIn] = useState(false);

  function handleContinue() {
    setSigningIn(true);
    setTimeout(onContinue, 700);
  }

  return (
    <>
      <div
        onClick={signingIn ? undefined : onClose}
        className="animate-fade-in fixed inset-0 z-[80] bg-ink/[0.35]"
      />
      <div className="animate-view-in fixed inset-0 z-[81] flex items-center justify-center px-5">
        <div className="w-full max-w-[400px] rounded-[24px] bg-paper p-8 text-center shadow-[0_40px_110px_rgba(5,5,5,0.30)]">
          {signingIn ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 flex-none animate-spin rounded-full border-2 border-border border-t-ink" />
              <div className="text-sm font-semibold text-ink">Signing you in…</div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3.5">
                <GoogleG size={26} />
                <div className="text-lg font-semibold text-ink">Sign in with Google</div>
                <div className="text-[13px] text-muted">to continue to Dyuknow</div>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="mt-7 w-full cursor-pointer rounded-[14px] bg-ink px-4 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Continue with Google
              </button>
              <div className="mt-6 text-[11.5px] leading-[1.5] text-faint">
                By continuing, Google will share your name, email address and profile picture with Dyuknow.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 cursor-pointer text-[13px] font-semibold text-muted hover:opacity-72"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
