# Final Survey Results And Live Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the score-first admin experience with a live survey dashboard, let the admin officially freeze and publish final survey results, gracefully stop new answering after closure, and present all users with a festive final-results experience while photo uploads remain open.

**Architecture:** Introduce a dedicated survey runtime state that tracks `live`, `closing`, and `finalized` phases plus a frozen final survey snapshot. Keep the state derivation and banner precedence in shared helpers so local mode and Supabase mode behave the same, then feed that state into admin snapshot, public snapshot, answer submission, play flow, and the public results screen.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Framer Motion, Zod, Supabase Postgres/Realtime, Playwright verification scripts, existing repository abstraction.

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-19-final-survey-results-and-live-admin-dashboard-plan.md`
  Responsibility: approved execution plan for survey closure, final results, and admin dashboard changes.

- Create: `src/app/api/admin/survey-runtime/route.ts`
  Responsibility: admin-only endpoint for publishing frozen final survey results.

- Create: `src/components/admin/admin-live-survey-dashboard.tsx`
  Responsibility: compact live question-by-question percentages and participation overview for the admin console.

- Create: `src/components/admin/admin-player-monitor.tsx`
  Responsibility: participant operations table without score/rank framing.

- Create: `src/components/play/survey-closure-dialog.tsx`
  Responsibility: prompt shown after a player finishes their current in-flight screen once the survey is closed.

- Create: `src/components/results/final-results-hero.tsx`
  Responsibility: festive hero and official final-results framing for `/results` after closure.

- Create: `src/components/results/final-results-carousel.tsx`
  Responsibility: one-question-at-a-time final-results browser for the frozen official snapshot.

- Create: `scripts/verify-final-survey-runtime.ts`
  Responsibility: shared-state verification for phase transitions, frozen snapshots, banner priority, and late-answer exclusion.

- Create: `scripts/verify-admin-final-results-flow.ts`
  Responsibility: browser verification for admin dashboard replacement and finalization action.

- Create: `scripts/verify-public-final-results.ts`
  Responsibility: browser verification for system banner, closure prompt, and festive final-results mode.

- Modify: `src/lib/types.ts`
  Responsibility: add survey runtime, live survey overview, system banner, and final-result snapshot types.

- Modify: `src/lib/data/helpers.ts`
  Responsibility: derive live survey overview, final system banner precedence, and phase helpers.

- Modify: `src/lib/data/local-repository.ts`
  Responsibility: persist survey runtime in local mode and enforce closure behavior.

- Modify: `src/lib/data/supabase-repository.ts`
  Responsibility: persist survey runtime in Supabase mode and enforce the same closure behavior.

- Modify: `src/lib/data/index.ts`
  Responsibility: export new repository methods for survey runtime publishing.

- Modify: `src/app/api/admin/snapshot/route.ts`
  Responsibility: return the expanded admin snapshot with survey runtime data.

- Modify: `src/app/api/public/snapshot/route.ts`
  Responsibility: return the expanded public snapshot with system banner and final snapshot data.

- Modify: `src/app/api/game/answer/route.ts`
  Responsibility: surface closure-specific errors/state from `submitAnswer`.

- Modify: `src/app/api/game/mission/route.ts`
  Responsibility: surface closure-specific errors/state from `submitMission`.

- Modify: `src/app/api/game/results/route.ts`
  Responsibility: expose final results when published even if the player has not fully completed the game.

- Modify: `src/components/admin/admin-console.tsx`
  Responsibility: replace ranking-first UI with live survey dashboard, participant monitor, and finalization panel.

- Modify: `src/components/results/results-page.tsx`
  Responsibility: switch between live survey mode and festive final-results mode.

- Modify: `src/components/play/play-experience.tsx`
  Responsibility: detect survey closure, allow only the current screen to finish, then show the closure dialog instead of advancing.

- Modify: `src/components/shared/brand-header.tsx`
  Responsibility: render a generalized system banner rather than only host announcements.

- Modify: `src/components/shared/system-message-bar.tsx`
  Responsibility: support host banners and final-results banners through a generalized input type.

- Modify: `src/hooks/use-live-json.ts`
  Responsibility: keep exact transition refreshes stable for survey closure and finalization, if needed.

- Modify: `supabase/schema.sql`
  Responsibility: add the survey runtime state table plus realtime publication entry.

## Task 1: Add Failing Verification For Survey Runtime And Frozen Final Results

**Files:**
- Create: `scripts/verify-final-survey-runtime.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/helpers.ts`

- [ ] **Step 1: Write the failing runtime verification**

```ts
// scripts/verify-final-survey-runtime.ts
import assert from "node:assert/strict";

import {
  buildFinalSystemBanner,
  buildLiveSurveyOverview,
  createFrozenSurveySnapshot,
  getSurveyRuntimePhase,
  shouldAllowCurrentStepCompletionAfterClosure,
} from "../src/lib/data/helpers";
import type {
  LocalDatabase,
  PlayerRecord,
  SurveyRuntimeState,
} from "../src/lib/types";

const players: PlayerRecord[] = [
  {
    id: "p-live",
    name: "Tal",
    participantType: "solo_male",
    questionOrder: ["q1", "q2"],
    missionOrder: ["m1"],
    currentStepIndex: 1,
    totalScore: 0,
    correctAnswers: 0,
    photoMissionsCompleted: 0,
    newPeopleMet: 0,
    comboStreak: 0,
    completed: false,
    completedAt: null,
    createdAt: "2026-04-19T17:00:00.000Z",
    updatedAt: "2026-04-19T17:05:00.000Z",
    lastSeenAt: "2026-04-19T17:05:00.000Z",
    lastRank: null,
  },
];

const db: LocalDatabase = {
  settings: {
    introText: "",
    prizeLabels: { first: "", second: "", third: "" },
    globalSoundEnabled: true,
  },
  players,
  answers: [
    {
      id: "a1",
      playerId: "p-live",
      kind: "question",
      contentId: "q1",
      stepIndex: 0,
      status: "correct",
      answerOptionId: "a",
      responseMs: 1000,
      pointsAwarded: 0,
      caption: null,
      photoUrl: null,
      thumbnailUrl: null,
      missionTitle: null,
      newPeopleMet: 0,
      isFinalMission: false,
      createdAt: "2026-04-19T17:01:00.000Z",
    },
  ],
  photos: [],
  events: [],
  hostAnnouncements: [],
  questions: [
    {
      id: "q1",
      type: "mcq",
      title: "שאלה 1",
      prompt: "מה הכי מאפיין חיים במושב?",
      options: [{ id: "a", label: "קהילה קרובה" }, { id: "b", label: "שגרה רגועה" }, { id: "c", label: "איזון" }, { id: "d", label: "אחר" }],
      correctOptionId: "a",
      correctOptionIndex: 0,
      basePoints: 100,
    },
    {
      id: "q2",
      type: "mcq",
      title: "שאלה 2",
      prompt: "כמה אנשים צריך כדי לתקן משהו?",
      options: [{ id: "a", label: "אחד" }, { id: "b", label: "שניים" }, { id: "c", label: "כמה" }, { id: "d", label: "תלוי" }],
      correctOptionId: "a",
      correctOptionIndex: 0,
      basePoints: 100,
    },
  ],
  missions: [
    {
      id: "m1",
      type: "photo",
      title: "צילום 1",
      prompt: "צלמו משהו",
      basePoints: 100,
      isFinal: false,
    },
  ],
  surveyRuntime: {
    phase: "live",
    closedAt: null,
    finalizedAt: null,
    finalResultsSnapshot: null,
    finalBannerMessage: null,
  },
};

const frozen = createFrozenSurveySnapshot(db);
assert.equal(frozen.questionResults.length, 2);

const closingState: SurveyRuntimeState = {
  phase: "closing",
  closedAt: "2026-04-19T18:00:00.000Z",
  finalizedAt: null,
  finalResultsSnapshot: frozen,
  finalBannerMessage: "התוצאות הסופיות פורסמו",
};

assert.equal(getSurveyRuntimePhase(closingState), "closing");
assert.equal(buildLiveSurveyOverview(db).questionCount, 2);
assert.equal(
  shouldAllowCurrentStepCompletionAfterClosure({
    phase: "closing",
    playerCurrentStepIndex: 1,
    submittedStepIndex: 1,
  }),
  true,
);
assert.equal(
  shouldAllowCurrentStepCompletionAfterClosure({
    phase: "closing",
    playerCurrentStepIndex: 1,
    submittedStepIndex: 2,
  }),
  false,
);
assert.equal(
  buildFinalSystemBanner({
    surveyRuntime: closingState,
    activeHostAnnouncement: {
      id: "host-1",
      message: "באים לבמה",
      startedAt: "2026-04-19T17:59:00.000Z",
      endsMode: "until_next",
      endsAt: null,
    },
  })?.message,
  "התוצאות הסופיות פורסמו",
);

console.log("verify-final-survey-runtime: PASS");
```

- [ ] **Step 2: Run the verification and confirm it fails**

Run:

```bash
node --import tsx scripts/verify-final-survey-runtime.ts
```

Expected: FAIL because survey runtime types and helpers do not exist yet.

- [ ] **Step 3: Add the minimal shared types and helper functions**

Implement:

- `SurveyPhase`
- `SurveyRuntimeState`
- `LiveSurveyOptionOverview`
- `LiveSurveyQuestionOverview`
- `ActiveSystemBanner`
- `createFrozenSurveySnapshot()`
- `buildLiveSurveyOverview()`
- `shouldAllowCurrentStepCompletionAfterClosure()`
- `buildFinalSystemBanner()`

Keep the first helper pass intentionally small: just enough to satisfy the verification and define the public contract for later tasks.

- [ ] **Step 4: Re-run the runtime verification until it passes**

Run:

```bash
node --import tsx scripts/verify-final-survey-runtime.ts
```

Expected: `verify-final-survey-runtime: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/helpers.ts scripts/verify-final-survey-runtime.ts
git commit -m "test: cover final survey runtime"
```

## Task 2: Persist Survey Runtime And Enforce Frozen Finalization

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/local-repository.ts`
- Modify: `src/lib/data/supabase-repository.ts`
- Modify: `src/lib/data/index.ts`
- Modify: `supabase/schema.sql`
- Create: `src/app/api/admin/survey-runtime/route.ts`

- [ ] **Step 1: Add the runtime state to local and Supabase storage**

Extend the shared database/runtime shapes:

```ts
export type SurveyRuntimeState = {
  phase: "live" | "closing" | "finalized";
  closedAt: string | null;
  finalizedAt: string | null;
  finalResultsSnapshot: SurveyResultsSnapshot | null;
  finalBannerMessage: string | null;
};
```

Local mode:

```ts
function createInitialDatabase(): LocalDatabase {
  return {
    // existing fields...
    surveyRuntime: {
      phase: "live",
      closedAt: null,
      finalizedAt: null,
      finalResultsSnapshot: null,
      finalBannerMessage: null,
    },
  };
}
```

Supabase schema:

```sql
create table if not exists public.survey_runtime_state (
  id text primary key,
  phase text not null default 'live',
  closed_at timestamptz,
  finalized_at timestamptz,
  final_results_snapshot jsonb,
  final_banner_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_runtime_state
drop constraint if exists survey_runtime_state_phase_check;

alter table public.survey_runtime_state
add constraint survey_runtime_state_phase_check
check (phase in ('live', 'closing', 'finalized'));
```

- [ ] **Step 2: Add the failing finalization API behavior**

Create `src/app/api/admin/survey-runtime/route.ts` with a single `publish-final-results` action:

```ts
const schema = z.object({
  action: z.literal("publish-final-results"),
});
```

The route should call a new repository method:

```ts
const runtime = await repository.publishFinalSurveyResults();
return NextResponse.json({ runtime });
```

Run:

```bash
node --import tsx scripts/verify-admin-final-results-flow.ts
```

Expected: FAIL because the route and repository method do not exist yet.

- [ ] **Step 3: Implement the minimal repository finalization path**

Add repository methods:

- `getSurveyRuntime()`
- `publishFinalSurveyResults()`
- `maybeFinalizeClosedSurvey()`

Finalization rules:

- compute the frozen snapshot from current answers
- save it
- set `phase = "closing"`
- set `closedAt`
- populate `finalBannerMessage = "התוצאות הסופיות פורסמו"`
- append one admin event

If already not `live`, return the existing runtime and do not recompute.

- [ ] **Step 4: Enforce answer and mission submission rules**

Before normal step submission in both repositories:

```ts
if (runtime.phase === "finalized") {
  throw new Error("התוצאות הסופיות כבר פורסמו. אי אפשר לענות יותר.");
}

if (
  runtime.phase === "closing" &&
  !shouldAllowCurrentStepCompletionAfterClosure({
    phase: runtime.phase,
    playerCurrentStepIndex: player.currentStepIndex,
    submittedStepIndex: input.stepIndex,
  })
) {
  throw new Error("הסקר נסגר והתוצאות הסופיות פורסמו.");
}
```

Late in-flight submissions during `closing` may still write the answer/mission record, but they must never mutate `finalResultsSnapshot`.

- [ ] **Step 5: Re-run the runtime verification plus the new admin flow verification**

Run:

```bash
node --import tsx scripts/verify-final-survey-runtime.ts
node --import tsx scripts/verify-admin-final-results-flow.ts
```

Expected:

- `verify-final-survey-runtime: PASS`
- `verify-admin-final-results-flow: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/lib/data/index.ts src/app/api/admin/survey-runtime/route.ts supabase/schema.sql scripts/verify-admin-final-results-flow.ts
git commit -m "feat: add frozen survey finalization state"
```

## Task 3: Replace The Admin Leaderboard View With A Live Survey Dashboard

**Files:**
- Create: `src/components/admin/admin-live-survey-dashboard.tsx`
- Create: `src/components/admin/admin-player-monitor.tsx`
- Modify: `src/components/admin/admin-console.tsx`
- Modify: `src/app/api/admin/snapshot/route.ts`
- Modify: `src/lib/data/local-repository.ts`
- Modify: `src/lib/data/supabase-repository.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Extend admin snapshot with survey overview and runtime**

Add to `AdminSnapshot`:

```ts
export type AdminSnapshot = {
  // existing fields...
  surveyPhase: SurveyPhase;
  finalizedAt: string | null;
  finalSurveySnapshot: SurveyResultsSnapshot | null;
  liveSurveyOverview: {
    questionCount: number;
    answeredQuestionCount: number;
    questions: LiveSurveyQuestionOverview[];
  };
  playersFinishingCurrentStep: number;
};
```

Derive `liveSurveyOverview` server-side from the current answer pool using the helper from Task 1.

- [ ] **Step 2: Write the admin browser verification that proves the old score-first framing is gone**

Create `scripts/verify-admin-final-results-flow.ts` around these expectations:

```ts
assert.equal(await page.locator("text=מקום ראשון").count(), 0);
assert.equal(await page.locator("text=דשבורד סקר חי").count(), 1);
assert.equal(await page.locator("[data-admin-live-question-card]").count(), 2);
assert.equal(await page.locator("[data-admin-publish-final-results]").count(), 1);
```

Run:

```bash
node --import tsx scripts/verify-admin-final-results-flow.ts
```

Expected: FAIL until the admin UI is rewired.

- [ ] **Step 3: Build the two admin subcomponents**

`admin-live-survey-dashboard.tsx` should show:

- question prompt
- total answered
- skipped
- one row per option with percentage and vote count
- a `סופי` badge when `surveyPhase !== "live"`

`admin-player-monitor.tsx` should show:

- name
- state badge
- current step label
- answered questions
- uploaded photos
- last seen

Do not include `+100 / -100` controls in the new participant monitor.

- [ ] **Step 4: Recompose `admin-console.tsx` around survey operations**

Replace the old top KPI and leaderboard section with:

- survey status panel
- publish final results button
- live survey dashboard
- participant monitor

Keep:

- settings
- QR
- host mode
- photo management

- [ ] **Step 5: Re-run the admin verification**

Run:

```bash
node --import tsx scripts/verify-admin-final-results-flow.ts
```

Expected: `verify-admin-final-results-flow: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/admin-console.tsx src/components/admin/admin-live-survey-dashboard.tsx src/components/admin/admin-player-monitor.tsx src/lib/types.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts scripts/verify-admin-final-results-flow.ts
git commit -m "feat: replace admin leaderboard with survey dashboard"
```

## Task 4: Implement The Public Closure Prompt, Final Banner, And Festive Final Results Screen

**Files:**
- Create: `src/components/play/survey-closure-dialog.tsx`
- Create: `src/components/results/final-results-hero.tsx`
- Create: `src/components/results/final-results-carousel.tsx`
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/components/results/results-page.tsx`
- Modify: `src/components/shared/brand-header.tsx`
- Modify: `src/components/shared/system-message-bar.tsx`
- Modify: `src/app/api/public/snapshot/route.ts`
- Modify: `src/app/api/game/results/route.ts`
- Create: `scripts/verify-public-final-results.ts`

- [ ] **Step 1: Add the failing public verification**

Create `scripts/verify-public-final-results.ts` with these checks:

```ts
assert.equal(await page.locator("[data-system-message-bar]").count(), 1);
assert.equal(await page.locator("text=התוצאות הסופיות פורסמו").count(), 1);
assert.equal(await page.locator("[data-final-results-hero]").count(), 1);
assert.equal(await page.locator("[data-final-results-card]").count(), 1);
assert.equal(await page.locator("[data-survey-closure-dialog]").count(), 1);
```

Run:

```bash
node --import tsx scripts/verify-public-final-results.ts
```

Expected: FAIL because the public banner is still host-only and `/results` still renders only live mode.

- [ ] **Step 2: Generalize the public banner source**

Change the public snapshot shape so the header consumes:

```ts
activeSystemBanner: {
  type: "host" | "final-results";
  message: string;
  endsAt: string | null;
} | null
```

Banner priority:

- if `surveyPhase` is `closing` or `finalized`, use the final-results banner
- otherwise fall back to the active host announcement

Update `brand-header.tsx` and `system-message-bar.tsx` to consume this generalized banner.

- [ ] **Step 3: Add the closure dialog to the play flow**

In `play-experience.tsx`, after a successful question/mission submission:

```ts
if (result.session.surveyClosed) {
  setClosureDialogState({
    message: result.session.surveyClosedMessage,
    canViewFinalResults: result.session.canViewFinalResults,
  });
  return;
}
```

The dialog should present:

- `לתוצאות הסופיות`
- `לסיום המשחק שלי`

The second action routes to `/summary`; the first routes to `/results`.

- [ ] **Step 4: Split `/results` into live mode and festive final mode**

`results-page.tsx` should render:

- current live list when `surveyPhase === "live"`
- final festive mode using `finalSurveySnapshot` when `surveyPhase !== "live"`

The final mode must:

- show a hero with official-final wording
- use a question carousel or one-question view
- never say the results are still updating
- highlight the user's answer if a player id exists

- [ ] **Step 5: Re-run the public verification**

Run:

```bash
node --import tsx scripts/verify-public-final-results.ts
```

Expected: `verify-public-final-results: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/play/play-experience.tsx src/components/play/survey-closure-dialog.tsx src/components/results/results-page.tsx src/components/results/final-results-hero.tsx src/components/results/final-results-carousel.tsx src/components/shared/brand-header.tsx src/components/shared/system-message-bar.tsx src/app/api/public/snapshot/route.ts src/app/api/game/results/route.ts scripts/verify-public-final-results.ts
git commit -m "feat: add festive final survey results mode"
```

## Task 5: Full Verification And Production Deployment

**Files:**
- Modify: none

- [ ] **Step 1: Run the full focused local verification set**

Run:

```bash
node --import tsx scripts/verify-final-survey-runtime.ts
node --import tsx scripts/verify-admin-final-results-flow.ts
node --import tsx scripts/verify-public-final-results.ts
node --import tsx scripts/verify-summary-extra-photo.ts
node --import tsx scripts/verify-mobile-play.ts
```

Expected: all scripts pass.

- [ ] **Step 2: Run code quality checks**

Run:

```bash
npx eslint src/components/admin/admin-console.tsx src/components/admin/admin-live-survey-dashboard.tsx src/components/admin/admin-player-monitor.tsx src/components/play/play-experience.tsx src/components/play/survey-closure-dialog.tsx src/components/results/results-page.tsx src/components/results/final-results-hero.tsx src/components/results/final-results-carousel.tsx src/components/shared/brand-header.tsx src/components/shared/system-message-bar.tsx src/lib/types.ts src/lib/data/helpers.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/app/api/admin/survey-runtime/route.ts src/app/api/public/snapshot/route.ts src/app/api/game/answer/route.ts src/app/api/game/mission/route.ts src/app/api/game/results/route.ts scripts/verify-final-survey-runtime.ts scripts/verify-admin-final-results-flow.ts scripts/verify-public-final-results.ts
npm run build
npm run typecheck
```

Expected: all commands pass.

- [ ] **Step 3: Deploy to production**

Run:

```bash
npx vercel deploy --prod --yes
```

Expected: the deployment completes and aliases to `https://kochav-michael-game.vercel.app`.

- [ ] **Step 4: Re-run production verifications**

Run:

```bash
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-admin-final-results-flow.ts
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-public-final-results.ts
$env:VERIFY_BASE_URL='https://kochav-michael-game.vercel.app'; node --import tsx scripts/verify-summary-extra-photo.ts
```

Expected: all production checks pass and the live site stays `200`.

## Plan Self-Review

- Spec coverage: the plan covers admin dashboard replacement, official result freezing, closure grace behavior, final system banner precedence, festive final-results rendering, and preserving extra-photo uploads.
- Placeholder scan: no `TODO`, `TBD`, or vague "handle later" instructions remain.
- Type consistency: the plan uses one shared `SurveyRuntimeState`, one shared `SurveyPhase`, and one generalized `activeSystemBanner` path across admin, public, play, and results.
