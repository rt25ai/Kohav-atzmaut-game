# Landing Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mandatory 1.5-second ceremonial intro overlay on the home page that uses the new branded image and then cleanly reveals the existing landing screen.

**Architecture:** Keep the intro scoped to the landing page by adding a dedicated overlay component inside the landing route instead of the global app shell. Extract the timing, asset path, and motion presets into a small pure helper module so we can verify the sequencing without a browser test runner, then wire the landing hero reveal to that helper so the underlying content enters only after the intro finishes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, Tailwind CSS, `tsx` verification scripts, existing `npm run build` verification.

---

## File Structure

- Create: `src/lib/landing/intro-sequence.ts`
  Responsibility: source of truth for intro duration, timeline windows, asset path, motion presets, and the landing hero reveal state.

- Create: `scripts/verify-landing-intro.tsx`
  Responsibility: assertion script that verifies intro timing boundaries, smoke-renders the overlay frame, and checks the landing hero reveal states without needing a browser runner.

- Create: `src/components/landing/landing-intro-overlay.tsx`
  Responsibility: fixed full-screen overlay for the ceremonial intro, including reduced-motion-aware rendering and the completion timer callback.

- Modify: `src/components/landing/landing-page.tsx`
  Responsibility: mount the intro overlay only on `/`, keep it local to the landing page, and delay the hero copy reveal until the overlay completes.

## Task 1: Add Intro Sequence Helper

**Files:**
- Create: `src/lib/landing/intro-sequence.ts`
- Create: `scripts/verify-landing-intro.tsx`

- [ ] **Step 1: Write the failing verification script**

```tsx
// scripts/verify-landing-intro.tsx
import assert from "node:assert/strict";

import {
  LANDING_INTRO_ASSET_PATH,
  LANDING_INTRO_TIMELINE,
  LANDING_INTRO_TOTAL_MS,
  getLandingIntroStage,
} from "../src/lib/landing/intro-sequence";

assert.equal(LANDING_INTRO_ASSET_PATH, "/branding/site-icon.png");
assert.equal(LANDING_INTRO_TOTAL_MS, 1_500);
assert.deepEqual(LANDING_INTRO_TIMELINE.exit, { delayMs: 1_200, durationMs: 300 });

assert.equal(getLandingIntroStage(0), "build");
assert.equal(getLandingIntroStage(199), "build");
assert.equal(getLandingIntroStage(200), "reveal");
assert.equal(getLandingIntroStage(899), "reveal");
assert.equal(getLandingIntroStage(900), "hold");
assert.equal(getLandingIntroStage(1_199), "hold");
assert.equal(getLandingIntroStage(1_200), "exit");
assert.equal(getLandingIntroStage(1_499), "exit");
assert.equal(getLandingIntroStage(1_500), "complete");

console.log("verify-landing-intro: PASS");
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: FAIL with a module resolution error because `src/lib/landing/intro-sequence.ts` does not exist yet.

- [ ] **Step 3: Write the minimal intro helper**

```ts
// src/lib/landing/intro-sequence.ts
export const LANDING_INTRO_ASSET_PATH = "/branding/site-icon.png";
export const LANDING_INTRO_TOTAL_MS = 1_500;

export const LANDING_INTRO_TIMELINE = {
  glow: { delayMs: 0, durationMs: 350 },
  emblem: { delayMs: 200, durationMs: 700 },
  hold: { delayMs: 900, durationMs: 300 },
  exit: { delayMs: 1_200, durationMs: 300 },
} as const;

export type LandingIntroStage =
  | "build"
  | "reveal"
  | "hold"
  | "exit"
  | "complete";

export function getLandingIntroStage(elapsedMs: number): LandingIntroStage {
  if (elapsedMs < LANDING_INTRO_TIMELINE.emblem.delayMs) {
    return "build";
  }

  if (elapsedMs < LANDING_INTRO_TIMELINE.hold.delayMs) {
    return "reveal";
  }

  if (elapsedMs < LANDING_INTRO_TIMELINE.exit.delayMs) {
    return "hold";
  }

  if (elapsedMs < LANDING_INTRO_TOTAL_MS) {
    return "exit";
  }

  return "complete";
}
```

- [ ] **Step 4: Run the script to verify it passes**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: PASS with output `verify-landing-intro: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/landing/intro-sequence.ts scripts/verify-landing-intro.tsx
git commit -m "test: add landing intro timeline helper"
```

## Task 2: Add The Intro Overlay Component

**Files:**
- Modify: `src/lib/landing/intro-sequence.ts`
- Modify: `scripts/verify-landing-intro.tsx`
- Create: `src/components/landing/landing-intro-overlay.tsx`

- [ ] **Step 1: Extend the verification script with a failing render smoke test**

```tsx
// append to scripts/verify-landing-intro.tsx
import { renderToStaticMarkup } from "react-dom/server";

import { LandingIntroOverlayFrame } from "../src/components/landing/landing-intro-overlay";

const fullMotionMarkup = renderToStaticMarkup(
  <LandingIntroOverlayFrame reduceMotion={false} />,
);
assert.match(fullMotionMarkup, /branding\/site-icon\.png/);
assert.match(fullMotionMarkup, /data-reduced-motion=\"false\"/);

const reducedMotionMarkup = renderToStaticMarkup(
  <LandingIntroOverlayFrame reduceMotion={true} />,
);
assert.match(reducedMotionMarkup, /data-reduced-motion=\"true\"/);
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: FAIL with a module resolution error because `src/components/landing/landing-intro-overlay.tsx` does not exist yet.

- [ ] **Step 3: Expand the helper and add the overlay component**

```ts
// append to src/lib/landing/intro-sequence.ts
const CEREMONIAL_EASE = [0.18, 0.72, 0.18, 1] as const;

export function getLandingIntroMotionPreset(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      overlay: {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 0, y: -12 },
        transition: {
          delay: LANDING_INTRO_TIMELINE.exit.delayMs / 1000,
          duration: LANDING_INTRO_TIMELINE.exit.durationMs / 1000,
          ease: "easeOut" as const,
        },
      },
      glow: {
        initial: { opacity: 0.36, scale: 0.96 },
        animate: { opacity: 0, scale: 1.04 },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          ease: "easeOut" as const,
        },
      },
      ring: {
        initial: { opacity: 0.48, scale: 0.92 },
        animate: { opacity: 0, scale: 1.06 },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          ease: "easeOut" as const,
        },
      },
      emblem: {
        initial: { opacity: 0, scale: 0.96, y: 16 },
        animate: {
          opacity: [0, 1, 1, 0],
          scale: [0.96, 1, 1, 1],
          y: [16, 0, 0, -12],
        },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          times: [0, 0.18, 0.8, 1],
          ease: "easeOut" as const,
        },
      },
    };
  }

  return {
    overlay: {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 0, y: -32 },
      transition: {
        delay: LANDING_INTRO_TIMELINE.exit.delayMs / 1000,
        duration: LANDING_INTRO_TIMELINE.exit.durationMs / 1000,
        ease: CEREMONIAL_EASE,
      },
    },
    glow: {
      initial: { opacity: 0, scale: 0.42 },
      animate: {
        opacity: [0, 1, 0.82, 0],
        scale: [0.42, 1, 1.06, 1.18],
      },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: [0, 0.24, 0.72, 1],
        ease: CEREMONIAL_EASE,
      },
    },
    ring: {
      initial: { opacity: 0, scale: 0.2 },
      animate: {
        opacity: [0, 0.86, 0],
        scale: [0.2, 1, 1.24],
      },
      transition: {
        duration: 1.2,
        ease: CEREMONIAL_EASE,
      },
    },
    emblem: {
      initial: {
        opacity: 0,
        scale: 0.24,
        rotate: -14,
        filter: "blur(18px)",
        y: 24,
      },
      animate: {
        opacity: [0, 1, 1, 0],
        scale: [0.24, 1.08, 0.98, 0.66],
        rotate: [-14, 4, 0, 0],
        filter: ["blur(18px)", "blur(0px)", "blur(0px)", "blur(0px)"],
        y: [24, 0, 0, -40],
      },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: [0, 0.24, 0.78, 1],
        ease: CEREMONIAL_EASE,
      },
    },
  };
}
```

```tsx
// src/components/landing/landing-intro-overlay.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import {
  LANDING_INTRO_ASSET_PATH,
  LANDING_INTRO_TOTAL_MS,
  getLandingIntroMotionPreset,
} from "@/lib/landing/intro-sequence";

type LandingIntroOverlayProps = {
  onComplete: () => void;
};

type LandingIntroOverlayFrameProps = {
  reduceMotion: boolean;
};

export function LandingIntroOverlayFrame({
  reduceMotion,
}: LandingIntroOverlayFrameProps) {
  const preset = getLandingIntroMotionPreset(reduceMotion);

  return (
    <motion.div
      aria-hidden="true"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      className="pointer-events-auto fixed inset-0 z-[80] overflow-hidden bg-[#030d22]"
      initial={preset.overlay.initial}
      animate={preset.overlay.animate}
      transition={preset.overlay.transition}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#061630_0%,#020914_100%)]" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,243,182,0.72),rgba(255,243,182,0.06)_68%)] blur-3xl"
        initial={preset.glow.initial}
        animate={preset.glow.animate}
        transition={preset.glow.transition}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffe7a6]/70"
        initial={preset.ring.initial}
        animate={preset.ring.animate}
        transition={preset.ring.transition}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[36px] bg-white/8 p-5 shadow-[0_30px_120px_rgba(255,231,166,0.24)] backdrop-blur-md sm:h-48 sm:w-48"
        initial={preset.emblem.initial}
        animate={preset.emblem.animate}
        transition={preset.emblem.transition}
      >
        <img
          src={LANDING_INTRO_ASSET_PATH}
          alt=""
          className="h-full w-full object-contain"
        />
      </motion.div>
    </motion.div>
  );
}

export function LandingIntroOverlay({ onComplete }: LandingIntroOverlayProps) {
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const timeoutId = window.setTimeout(onComplete, LANDING_INTRO_TOTAL_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onComplete]);

  return <LandingIntroOverlayFrame reduceMotion={reduceMotion} />;
}
```

- [ ] **Step 4: Run the verification script to verify it passes**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: PASS with output `verify-landing-intro: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/landing/intro-sequence.ts src/components/landing/landing-intro-overlay.tsx scripts/verify-landing-intro.tsx
git commit -m "feat: add landing intro overlay"
```

## Task 3: Integrate The Overlay Into The Landing Page

**Files:**
- Modify: `src/lib/landing/intro-sequence.ts`
- Modify: `scripts/verify-landing-intro.tsx`
- Modify: `src/components/landing/landing-page.tsx`

- [ ] **Step 1: Extend the verification script with a failing hero-reveal assertion**

```tsx
// append to scripts/verify-landing-intro.tsx
import { getLandingHeroReveal } from "../src/lib/landing/intro-sequence";

assert.deepEqual(getLandingHeroReveal(true), { opacity: 0, y: 28 });
assert.deepEqual(getLandingHeroReveal(false), { opacity: 1, y: 0 });
```

- [ ] **Step 2: Run the verification script to verify it fails**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: FAIL with an export error because `getLandingHeroReveal` does not exist yet.

- [ ] **Step 3: Add the hero reveal helper and wire the overlay into the landing page**

```ts
// append to src/lib/landing/intro-sequence.ts
export function getLandingHeroReveal(showIntro: boolean) {
  return showIntro ? { opacity: 0, y: 28 } : { opacity: 1, y: 0 };
}
```

```tsx
// src/components/landing/landing-page.tsx
import { LandingIntroOverlay } from "@/components/landing/landing-intro-overlay";
import { getLandingHeroReveal } from "@/lib/landing/intro-sequence";

export function LandingPage({ initialSnapshot }: LandingPageProps) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [name, setName] = useState("");
  const [participantType, setParticipantType] =
    useState<ParticipantType>("solo_male");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const heroReveal = getLandingHeroReveal(showIntro);

  return (
    <div className="space-y-10">
      {showIntro ? (
        <LandingIntroOverlay onComplete={() => setShowIntro(false)} />
      ) : null}

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <div className="relative min-h-[78svh]">
          <Image
            src={HERO_IMAGE}
            alt="אווירת יום העצמאות"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,21,47,0.24)_0%,rgba(8,40,81,0.44)_30%,rgba(7,31,61,0.68)_58%,rgba(8,27,54,0.75)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(140,213,255,0.40),transparent_30%)]" />
          <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-12 pt-32 sm:px-6 lg:px-8">
            <motion.div
              initial={false}
              animate={heroReveal}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm text-white/92 backdrop-blur-md">
                <Sparkles size={16} />
                משחק קהילתי חי ליום העצמאות
              </p>
              <h1 className="font-display text-4xl leading-[1.02] text-white sm:text-6xl">
                כוכב של עצמאות
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#eaf6ff] sm:text-lg">
                {data.settings.introText}
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run verification and build to verify everything passes**

Run: `node --import tsx scripts/verify-landing-intro.tsx`

Expected: PASS with output `verify-landing-intro: PASS`

Run: `npm run build`

Expected: SUCCESSFUL Next.js production build with no TypeScript errors caused by the intro integration.

- [ ] **Step 5: Commit**

```bash
git add src/lib/landing/intro-sequence.ts src/components/landing/landing-page.tsx scripts/verify-landing-intro.tsx
git commit -m "feat: add landing page intro reveal"
```

## Manual Verification

- Load `/` in the browser and confirm the intro overlay always appears on a fresh page load.
- Confirm the intro remains visible for about `1.5s`, then fully disappears.
- Confirm the landing hero copy begins its own reveal only after the overlay finishes.
- Confirm the player-name form and CTA buttons are clickable immediately after the overlay clears.
- Navigate to `/play`, `/summary`, `/leaderboard`, `/gallery`, and the admin route and confirm the intro does not replay there.
- Check both mobile and desktop widths to confirm the centered image stays crisp and does not crop awkwardly.

## Restore Point

A local rollback snapshot must exist before starting implementation:

- `.superpowers/restore-points/landing-intro-2026-04-18_20-26-34/manifest.json`
- `.superpowers/restore-points/landing-intro-2026-04-18_20-26-34/files/src/components/landing/landing-page.tsx`

If the feature needs to be reverted later, restore `landing-page.tsx` from that snapshot and delete the new files listed in the manifest.
