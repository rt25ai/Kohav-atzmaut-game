# Summary Results Sheet And Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long summary results list with a mobile-friendly bottom sheet that shows one question at a time, add a single-bar chart for the player's own answer percentage, and expose a clear `new game` action from the summary screen without breaking post-game photo uploads.

**Architecture:** Keep all result calculation on the existing `SummarySnapshot` payload and derive a summary-specific view model in the client. Render the detailed survey experience in a dedicated bottom sheet with `scroll-snap` horizontal paging, while the main summary page stays focused on celebration, actions, and continued uploads. Clear only local resume state on restart so the player lands fresh on `/`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Framer Motion, existing local-session helpers, Playwright verification scripts.

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-19-summary-results-sheet-and-restart-plan.md`
  Responsibility: approved execution plan for the summary refactor.

- Create: `src/components/summary/summary-results-sheet.tsx`
  Responsibility: bottom-sheet shell, close action, horizontal paging container, and previous/next controls.

- Create: `src/components/summary/summary-results-card.tsx`
  Responsibility: render one summary question at a time, including skip state and short personal insight copy.

- Create: `src/components/summary/summary-single-bar-chart.tsx`
  Responsibility: render the one-column percentage chart for the player's own selected answer.

- Create: `scripts/verify-summary-results-sheet.ts`
  Responsibility: prove the bottom sheet opens, closes, pages horizontally, and the old long results section is gone from `/summary`.

- Modify: `src/components/summary/summary-page.tsx`
  Responsibility: swap the inline long results list for the new action row, bottom-sheet state, and restart action.

- Modify: `src/components/results/survey-results-list.tsx`
  Responsibility: expose a stable root data attribute so automation can prove the old long results list is absent from `/summary`.

- Modify: `src/lib/utils/local-session.ts`
  Responsibility: expose a small helper to clear active local resume state in one call.

- Modify: `scripts/verify-resume-flow.ts`
  Responsibility: cover the `new game` button path so restart clears local state and lands on `/`.

- Modify: `scripts/verify-summary-extra-photo.ts`
  Responsibility: confirm extra-photo uploads still work after the summary page refactor.

## Task 1: Add Failing Verification For The New Summary Results Experience

**Files:**
- Create: `scripts/verify-summary-results-sheet.ts`
- Modify: `scripts/verify-resume-flow.ts`

- [ ] **Step 1: Write the failing summary results sheet verification**

```ts
// scripts/verify-summary-results-sheet.ts
import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const playerId = "summary-results-sheet-test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: "kochav-michael-active-player", value: playerId },
  );

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Summary Results Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 7,
            comboStreak: 0,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          rank: 1,
          totalPlayers: 3,
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          leaderboard: [],
          survey: {
            playerId,
            completed: true,
            questionResults: [
              {
                questionId: "q1",
                questionTitle: "שאלה 1",
                prompt: "מה הכי מאפיין חיים במושב?",
                totalAnswered: 10,
                totalResponses: 12,
                skippedCount: 2,
                playerChoiceOptionId: "opt-a",
                playerComparison: "top-choice",
                topOptionIds: ["opt-a"],
                options: [
                  {
                    optionId: "opt-a",
                    label: "קהילה קרובה",
                    voteCount: 7,
                    percentage: 58,
                    isTopChoice: true,
                    isPlayerChoice: true,
                  },
                ],
              },
              {
                questionId: "q2",
                questionTitle: "שאלה 2",
                prompt: "כמה אנשים צריך במושב כדי לתקן משהו?",
                totalAnswered: 9,
                totalResponses: 12,
                skippedCount: 3,
                playerChoiceOptionId: null,
                playerComparison: "skipped",
                topOptionIds: ["opt-c"],
                options: [
                  {
                    optionId: "opt-c",
                    label: "כמה אנשים",
                    voteCount: 5,
                    percentage: 56,
                    isTopChoice: true,
                    isPlayerChoice: false,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  });

  await page.goto(`${baseUrl}/summary`, { waitUntil: "networkidle" });
  await page.locator("[data-summary-open-results]").click();
  await page.locator("[data-summary-results-sheet]").waitFor();

  assert.equal(await page.locator("[data-summary-result-card]").count(), 1);
  assert.equal(await page.locator("[data-summary-results-card-index]").textContent(), "1 / 2");
  assert.equal(await page.locator("[data-summary-single-bar]").count(), 1);
  assert.equal(await page.locator("[data-survey-results-list]").count(), 0);

  await page.locator("[data-summary-results-next]").click();
  await page.locator("[data-summary-results-card-index]").waitFor({ state: "visible" });
  assert.equal(await page.locator("[data-summary-results-card-index]").textContent(), "2 / 2");
  assert.equal(await page.locator("[data-summary-skip-state]").count(), 1);

  await page.locator("[data-summary-results-close]").click();
  await page.locator("[data-summary-results-sheet]").waitFor({ state: "hidden" });

  await browser.close();
  console.log("verify-summary-results-sheet: PASS");
}

void main();
```

- [ ] **Step 2: Run the new script and watch it fail**

Run:

```bash
node --import tsx scripts/verify-summary-results-sheet.ts
```

Expected: FAIL because the summary page does not yet expose the open/close controls, bottom sheet, or data attributes.

- [ ] **Step 3: Extend the resume verification with the restart path**

Add a restart scenario to `scripts/verify-resume-flow.ts`:

```ts
await page.goto(`${baseUrl}/summary`, { waitUntil: "networkidle" });
await page.locator("[data-summary-new-game]").click();
await page.waitForURL("**/");

const storageState = await page.evaluate(() => ({
  active: window.localStorage.getItem("kochav-michael-active-player"),
  session: window.localStorage.getItem("kochav-michael-active-session"),
}));

assert.equal(new URL(page.url()).pathname, "/");
assert.equal(storageState.active, null);
assert.equal(storageState.session, null);
```

- [ ] **Step 4: Run the resume verification and confirm the new assertion fails**

Run:

```bash
node --import tsx scripts/verify-resume-flow.ts
```

Expected: FAIL because `/summary` does not yet provide a `new game` button or clear the stored session.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-summary-results-sheet.ts scripts/verify-resume-flow.ts
git commit -m "test: add summary results sheet coverage"
```

## Task 2: Add The Minimal Summary-Specific UI Building Blocks

**Files:**
- Create: `src/components/summary/summary-single-bar-chart.tsx`
- Create: `src/components/summary/summary-results-card.tsx`
- Create: `src/components/summary/summary-results-sheet.tsx`

- [ ] **Step 1: Create the single-bar chart component**

```tsx
// src/components/summary/summary-single-bar-chart.tsx
type SummarySingleBarChartProps = {
  answerLabel: string;
  percentage: number;
};

export function SummarySingleBarChart({
  answerLabel,
  percentage,
}: SummarySingleBarChartProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
      <div className="flex min-h-[12rem] items-end justify-center rounded-[24px] bg-[#071427]/70 px-4 py-5">
        <div className="flex w-full max-w-[10rem] flex-col items-center gap-3">
          <span className="font-display text-3xl text-white">{percentage}%</span>
          <div className="flex h-40 w-full items-end justify-center rounded-[22px] border border-white/10 bg-white/6 p-3">
            <div
              data-summary-single-bar
              className="result-fill w-full rounded-[18px]"
              style={{ height: `${Math.max(18, percentage)}%` }}
            />
          </div>
          <p className="text-center text-sm leading-6 text-[var(--text-soft)]">
            {answerLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the per-question result card**

```tsx
// src/components/summary/summary-results-card.tsx
import type { SurveyQuestionResult } from "@/lib/types";

import { SummarySingleBarChart } from "@/components/summary/summary-single-bar-chart";

type SummaryResultsCardProps = {
  result: SurveyQuestionResult;
  index: number;
  total: number;
};

export function SummaryResultsCard({
  result,
  index,
  total,
}: SummaryResultsCardProps) {
  const playerChoice = result.options.find((option) => option.isPlayerChoice);

  return (
    <article
      data-summary-result-card
      className="w-full shrink-0 snap-center px-1"
      aria-label={`תוצאה ${index + 1} מתוך ${total}`}
    >
      <div className="stage-panel rounded-[30px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p data-summary-results-card-index className="section-kicker">
            {index + 1} / {total}
          </p>
          <p className="text-sm text-[var(--text-dim)]">{result.questionTitle}</p>
        </div>
        <h3 className="mt-4 font-display text-3xl leading-tight text-white">
          {result.prompt}
        </h3>

        {playerChoice ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-[var(--text-soft)]">
              בחרת: <span className="text-white">{playerChoice.label}</span>
            </p>
            <SummarySingleBarChart
              answerLabel={playerChoice.label}
              percentage={playerChoice.percentage}
            />
            <p className="text-sm leading-6 text-[var(--text-soft)]">
              {playerChoice.percentage}% בחרו כמוך
            </p>
          </div>
        ) : (
          <div
            data-summary-skip-state
            className="mt-5 rounded-[24px] border border-dashed border-white/18 bg-white/5 px-5 py-6 text-sm leading-7 text-[var(--text-soft)]"
          >
            דילגת על השאלה הזו, אז אין כאן עמודת השוואה להצגה.
          </div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create the bottom-sheet shell with horizontal paging**

```tsx
// src/components/summary/summary-results-sheet.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SummaryResultsCard } from "@/components/summary/summary-results-card";
import type { SurveyQuestionResult } from "@/lib/types";

type SummaryResultsSheetProps = {
  open: boolean;
  onClose: () => void;
  questionResults: SurveyQuestionResult[];
};

export function SummaryResultsSheet({
  open,
  onClose,
  questionResults,
}: SummaryResultsSheetProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const total = questionResults.length;

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!open || !viewport) {
      return;
    }

    const nextLeft = activeIndex * viewport.clientWidth;
    viewport.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, [activeIndex, open]);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;
  const activeQuestion = useMemo(
    () => questionResults[activeIndex] ?? null,
    [activeIndex, questionResults],
  );

  if (!total || !activeQuestion) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#031122d9] p-2 backdrop-blur-sm sm:p-4"
        >
          <motion.section
            data-summary-results-sheet
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="glass-panel absolute inset-x-0 bottom-0 mx-auto w-full max-w-4xl rounded-t-[32px] p-4 [overscroll-behavior:contain] sm:bottom-4 sm:rounded-[32px] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                data-summary-results-close
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="סגירת תוצאות"
              >
                <X size={20} />
              </button>
              <div className="text-right">
                <p className="text-sm text-[var(--text-dim)]">תוצאות הסקר</p>
                <p className="font-display text-2xl text-white">
                  {activeIndex + 1} / {total}
                </p>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="mt-4 flex snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:none]"
            >
              {questionResults.map((result, index) => (
                <SummaryResultsCard
                  key={result.questionId}
                  result={result}
                  index={index}
                  total={total}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                data-summary-results-next
                type="button"
                onClick={() => canGoNext && setActiveIndex((current) => current + 1)}
                disabled={!canGoNext}
                className="hero-button-primary inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 disabled:opacity-40"
              >
                <ArrowLeft size={18} />
                לשאלה הבאה
              </button>
              <button
                data-summary-results-prev
                type="button"
                onClick={() => canGoPrev && setActiveIndex((current) => current - 1)}
                disabled={!canGoPrev}
                className="hero-button-secondary inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 disabled:opacity-40"
              >
                <ArrowRight size={18} />
                לשאלה הקודמת
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run the new verification and confirm it still fails for integration reasons only**

Run:

```bash
node --import tsx scripts/verify-summary-results-sheet.ts
```

Expected: FAIL because the summary page is not yet wired to render the new components.

- [ ] **Step 5: Commit**

```bash
git add src/components/summary/summary-single-bar-chart.tsx src/components/summary/summary-results-card.tsx src/components/summary/summary-results-sheet.tsx
git commit -m "feat: add summary results sheet components"
```

## Task 3: Wire The Summary Page, Restart Action, And Regression Coverage

**Files:**
- Modify: `src/components/summary/summary-page.tsx`
- Modify: `src/components/results/survey-results-list.tsx`
- Modify: `src/lib/utils/local-session.ts`
- Modify: `scripts/verify-summary-extra-photo.ts`
- Modify: `scripts/verify-summary-results-sheet.ts`
- Modify: `scripts/verify-resume-flow.ts`

- [ ] **Step 1: Add a helper for clearing the local active game state**

```ts
// src/lib/utils/local-session.ts
export function clearStoredActiveGame(playerId?: string | null) {
  clearStoredPlayerId();
  clearStoredSessionSnapshot();

  if (playerId) {
    clearPendingUploadsForPlayer(playerId);
  }
}
```

- [ ] **Step 2: Replace the inline long results section with summary actions and the sheet**

Implement in `src/components/summary/summary-page.tsx`:

```tsx
const [resultsOpen, setResultsOpen] = useState(false);
const router = useRouter();

const restartGame = () => {
  clearStoredActiveGame(summary?.player.id ?? null);
  setResultsOpen(false);
  router.push("/");
};

const hasQuestionResults = (summary?.survey.questionResults.length ?? 0) > 0;
```

Render the new action row:

```tsx
<section className="stage-panel-soft rounded-[34px] p-6 sm:p-8">
  <div className="flex flex-wrap gap-3">
    {hasQuestionResults ? (
      <button
        data-summary-open-results
        type="button"
        onClick={() => setResultsOpen(true)}
        className="hero-button-primary rounded-full px-5 py-3"
      >
        הצגת התוצאות
      </button>
    ) : null}
    <button
      data-summary-new-game
      type="button"
      onClick={restartGame}
      className="hero-button-secondary rounded-full px-5 py-3"
    >
      משחק חדש
    </button>
    <Link href="/gallery" className="hero-button-secondary rounded-full px-5 py-3">
      לצפייה בגלריה
    </Link>
  </div>
</section>

<SummaryResultsSheet
  open={resultsOpen}
  onClose={() => setResultsOpen(false)}
  questionResults={summary.survey.questionResults}
/>
```

Also remove the old inline:

```tsx
<SurveyResultsList questionResults={summary.survey.questionResults} />
```
```

- [ ] **Step 3: Add a stable root selector to the legacy long-list component**

Wrap the root in `src/components/results/survey-results-list.tsx` with:

```tsx
<section data-survey-results-list className="space-y-4">
  {/* existing long-list content */}
</section>
```

- [ ] **Step 4: Keep the extra-photo regression covered after the refactor**

Adjust `scripts/verify-summary-extra-photo.ts` so it opens `/summary`, confirms the summary starts at the top, and asserts the new action row exists before uploading:

```ts
assert.equal(await page.locator("[data-summary-open-results]").count(), 1);
assert.equal(await page.locator("[data-summary-new-game]").count(), 1);
```

- [ ] **Step 5: Run the focused verification set until all pass**

Run:

```bash
node --import tsx scripts/verify-summary-results-sheet.ts
node --import tsx scripts/verify-summary-extra-photo.ts
node --import tsx scripts/verify-resume-flow.ts
```

Expected:

- `verify-summary-results-sheet: PASS`
- `verify-summary-extra-photo: PASS`
- `verify-resume-flow: PASS`

- [ ] **Step 6: Run final local verification**

Run:

```bash
npx eslint src/components/summary/summary-page.tsx src/components/summary/summary-results-sheet.tsx src/components/summary/summary-results-card.tsx src/components/summary/summary-single-bar-chart.tsx src/lib/utils/local-session.ts scripts/verify-summary-results-sheet.ts scripts/verify-summary-extra-photo.ts scripts/verify-resume-flow.ts
npm run typecheck
npm run build
```

Expected: all commands pass without new warnings or failures related to the touched files.

- [ ] **Step 7: Commit**

```bash
git add src/components/summary/summary-page.tsx src/components/results/survey-results-list.tsx src/lib/utils/local-session.ts scripts/verify-summary-results-sheet.ts scripts/verify-summary-extra-photo.ts scripts/verify-resume-flow.ts
git commit -m "feat: redesign summary results flow"
```

## Task 4: Deploy And Verify Production

**Files:**
- Modify: none

- [ ] **Step 1: Deploy the approved branch to production**

Run:

```bash
vercel deploy --prod --yes
```

Expected: deployment completes and prints the production URL.

- [ ] **Step 2: Run production verification against the live site**

Run:

```bash
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-summary-results-sheet.ts
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-summary-extra-photo.ts
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-resume-flow.ts
```

Expected:

- `verify-summary-results-sheet: PASS`
- `verify-summary-extra-photo: PASS`
- `verify-resume-flow: PASS`

- [ ] **Step 3: Final smoke check**

Open the live summary flow manually and confirm:

- `הצגת התוצאות` opens a bottom sheet
- one question is visible at a time
- the `X` button closes the sheet
- `משחק חדש` returns to the landing page
- the extra-photo form is still available on the summary page

## Plan Self-Review

- Spec coverage: the plan covers the bottom-sheet results viewer, one-question-at-a-time horizontal navigation, the one-column personal graph, the close button, and the `new game` restart flow while preserving extra-photo uploads.
- Placeholder scan: removed `TODO`/`TBD` placeholders and provided explicit commands, target files, and verification scripts.
- Type consistency: the plan keeps existing `SurveyQuestionResult` data intact, derives the summary UI from that type, and uses a single `clearStoredActiveGame()` helper for the restart flow.
