"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Side } from "@/lib/types";

const PERSONA: Record<Side, { name: string; email: string; mono: string }> = {
  venue: {
    name: "Jonathan Reeve",
    email: "jonathan@thelarkspur.co.uk",
    mono: "J",
  },
  talent: {
    name: "Camille Aubert",
    email: "camille.aubert@gmail.com",
    mono: "C",
  },
};

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.98 13.98 0 0 1 10.95 24c0-1.45.25-2.86.74-4.18v-5.7H4.34A21.98 21.98 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

interface GoogleSignInModalProps {
  side: Side;
  onClose: () => void;
  onContinue: () => void;
}

export function GoogleSignInModal({ side, onClose, onContinue }: GoogleSignInModalProps) {
  const [signingIn, setSigningIn] = useState(false);
  const persona = PERSONA[side];

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
                className="mt-7 flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-border px-4 py-3 text-left transition-colors hover:bg-mist"
              >
                <Avatar mono={persona.mono} size={38} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-ink">{persona.name}</span>
                  <span className="truncate text-[12.5px] text-muted">{persona.email}</span>
                </div>
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
