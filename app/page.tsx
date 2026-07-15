"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForkPanel } from "@/components/fork/ForkPanel";
import { GoogleSignInModal } from "@/components/fork/GoogleSignInModal";
import { ME } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/types";

// TODO: re-enable the once-per-tab-session gate (see git history) once the
// intro animation itself is signed off.
const skipIntro = false;

export default function ForkPage() {
  const [activeSide, setActiveSide] = useState<Side | null>(null);
  const { data } = useAppStore();
  const router = useRouter();

  function handleContinue() {
    if (!activeSide) return;
    const target = data.onboarded[activeSide] ? `/${activeSide}` : `/${activeSide}/onboarding`;
    router.push(target);
  }

  return (
    <div className={cn("flex min-h-screen flex-col bg-paper", skipIntro && "no-intro")}>
      <div className="intro-header flex flex-col items-center gap-[7px] px-6 pb-2 pt-[30px]">
        <div className="intro-wordmark font-serif text-[29px] tracking-[-0.01em]">Dyuknow</div>
        <div className="intro-tagline mt-3.5 font-serif text-[19px] italic text-muted">
          Which side of the pass are you on?
        </div>
      </div>
      <div className="intro-panels flex flex-1 flex-col gap-3.5 px-4 pb-[26px] pt-[18px] lg:flex-row lg:gap-5 lg:px-8 lg:pb-9">
        <ForkPanel
          onClick={() => setActiveSide("venue")}
          eyebrow="Venue"
          heading="I'm short for service"
          body="Book vetted, verified talent — a Guest Chef Everywhere for the weekend, a Sommelier for one service, a residency."
          avatarMono="L"
          avatarPhoto={ME.venue.photo}
          continueLabel="Continue as The Larkspur"
          subLabel="One Michelin star · Mayfair"
        />
        <ForkPanel
          onClick={() => setActiveSide("talent")}
          dark
          eyebrow="Talent"
          heading={
            <>
              I&rsquo;m available
              <br />
              to work
            </>
          }
          body="Take the pass at rooms worth your name — a service, a weekend, a residency. Never a job board."
          avatarMono="C"
          avatarPhoto={ME.talent.photo}
          continueLabel="Continue as Camille Aubert"
          subLabel="Chef Everywhere · Verified member"
        />
      </div>
      {activeSide && (
        <GoogleSignInModal side={activeSide} onClose={() => setActiveSide(null)} onContinue={handleContinue} />
      )}
    </div>
  );
}
