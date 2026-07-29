"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/landing/LoginModal";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Why Dyuknow" },
  { href: "#roles", label: "Team members" },
];

const TICKER_ITEMS = [
  { value: "500+", label: "Partner Venues" },
  { value: "2,000+", label: "Vetted Team Members" },
  { value: "60 min", label: "Average Fill Time" },
  { value: "98%", label: "Compliance Rate" },
  { value: "4.9", label: "Venue Rating" },
  { value: "London", label: "Made for", labelFirst: true },
];

const STATS = [
  { num: "60", suffix: "min", label: "Average time to fill an open shift" },
  { num: "500", suffix: "+", label: "Partner venues across London" },
  { num: "98", suffix: "%", label: "Team members compliance verified" },
  { num: "4.9", suffix: "★", label: "Average rating from venues" },
];

const HOW_STEPS = {
  venues: [
    {
      t: "Post your shift",
      p: "Role, date, location, any special requirements. Your shift is live in under two minutes.",
    },
    {
      t: "Get matched",
      p: "We instantly surface available, vetted team members near your venue who fit the role exactly.",
    },
    {
      t: "Confirm & run service",
      p: "Accept your pick. Compliance is pre-verified, so they arrive briefed and ready to work.",
    },
  ],
  staff: [
    {
      t: "Build your profile",
      p: "Show your experience, credentials and availability. Our team personally reviews and verifies every application.",
    },
    {
      t: "Browse shifts near you",
      p: "See real-time shifts at London's best venues, filtered by role, location and when you actually want to work.",
    },
    {
      t: "Work & get paid",
      p: "Accept a shift, show up, do great work. Payment is processed promptly — no chasing invoices.",
    },
  ],
} as const;

const FEATURES = [
  {
    t: "Speed of booking",
    p: "Whether it's 48 hours ahead or a same-day emergency, Dyuknow matches your shift to available, vetted team members in real time. Your doors stay open and your service stays covered.",
    stat: "Average shift filled in 60 minutes",
    icon: (
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    ),
  },
  {
    t: "Curation & vetting",
    p: "Every team member is personally reviewed — work history, skills, references and an in-person assessment. Fewer than 20% of applicants make it on. That's the point.",
    stat: "Top 20% of applicants accepted",
    icon: (
      <>
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    t: "Location matching",
    p: "Our availability engine knows which team members are near your venue, free for your shift and ready to commit. GPS-matched with instant confirmation — no calls, no delays.",
    stat: "Real-time coverage across London",
    icon: (
      <>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
  },
  {
    t: "Full compliance",
    p: "Right to work, DBS checks, food hygiene certificates, liability insurance and HMRC requirements — all verified before anyone walks through your door. Sorted, every time.",
    stat: "Fully insured & compliant, always",
    icon: (
      <>
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

const MARQUEE_PHOTOS = [
  { file: "hero1.jpg", alt: "A professional kitchen" },
  { file: "c2.jpg", alt: "A baker holding up a fresh loaf" },
  { file: "hero2.jpg", alt: "A chef plating a dish" },
  { file: "c3.jpg", alt: "A sommelier tasting white wine" },
  { file: "hero3.jpg", alt: "A front of house team member" },
  { file: "c4.jpg", alt: "A waiter setting a table" },
];

const ROLES = [
  {
    n: "01",
    t: "Chefs",
    p: "Executive chefs, sous chefs, pastry specialists and line cooks — from fine dining to high-volume events.",
    icon: (
      <>
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
        <line x1="6" y1="17" x2="18" y2="17" />
      </>
    ),
  },
  {
    n: "02",
    t: "Bartenders",
    p: "Mixologists, cocktail specialists and high-volume bar pros. Precision and speed behind every bar.",
    icon: (
      <>
        <path d="M8 22h8" />
        <path d="M9.09 15H7l-2-8h14l-2 8h-2.09" />
        <path d="M12 2v2" />
        <path d="M9 4l1 3" />
        <path d="M15 4l-1 3" />
      </>
    ),
  },
  {
    n: "03",
    t: "Front of house",
    p: "Managers, hosts, waitstaff and event coordinators who keep the room running and guests happy.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    n: "04",
    t: "Sommeliers",
    p: "Wine professionals who lift the whole dining experience — with knowledge to back it up.",
    icon: (
      <>
        <path d="M8 22h8" />
        <path d="M12 11v11" />
        <path d="M5 7h14l-1 4H6L5 7z" />
        <path d="M3 7c0-1.66 4.03-3 9-3s9 1.34 9 3" />
      </>
    ),
  },
];

const TESTIMONIALS = [
  {
    text: "Dyuknow changed how we handle staffing for events. The quality of team members is consistently excellent — every single booking has been an asset to the team.",
    mono: "S",
    name: "Sarah M.",
    role: "Operations Director, Members Club, Mayfair",
  },
  {
    text: "I spent years dealing with agencies that didn't understand what we do. Dyuknow actually gets it. The venues I'm matched with are exactly the calibre I want on my CV.",
    mono: "J",
    name: "James R.",
    role: "Chef — 8 years experience",
  },
  {
    text: "We had a last-minute cancellation before a 200-cover dinner. Dyuknow filled the position in 45 minutes with a sommelier who absolutely delivered. Couldn't believe it.",
    mono: "A",
    name: "Alexandra K.",
    role: "F&B Manager, Restaurant Group",
  },
];

function IconIn({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function RoleIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [howTab, setHowTab] = useState<"venues" | "staff">("venues");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function openLogin() {
    setMobileOpen(false);
    setLoginOpen(true);
  }

  function handleLoggedIn() {
    router.push("/app");
  }

  return (
    <div className="bg-paper text-ink">
      {/* Mobile nav overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[199] flex flex-col items-center justify-center gap-7 bg-paper transition-opacity duration-200",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-8 top-6 cursor-pointer text-xl"
        >
          ✕
        </button>
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className="text-2xl font-bold tracking-[-0.01em]"
          >
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={openLogin}
          className="mt-4 cursor-pointer rounded-[14px] bg-ink px-8 py-3.5 text-xs font-bold uppercase tracking-[0.07em] text-white"
        >
          Login
        </button>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-[200] bg-paper/92 backdrop-blur-md transition-[padding,border-color] duration-300",
          scrolled ? "border-b border-border py-4" : "border-b border-transparent py-[22px]"
        )}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8">
          <a href="#" className="font-serif text-2xl tracking-[-0.01em]">
            Dyuknow
          </a>
          <ul className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={openLogin}
            className="hidden cursor-pointer rounded-xl bg-ink px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-white transition-transform hover:-translate-y-0.5 lg:inline-flex"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex flex-col gap-[5px] lg:hidden"
          >
            <span className="block h-[2px] w-[22px] bg-ink" />
            <span className="block h-[2px] w-[22px] bg-ink" />
            <span className="block h-[2px] w-[22px] bg-ink" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pb-[88px] pt-[144px] lg:px-8 lg:pt-[168px]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2.5 font-serif text-lg italic text-muted before:h-[9px] before:w-[9px] before:flex-none before:rounded-full before:bg-sage before:content-['']">
              Highly curated hospitality gigs · London
            </span>
            <h1 className="mt-7 text-[clamp(2.6rem,5.4vw,4.6rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              The <em className="font-serif text-[1.06em] font-normal italic">right people</em>, in the
              right place, <em className="font-serif text-[1.06em] font-normal italic">on time</em>.
            </h1>
            <p className="mt-6 max-w-[470px] text-base leading-[1.7] text-muted">
              Dyuknow connects hospitality professionals with premium venues. Vetted chefs, bartenders, sommeliers
              and front-of-house team members — matched to your shift in minutes. Every shift, every service,
              flawlessly run.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <button
                type="button"
                onClick={openLogin}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.07em] text-white transition-transform hover:-translate-y-0.5"
              >
                Login
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[24px] bg-mist p-8">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className="dot-pulse h-3 w-3 rounded-full bg-sage" /> Open
              </div>
              <div className="mb-5 text-[clamp(1.4rem,2.2vw,1.8rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.02em]">
                Bar Back —<br />
                Tonight 18:00
              </div>
              <div className="mb-7 flex items-center gap-2 text-sm text-muted">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Soho, London
              </div>
              <button className="w-full cursor-pointer rounded-xl bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.07em] text-white">
                Apply
              </button>
            </div>
            <div className="rounded-[24px] bg-mist p-8">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className="h-3 w-3 rounded-full bg-border" /> Filled
              </div>
              <div className="mb-5 text-[clamp(1.4rem,2.2vw,1.8rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.02em]">
                Sommelier —<br />
                Fri 19:30
              </div>
              <div className="mb-7 flex items-center gap-2 text-sm text-muted">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Mayfair, London
              </div>
              <span className="inline-flex items-center gap-2 rounded-[10px] bg-sage/[0.22] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em]">
                Filled in 42 minutes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline */}
      <section className="bg-mist py-24">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">The platform for</p>
          <h2 className="font-serif text-[clamp(2.3rem,5vw,4.2rem)] italic leading-[1.12] tracking-[-0.015em]">
            &ldquo;Do you know anyone
            <br />
            that <span className="relative whitespace-nowrap">can cover?</span>&rdquo;
          </h2>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden bg-ink py-[18px]">
        <div className="landing-marquee-track flex w-max animate-[marquee-x_22s_linear_infinite] gap-10">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex flex-none items-center gap-3">
              <div className="flex items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
                {item.labelFirst ? (
                  <>
                    {item.label} <b className="text-[13px] text-white">{item.value}</b>
                  </>
                ) : (
                  <>
                    <b className="text-[13px] text-white">{item.value}</b> {item.label}
                  </>
                )}
              </div>
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-sage" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section id="about" className="px-6 py-[104px] lg:px-8">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[24px] bg-mist px-8 py-10 transition-transform hover:-translate-y-1">
              <div className="mb-3 font-serif text-[clamp(2.8rem,4.2vw,3.8rem)] leading-none tracking-[-0.02em]">
                {s.num}
                <b className="font-serif font-normal italic text-sage">{s.suffix}</b>
              </div>
              <div className="text-sm leading-[1.5] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="px-6 pb-[104px] lg:px-8">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="aspect-[4/4.6] overflow-hidden rounded-[24px] bg-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/landing/c1.jpg"
              alt="A chef in his kitchen, mid-prep, holding up fresh pasta dough"
              className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 hover:scale-[1.03] hover:grayscale-0"
            />
          </div>
          <div>
            <p className="font-serif text-lg italic text-muted">What is Dyuknow</p>
            <h2 className="mt-4 mb-6 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
              A highly <em className="font-serif font-normal italic">curated</em> hospitality gig platform
            </h2>
            <p className="text-base leading-[1.75] text-muted">
              Dyuknow was built for venues that can&rsquo;t afford a bad shift. When someone calls in sick two hours
              before service, you need cover you can trust — not a stranger from a list. Every team member on
              Dyuknow is hand-vetted, skills-checked and referenced.
            </p>
            <p className="mt-5 text-base leading-[1.75] text-muted">
              For hospitality professionals, Dyuknow means working the venues you want, on the schedule you choose,
              with pay that&rsquo;s processed promptly. No agencies, no chasing, no guesswork.
            </p>
            <a
              href="#how"
              className="mt-8 inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 text-xs font-bold uppercase tracking-[0.07em] transition-colors hover:border-ink"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-mist px-6 py-[104px] lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 text-center">
            <p className="font-serif text-lg italic text-muted">Simple by design</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
              How Dyuknow <em className="font-serif font-normal italic">works</em>
            </h2>
          </div>

          <div className="mx-auto mb-14 flex w-fit rounded-xl border border-border bg-paper p-[5px]">
            <button
              type="button"
              onClick={() => setHowTab("venues")}
              className={cn(
                "rounded-[10px] px-7 py-2.5 text-sm font-medium transition-colors",
                howTab === "venues" ? "bg-ink text-white" : "text-muted hover:text-ink"
              )}
            >
              For venues
            </button>
            <button
              type="button"
              onClick={() => setHowTab("staff")}
              className={cn(
                "rounded-[10px] px-7 py-2.5 text-sm font-medium transition-colors",
                howTab === "staff" ? "bg-ink text-white" : "text-muted hover:text-ink"
              )}
            >
              For team members
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {HOW_STEPS[howTab].map((step, i) => (
              <div key={step.t} className="rounded-[20px] bg-paper p-9 transition-transform hover:-translate-y-1">
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-sage/[0.18] font-serif text-base italic">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mb-2.5 text-lg font-bold tracking-[-0.015em]">{step.t}</div>
                <p className="text-sm leading-[1.7] text-muted">{step.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-[104px] lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8">
            <p className="font-serif text-lg italic text-muted">Why Dyuknow</p>
            <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
              Built for shifts that <em className="font-serif font-normal italic">can&rsquo;t go wrong</em>
            </h2>
            <p className="mt-4 max-w-[520px] text-base leading-[1.7] text-muted">
              Four things we obsess over so you don&rsquo;t have to.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.t} className="rounded-[24px] bg-mist p-11 transition-transform hover:-translate-y-1">
                <div className="mb-6 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-ink text-white">
                  <IconIn>{f.icon}</IconIn>
                </div>
                <div className="mb-2.5 text-xl font-bold tracking-[-0.02em]">{f.t}</div>
                <p className="text-sm leading-[1.75] text-muted">{f.p}</p>
                <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 font-serif text-base italic text-muted before:h-[9px] before:w-[9px] before:flex-none before:rounded-full before:bg-sage before:content-['']">
                  {f.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo marquee */}
      <section className="pt-[104px]">
        <div className="mx-auto mb-12 max-w-[1200px] px-6 lg:px-8">
          <p className="font-serif text-lg italic text-muted">In action</p>
          <h2 className="mt-3.5 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
            Real people, <em className="font-serif font-normal italic">real shifts</em>
          </h2>
        </div>
        <div className="overflow-hidden pb-[104px]">
          <div className="landing-marquee-track flex w-max animate-[marquee-x_45s_linear_infinite] gap-5 hover:[animation-play-state:paused]">
            {[...MARQUEE_PHOTOS, ...MARQUEE_PHOTOS].map((photo, i) => {
              const isDuplicate = i >= MARQUEE_PHOTOS.length;
              return (
                <div
                  key={i}
                  className="aspect-[3/4] w-[clamp(230px,24vw,340px)] flex-none overflow-hidden rounded-[24px] bg-mist"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/landing/${photo.file}`}
                    alt={isDuplicate ? "" : photo.alt}
                    aria-hidden={isDuplicate || undefined}
                    className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 hover:scale-105 hover:grayscale-0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-mist px-6 py-[104px] lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <p className="font-serif text-lg italic text-muted">The roster</p>
          <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
            Every role, <em className="font-serif font-normal italic">covered</em>
          </h2>
          <p className="mt-4 max-w-[520px] text-base leading-[1.7] text-muted">
            From the kitchen to the floor — vetted team members across the roles that keep a service running.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div
                key={r.t}
                className="relative rounded-[24px] bg-paper p-8 transition-transform hover:-translate-y-1"
              >
                <span className="absolute right-7 top-6 font-serif text-lg italic text-faint">{r.n}</span>
                <div className="mb-6">
                  <RoleIcon>{r.icon}</RoleIcon>
                </div>
                <div className="mb-2 text-lg font-bold tracking-[-0.01em]">{r.t}</div>
                <p className="text-sm leading-[1.65] text-muted">{r.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-[104px] lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <p className="font-serif text-lg italic text-muted">What they say</p>
          <h2 className="mt-3.5 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
            Trusted on <em className="font-serif font-normal italic">both sides</em> of the pass
          </h2>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col rounded-[24px] bg-mist p-9 transition-transform hover:-translate-y-1">
                <p className="mb-8 flex-1 font-serif text-lg italic leading-[1.55]">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-sage text-sm font-extrabold">
                    {t.mono}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="mt-0.5 text-xs text-faint">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email signup */}
      <section className="bg-mist px-6 py-[104px] lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 rounded-[24px] bg-paper p-10 lg:grid-cols-2 lg:gap-16 lg:p-16">
            <div>
              <p className="mb-3.5 font-serif text-lg italic text-muted">Get in touch</p>
              <h2 className="mb-4 text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.025em]">
                Stay in <em className="font-serif font-normal italic">the loop</em>
              </h2>
              <p className="max-w-[420px] text-base leading-[1.7] text-muted">
                Whether you&rsquo;re a venue looking to hire or a professional looking for shifts — drop your email
                and we&rsquo;ll be in touch.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEmailSent(true);
              }}
              className="self-center"
            >
              <div className="flex gap-2.5 rounded-xl bg-mist p-1.5">
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  aria-label="Email address"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-faint"
                />
                <button
                  type="submit"
                  className="flex-none cursor-pointer whitespace-nowrap rounded-xl bg-ink px-6 py-3.5 text-xs font-bold uppercase tracking-[0.07em] text-white"
                >
                  Get In Touch
                </button>
              </div>
              <p className="mt-3.5 text-xs text-faint">We respect your privacy. No spam, ever.</p>
              {emailSent && (
                <div className="mt-4 flex items-center gap-2 font-serif text-base italic before:h-2.5 before:w-2.5 before:flex-none before:rounded-full before:bg-sage before:content-['']">
                  Thank you — we&rsquo;ll be in touch shortly.
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* CTA split */}
      <section id="cta" className="px-6 py-[104px] lg:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] bg-ink p-11 text-white lg:p-[72px]">
            <span className="mb-5 block font-serif text-lg italic text-sage">For venues</span>
            <h2 className="mb-5 text-[clamp(1.7rem,2.8vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.02em]">
              Fill any shift. Keep <em className="font-serif font-normal italic">your standard</em>.
            </h2>
            <p className="mb-9 max-w-[360px] text-sm leading-[1.7] text-white/65">
              Join London&rsquo;s most carefully curated staffing network. Post your first shift and see the
              difference vetting makes.
            </p>
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sage px-8 py-4 text-xs font-bold uppercase tracking-[0.07em] text-ink transition-transform hover:-translate-y-0.5"
            >
              Login
            </button>
          </div>
          <div className="rounded-[24px] bg-sage p-11 text-ink lg:p-[72px]">
            <span className="mb-5 block font-serif text-lg italic text-ink/55">For team members</span>
            <h2 className="mb-5 text-[clamp(1.7rem,2.8vw,2.4rem)] font-bold leading-[1.08] tracking-[-0.02em]">
              Good work deserves <em className="font-serif font-normal italic">good shifts</em>.
            </h2>
            <p className="mb-9 max-w-[360px] text-sm leading-[1.7] text-ink/65">
              Apply to join Dyuknow&rsquo;s curated roster. Work London&rsquo;s best venues on your schedule, on your
              terms.
            </p>
            <button
              type="button"
              onClick={openLogin}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.07em] text-white transition-transform hover:-translate-y-0.5"
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 pb-12 pt-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-14">
            <div>
              <div className="mb-4 font-serif text-xl tracking-[-0.02em]">Dyuknow</div>
              <p className="max-w-[250px] font-serif text-base italic leading-[1.6] text-muted">
                The right people, in the right place, on time.
              </p>
            </div>
            <div>
              <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">Platform</div>
              <ul className="flex flex-col gap-2.5">
                <li><a href="#how" className="text-sm text-muted hover:text-ink">How it works</a></li>
                <li><a href="#features" className="text-sm text-muted hover:text-ink">Why Dyuknow</a></li>
                <li><a href="#roles" className="text-sm text-muted hover:text-ink">Team members</a></li>
                <li><a href="#about" className="text-sm text-muted hover:text-ink">About us</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">For Venues</div>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <button type="button" onClick={openLogin} className="cursor-pointer text-sm text-muted hover:text-ink">
                    Post a shift
                  </button>
                </li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Pricing</a></li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Enterprise</a></li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Case studies</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">For Team Members</div>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <button type="button" onClick={openLogin} className="cursor-pointer text-sm text-muted hover:text-ink">
                    Apply now
                  </button>
                </li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Browse shifts</a></li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Vetting process</a></li>
                <li><a href="#" className="text-sm text-muted hover:text-ink">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 border-t border-border pt-10 sm:flex-row sm:justify-between">
            <div className="text-xs text-faint">
              © 2026 Dyuknow Ltd. All rights reserved. London, UK. &nbsp;·&nbsp;{" "}
              <a href="mailto:james@dyuknow.com" className="font-bold text-ink">
                james@dyuknow.com
              </a>
            </div>
            <div className="flex gap-7">
              <a href="#" className="text-xs text-faint hover:text-ink">Privacy Policy</a>
              <a href="#" className="text-xs text-faint hover:text-ink">Terms of Service</a>
              <a href="#" className="text-xs text-faint hover:text-ink">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onContinue={handleLoggedIn} />}
    </div>
  );
}
