# Resume, Mobile Stability, And Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make returning players resume automatically, keep mobile play and upload flows stable, fix participant-type grammar mismatches, and make the Israel-flag confetti clearly visible without reintroducing overflow.

**Architecture:** Keep the existing client-side `playerId` and cached session model, but make the landing page and header honor it consistently. Use small targeted client fixes for scroll-reset and upload stability, trust grammar-safe event messages from the repositories instead of flattening them into generic text, and expand the existing festive burst into a larger bounded overlay that still cannot block interaction.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, Tailwind CSS, localStorage session cache, existing fetch-based game APIs, Playwright verification scripts.

---

## File Structure

- Create: `docs/superpowers/specs/2026-04-19-resume-mobile-stability-and-grammar-design.md`
  Responsibility: approved design record for this phase.

- Create: `docs/superpowers/plans/2026-04-19-resume-mobile-stability-and-grammar-plan.md`
  Responsibility: implementation breakdown with TDD and verification steps.

- Create: `scripts/verify-resume-flow.ts`
  Responsibility: prove the home route auto-resumes to `/play` or `/summary` from stored local state.

- Create: `scripts/verify-live-event-copy.ts`
  Responsibility: prove participant-type live event wording stays correct for male, female, and family cases.

- Modify: `src/components/landing/landing-page.tsx`
  Responsibility: auto-resume from stored player state and stop showing a fresh-start-only mindset.

- Modify: `src/components/shared/brand-header.tsx`
  Responsibility: keep the home button from clearing active progress.

- Modify: `src/components/play/play-experience.tsx`
  Responsibility: scroll to top on step changes, reduce mobile upload jumpiness, and keep progress alive when returning.

- Modify: `src/components/summary/summary-page.tsx`
  Responsibility: scroll to top on entry and stay reachable for completed players.

- Modify: `src/components/summary/summary-extra-photo-form.tsx`
  Responsibility: stabilize the upload area so mobile reflow is minimal after choosing or posting photos.

- Modify: `src/components/shared/festive-burst.tsx`
  Responsibility: enlarge and redistribute flag-confetti visually without blocking taps.

- Modify: `src/app/globals.css`
  Responsibility: provide larger bounded confetti styling, reserve safe festive space, and avoid overflow.

- Modify: `src/lib/data/live-event-copy.ts`
  Responsibility: remain the shared grammar-safe wording source for player-specific event text.

- Modify: `scripts/verify-mobile-play.ts`
  Responsibility: assert top-of-screen behavior and no overflow after question transitions.

- Modify: `scripts/verify-summary-extra-photo.ts`
  Responsibility: assert summary upload stability and festive confetti visibility on mobile.

## Task 1: Add Failing Verification Coverage For Resume, Grammar, And Mobile Stability

**Files:**
- Create: `scripts/verify-resume-flow.ts`
- Create: `scripts/verify-live-event-copy.ts`
- Modify: `scripts/verify-mobile-play.ts`
- Modify: `scripts/verify-summary-extra-photo.ts`

- [ ] **Step 1: Write the failing resume verification**

```ts
// scripts/verify-resume-flow.ts
import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const sessionKey = "kochav-michael-active-player";
const snapshotKey = "kochav-michael-active-session";

async function verifyResume(completed: boolean, expectedPath: "/play" | "/summary") {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const playerId = completed ? "resume-summary-player" : "resume-play-player";

  await page.addInitScript(
    ({ activeKey, activeValue, cachedKey, cachedValue }) => {
      window.localStorage.setItem(activeKey, activeValue);
      window.localStorage.setItem(cachedKey, cachedValue);
    },
    {
      activeKey: sessionKey,
      activeValue: playerId,
      cachedKey: snapshotKey,
      cachedValue: JSON.stringify({
        player: {
          id: playerId,
          name: "Resume Test",
          participantType: "solo_male",
          currentStepIndex: completed ? 26 : 4,
          completed,
        },
      }),
    },
  );

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({
      json: {
        session: {
          player: {
            id: playerId,
            name: "Resume Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: completed ? 26 : 4,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 0,
            newPeopleMet: 0,
            comboStreak: 0,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          steps: [],
          currentStep: null,
          answers: [],
          leaderboard: [],
          questions: [],
          missions: [],
        },
      },
    });
  });

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Resume Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 0,
            comboStreak: 0,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          rank: 1,
          totalPlayers: 1,
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          leaderboard: [],
          survey: { playerId, completed: true, questionResults: [] },
        },
      },
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForURL(`**${expectedPath}`, { timeout: 10_000 });

  assert.equal(new URL(page.url()).pathname, expectedPath);
  await browser.close();
}

await verifyResume(false, "/play");
await verifyResume(true, "/summary");

console.log("verify-resume-flow: PASS");
```

- [ ] **Step 2: Write the failing grammar verification**

```ts
// scripts/verify-live-event-copy.ts
import assert from "node:assert/strict";

import {
  formatSurveyAnswerEventMessage,
  formatSurveyMomentumEventMessage,
} from "../src/lib/data/live-event-copy";

assert.match(
  formatSurveyAnswerEventMessage("אורי", "solo_male", "correct"),
  /בחר תשובה/,
);
assert.match(
  formatSurveyAnswerEventMessage("מיכל", "solo_female", "correct"),
  /בחרה תשובה/,
);
assert.match(
  formatSurveyAnswerEventMessage("משפחת טל", "family", "correct"),
  /בחרו תשובה/,
);
assert.match(
  formatSurveyMomentumEventMessage("אורי", "solo_male"),
  /בלט/,
);
assert.match(
  formatSurveyMomentumEventMessage("מיכל", "solo_female"),
  /בלטה/,
);
assert.match(
  formatSurveyMomentumEventMessage("משפחת טל", "family"),
  /בלטו/,
);

console.log("verify-live-event-copy: PASS");
```

- [ ] **Step 3: Extend the mobile play verification so it catches scroll carryover**

```ts
// add to scripts/verify-mobile-play.ts after answer selection succeeds
await page.evaluate(() => window.scrollTo({ top: 900, left: 0 }));
await page.locator("button.hero-button-primary").last().click();
await page.waitForTimeout(250);

const scrollAfterTransition = await page.evaluate(() => window.scrollY);
assert.ok(
  scrollAfterTransition <= 8,
  `Expected next step to open from the top, received scrollY=${scrollAfterTransition}`,
);
```

- [ ] **Step 4: Extend the summary upload verification so it catches festive visibility and scroll stability**

```ts
// add to scripts/verify-summary-extra-photo.ts before closing the browser
const summaryMetrics = await page.evaluate(() => {
  const confetti = document.querySelector("[data-festive-confetti]");
  const rect = confetti?.getBoundingClientRect() ?? null;
  return {
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
    confettiHeight: rect?.height ?? 0,
  };
});

assert.ok(summaryMetrics.scrollY <= 8, `Expected summary page to sit at the top, received scrollY=${summaryMetrics.scrollY}`);
assert.ok(
  summaryMetrics.confettiHeight >= summaryMetrics.viewportHeight * 0.35,
  `Expected visible festive confetti coverage, received ${summaryMetrics.confettiHeight}px for viewport ${summaryMetrics.viewportHeight}px`,
);
```

- [ ] **Step 5: Run the new and updated verifications to confirm they fail first**

Run:

```bash
node --import tsx scripts/verify-resume-flow.ts
node --import tsx scripts/verify-live-event-copy.ts
node --import tsx scripts/verify-mobile-play.ts
node --import tsx scripts/verify-summary-extra-photo.ts
```

Expected:

- `verify-resume-flow.ts` fails because the landing page still stays on `/`
- `verify-mobile-play.ts` fails because scroll is preserved between steps
- `verify-summary-extra-photo.ts` fails because the confetti height is too small and top-of-screen behavior is not enforced

- [ ] **Step 6: Commit the verification scaffolding**

```bash
git add scripts/verify-resume-flow.ts scripts/verify-live-event-copy.ts scripts/verify-mobile-play.ts scripts/verify-summary-extra-photo.ts
git commit -m "test: cover resume and mobile stability flows"
```

## Task 2: Implement Auto-Resume And Preserve Progress Through The Header

**Files:**
- Modify: `src/components/landing/landing-page.tsx`
- Modify: `src/components/shared/brand-header.tsx`

- [ ] **Step 1: Add landing-page session fetch helpers and resume state**

```ts
// add imports in src/components/landing/landing-page.tsx
import {
  clearStoredPlayerId,
  clearStoredSessionSnapshot,
  getStoredPlayerId,
  getStoredSessionSnapshot,
  setStoredPlayerId,
  setStoredSessionSnapshot,
} from "@/lib/utils/local-session";

async function fetchStoredSession(playerId: string) {
  const response = await fetch(`/api/game/session?playerId=${playerId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("session");
  }

  const json = (await response.json()) as { session: SessionSnapshot };
  return json.session;
}
```

```ts
// add state in LandingPage()
const [checkingResume, setCheckingResume] = useState(true);
```

- [ ] **Step 2: Write the landing-page auto-resume effect**

```ts
useEffect(() => {
  const storedPlayerId = getStoredPlayerId();
  if (!storedPlayerId) {
    setCheckingResume(false);
    return;
  }

  const cachedSession = getStoredSessionSnapshot();
  if (cachedSession?.player?.id === storedPlayerId) {
    setName(cachedSession.player.name);
    setParticipantType(cachedSession.player.participantType);
  }

  void fetchStoredSession(storedPlayerId)
    .then((storedSession) => {
      setStoredPlayerId(storedSession.player.id);
      setStoredSessionSnapshot(storedSession);

      if (storedSession.player.completed) {
        router.replace("/summary");
        return;
      }

      router.replace("/play");
    })
    .catch(() => {
      clearStoredPlayerId();
      clearStoredSessionSnapshot();
    })
    .finally(() => {
      setCheckingResume(false);
    });
}, [router]);
```

- [ ] **Step 3: Guard the landing form while resume is being checked**

```tsx
if (checkingResume) {
  return (
    <div className="stage-panel flex min-h-[60vh] items-center justify-center rounded-[34px]">
      <span className="text-sm text-[var(--text-soft)]">בודקים אם יש משחק שממתין לך...</span>
    </div>
  );
}
```

- [ ] **Step 4: Stop the header home action from clearing progress**

```ts
// replace the existing exitToHome logic in src/components/shared/brand-header.tsx
useEffect(() => {
  setCurrentPlayerId(getStoredPlayerId());
}, [pathname]);
```

```tsx
// remove onClick={exitToHome} from the home links and keep plain navigation
<Link
  href="/"
  className="hero-button-secondary inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.7rem] font-medium"
>
```

- [ ] **Step 5: Run the resume verification until it passes**

Run:

```bash
node --import tsx scripts/verify-resume-flow.ts
```

Expected: PASS with `verify-resume-flow: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/landing-page.tsx src/components/shared/brand-header.tsx
git commit -m "feat: auto resume returning players"
```

## Task 3: Reset Viewport On Step Changes And Stabilize Mobile Upload Areas

**Files:**
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/components/summary/summary-page.tsx`
- Modify: `src/components/summary/summary-extra-photo-form.tsx`

- [ ] **Step 1: Add a tiny viewport-reset helper inside the play component**

```ts
function scrollToViewportTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
```

- [ ] **Step 2: Use it on step changes and before routing to summary**

```ts
useEffect(() => {
  if (currentStepKey === "idle") {
    return;
  }

  requestAnimationFrame(() => {
    scrollToViewportTop();
  });
}, [currentStepKey]);
```

```ts
const advanceAfterOutcome = (nextSession: SessionSnapshot) => {
  setSession(nextSession);
  setStoredSessionSnapshot(nextSession);
  scrollToViewportTop();

  if (nextSession.player.completed) {
    play("celebration");
    router.push("/summary");
    return;
  }

  play("transition");
};
```

- [ ] **Step 3: Stabilize the mission and summary upload form layouts**

```tsx
// in src/components/play/play-experience.tsx keep a reserved feedback slot
<div className="mt-4 min-h-[5.5rem] sm:min-h-[6rem]">
  <FestiveBurst cue={festiveCue} scopeKey={currentStepKey} />
</div>
```

```tsx
// in src/components/summary/summary-extra-photo-form.tsx reserve status space
<div className="min-h-[5rem]">
  <FestiveBurst cue={cue} scopeKey={`summary-extra-${uploads.length}`} />
</div>
<div className="min-h-[2.25rem]">
  {successMessage ? (
    <p data-summary-extra-success aria-live="polite" className="text-sm text-[#d7f4ff]">
      {successMessage}
    </p>
  ) : null}
  {error ? (
    <p aria-live="polite" className="text-sm text-[#ffd9d9]">
      {error}
    </p>
  ) : null}
</div>
```

- [ ] **Step 4: Scroll the summary route to the top on entry**

```ts
useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}, []);
```

- [ ] **Step 5: Run the mobile play and summary upload verifications until they pass**

Run:

```bash
node --import tsx scripts/verify-mobile-play.ts
node --import tsx scripts/verify-summary-extra-photo.ts
```

Expected:

- `verify-mobile-play: PASS`
- `verify-summary-extra-photo: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/play/play-experience.tsx src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx
git commit -m "fix: stabilize mobile step and upload scrolling"
```

## Task 4: Make Confetti Clearly Visible And Keep Grammar Safe In Live Events

**Files:**
- Modify: `src/components/shared/festive-burst.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/landing/landing-page.tsx`
- Modify: `src/lib/data/live-event-copy.ts`

- [ ] **Step 1: Enlarge and redistribute the confetti burst**

```tsx
// update piece generation in src/components/shared/festive-burst.tsx
const pieces = useMemo(
  () =>
    Array.from({ length: visibleCue?.showConfetti ? 18 : 0 }, (_, index) => ({
      id: `${scopeKey}-${index}`,
      delay: index * 0.03,
      rotate: -24 + index * 4,
      xStart: index % 2 === 0 ? -18 : 18,
      xEnd: index % 2 === 0 ? 28 : -28,
      left: `${6 + ((index * 5) % 88)}%`,
    })),
  [scopeKey, visibleCue?.showConfetti],
);
```

```tsx
// apply left positioning to each motion span
style={{ left: piece.left }}
animate={{
  opacity: [0, 1, 0],
  y: [0, 80, 180],
  x: [piece.xStart, 0, piece.xEnd],
}}
transition={{
  duration: 1.15,
  delay: piece.delay,
  ease: "easeOut",
}}
```

- [ ] **Step 2: Update the festive CSS so the overlay occupies about half the local screen**

```css
.festive-burst {
  position: relative;
  pointer-events: none;
}

.festive-confetti {
  position: absolute;
  inset: 0 0 auto 0;
  width: 100%;
  height: min(48svh, 22rem);
  overflow: clip;
}

.festive-flag-piece {
  position: absolute;
  top: 0;
  width: 1.2rem;
  height: 0.85rem;
  border-radius: 0.25rem;
  background:
    linear-gradient(
      180deg,
      #ffffff 0 23%,
      #2b75d6 23% 36%,
      #ffffff 36% 64%,
      #2b75d6 64% 77%,
      #ffffff 77% 100%
    );
  box-shadow: 0 12px 30px rgba(31, 105, 214, 0.26);
}
```

- [ ] **Step 3: Stop flattening live events into generic non-grammar-safe copy**

```ts
// replace formatLiveEventMessage in src/components/landing/landing-page.tsx
function formatLiveEventMessage(event: GameEventRecord) {
  return event.message?.trim() || "הקהילה ממשיכה לשחק יחד";
}
```

- [ ] **Step 4: Run the grammar verification and the festive helper verification**

Run:

```bash
node --import tsx scripts/verify-live-event-copy.ts
node --import tsx scripts/verify-festive-feedback.ts
```

Expected:

- `verify-live-event-copy: PASS`
- `verify-festive-feedback: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/festive-burst.tsx src/app/globals.css src/components/landing/landing-page.tsx src/lib/data/live-event-copy.ts
git commit -m "fix: improve festive visibility and live event grammar"
```

## Task 5: Final Verification And Production Deployment

**Files:**
- Modify: any touched files from prior tasks

- [ ] **Step 1: Run the targeted local verification suite**

Run:

```bash
node --import tsx scripts/verify-resume-flow.ts
node --import tsx scripts/verify-live-event-copy.ts
node --import tsx scripts/verify-festive-feedback.ts
node --import tsx scripts/verify-mobile-home.ts
node --import tsx scripts/verify-mobile-play.ts
node --import tsx scripts/verify-summary-extra-photo.ts
npm run typecheck
npx eslint src/components/landing/landing-page.tsx src/components/shared/brand-header.tsx src/components/play/play-experience.tsx src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx src/components/shared/festive-burst.tsx src/app/globals.css src/lib/data/live-event-copy.ts scripts/verify-resume-flow.ts scripts/verify-live-event-copy.ts scripts/verify-mobile-play.ts scripts/verify-summary-extra-photo.ts
```

Expected:

- all verify scripts print `PASS`
- `npm run typecheck` exits `0`
- `eslint` exits `0`

- [ ] **Step 2: Deploy to production**

Run:

```bash
vercel --prod --yes
```

Expected: successful production deployment with a live URL that aliases to `https://kochav-michael-game.vercel.app`

- [ ] **Step 3: Re-run the critical verifications against production**

Run:

```bash
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-resume-flow.ts
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-mobile-home.ts
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-mobile-play.ts
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-summary-extra-photo.ts
```

Expected:

- each script prints `PASS`
- the live site reflects resume, top-of-screen, and visible festive behavior

- [ ] **Step 4: Commit the finished implementation state**

```bash
git add docs/superpowers/plans/2026-04-19-resume-mobile-stability-and-grammar-plan.md src/components/landing/landing-page.tsx src/components/shared/brand-header.tsx src/components/play/play-experience.tsx src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx src/components/shared/festive-burst.tsx src/app/globals.css src/lib/data/live-event-copy.ts scripts/verify-resume-flow.ts scripts/verify-live-event-copy.ts scripts/verify-mobile-play.ts scripts/verify-summary-extra-photo.ts
git commit -m "fix: improve resume and mobile play stability"
```

## Self-Review

### Spec coverage

- Auto-resume to `/play` and `/summary`: covered by Task 2 and verified in Task 1.
- Header home no longer clears progress: covered by Task 2.
- Correct male/female/family phrasing: covered by Task 4 and verified in Task 1.
- Larger visible confetti: covered by Task 4 and verified in Task 1 and Task 5.
- Upload stability and top-of-screen behavior: covered by Task 3 and verified in Task 1 and Task 5.
- Android and iPhone validation: covered by existing mobile scripts in Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or “handle appropriately” placeholders remain.
- Every task has concrete files, commands, and expected outcomes.

### Type consistency

- Resume flow uses existing `SessionSnapshot` and `SummarySnapshot`.
- Verification files target the existing localStorage keys from `src/lib/config.ts`.
- Grammar verification uses the exported helpers from `src/lib/data/live-event-copy.ts`.
