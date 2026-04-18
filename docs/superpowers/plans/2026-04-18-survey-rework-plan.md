# Survey Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app from trivia gameplay into `כוכבניק - סקר הכי ישראלי שיש`, keeping the current question bank and photo missions while replacing score/rank/correctness with post-completion survey results and a gated live results screen.

**Architecture:** Keep the existing run structure and answer storage, but add a survey-results aggregation layer that derives percentages and player comparison from saved answers. Rework the play, summary, landing, and header surfaces to stop presenting the app as a competition, then add a dedicated `/results` route that is unlocked only for completed players and reuses the same aggregation payload as the summary reveal.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing local/Supabase repository abstraction, Framer Motion, `tsx` verification scripts, ESLint, TypeScript, Next.js build.

---

## File Structure

- Create: `src/lib/game/survey-results.ts`
  Responsibility: aggregate saved answers into per-question counts, percentages, top-option markers, and player-specific comparison state.

- Create: `scripts/verify-survey-results.ts`
  Responsibility: run deterministic verification of the survey aggregation and results gating helpers without a browser runner.

- Create: `src/components/results/results-page.tsx`
  Responsibility: render the gated live results view for completed players using saved player identity and live survey payloads.

- Create: `src/app/results/page.tsx`
  Responsibility: route entry point for the dedicated live results page.

- Create: `src/app/api/game/results/route.ts`
  Responsibility: return gated, player-aware survey results for completed players only.

- Modify: `src/lib/types.ts`
  Responsibility: add survey-results domain types while keeping backward-compatible legacy fields for this phase.

- Modify: `src/lib/data/helpers.ts`
  Responsibility: build survey snapshots/results and expose helpers reusable by both local and Supabase repositories.

- Modify: `src/lib/data/local-repository.ts`
  Responsibility: stop grading answers competitively in local mode and return survey-oriented summary/results payloads.

- Modify: `src/lib/data/supabase-repository.ts`
  Responsibility: mirror the same survey-oriented behavior in Supabase mode.

- Modify: `src/lib/data/index.ts`
  Responsibility: expose `getSurveyResults` from the repository abstraction.

- Modify: `src/app/api/game/summary/route.ts`
  Responsibility: keep the summary endpoint but return the richer survey-based summary payload.

- Modify: `src/components/play/play-experience.tsx`
  Responsibility: remove points/rank/correctness UI, keep neutral answer confirmation, and fix the `newPeopleMet` input UX.

- Modify: `src/components/summary/summary-page.tsx`
  Responsibility: replace the competitive summary with the first survey-results reveal.

- Modify: `src/components/landing/landing-page.tsx`
  Responsibility: rename the experience, remove leaderboard-first framing, and point CTA flow toward survey results.

- Modify: `src/components/shared/brand-header.tsx`
  Responsibility: rename page titles and remove leaderboard-first labels.

- Modify: `src/components/leaderboard/leaderboard-page.tsx`
  Responsibility: either repurpose existing public leaderboard UI into a locked/guided survey entry or reduce it to a compatibility redirect until the new `/results` flow is primary.

- Modify: `src/app/leaderboard/page.tsx`
  Responsibility: keep the old route compatible during the transition, ideally redirecting or rendering the updated survey-first surface.

- Modify: `src/lib/content/default-bank.ts`
  Responsibility: update intro/admin text and game title framing while keeping the current questions for this phase.

## Task 1: Add Survey Result Types And Aggregation Helper

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/helpers.ts`
- Create: `src/lib/game/survey-results.ts`
- Create: `scripts/verify-survey-results.ts`

- [ ] **Step 1: Write the failing verification script**

```ts
// scripts/verify-survey-results.ts
import assert from "node:assert/strict";

import { buildSurveyQuestionResults } from "../src/lib/game/survey-results";
import type { PlayerAnswerRecord, Question } from "../src/lib/types";

const questions: Question[] = [
  {
    type: "mcq",
    id: "q-1",
    title: "1",
    prompt: "שאלת בדיקה",
    options: [
      { id: "a", label: "כן" },
      { id: "b", label: "לא" },
      { id: "c", label: "אולי" },
      { id: "d", label: "אחר" },
    ],
    correctOptionId: "a",
    correctOptionIndex: 0,
    basePoints: 100,
  },
];

const answers: PlayerAnswerRecord[] = [
  {
    id: "a1",
    playerId: "p1",
    kind: "question",
    contentId: "q-1",
    stepIndex: 0,
    status: "correct",
    answerOptionId: "a",
    responseMs: 1200,
    pointsAwarded: 100,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-18T10:00:00.000Z",
  },
  {
    id: "a2",
    playerId: "p2",
    kind: "question",
    contentId: "q-1",
    stepIndex: 0,
    status: "wrong",
    answerOptionId: "b",
    responseMs: 1300,
    pointsAwarded: 0,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-18T10:01:00.000Z",
  },
  {
    id: "a3",
    playerId: "p3",
    kind: "question",
    contentId: "q-1",
    stepIndex: 0,
    status: "wrong",
    answerOptionId: "a",
    responseMs: 1500,
    pointsAwarded: 0,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-18T10:02:00.000Z",
  },
];

const [result] = buildSurveyQuestionResults({
  questions,
  answers,
  playerId: "p2",
});

assert.equal(result.questionId, "q-1");
assert.equal(result.totalAnswered, 3);
assert.equal(result.playerChoiceOptionId, "b");
assert.equal(result.topOptionIds.join(","), "a");
assert.equal(result.options.find((option) => option.optionId === "a")?.voteCount, 2);
assert.equal(result.options.find((option) => option.optionId === "a")?.percentage, 67);
assert.equal(result.options.find((option) => option.optionId === "b")?.percentage, 33);
assert.equal(result.playerComparison, "minority");

console.log("verify-survey-results: PASS");
```

- [ ] **Step 2: Run the verification script to verify it fails**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: FAIL with a module resolution error because `src/lib/game/survey-results.ts` does not exist yet.

- [ ] **Step 3: Add the survey result types and minimal aggregation helper**

```ts
// append to src/lib/types.ts
export type SurveyPlayerComparison = "top-choice" | "minority" | "unique" | "skipped";

export type SurveyOptionResult = {
  optionId: OptionId;
  label: string;
  voteCount: number;
  percentage: number;
  isTopChoice: boolean;
  isPlayerChoice: boolean;
};

export type SurveyQuestionResult = {
  questionId: string;
  questionTitle: string;
  prompt: string;
  totalAnswered: number;
  totalResponses: number;
  skippedCount: number;
  playerChoiceOptionId: OptionId | null;
  playerComparison: SurveyPlayerComparison;
  topOptionIds: OptionId[];
  options: SurveyOptionResult[];
};

export type SurveyResultsSnapshot = {
  playerId: string;
  completed: boolean;
  questionResults: SurveyQuestionResult[];
};
```

```ts
// src/lib/game/survey-results.ts
import type {
  OptionId,
  PlayerAnswerRecord,
  Question,
  SurveyPlayerComparison,
  SurveyQuestionResult,
} from "@/lib/types";

function roundPercentage(value: number) {
  return Math.round(value);
}

function getPlayerComparison(
  playerChoiceOptionId: OptionId | null,
  topOptionIds: OptionId[],
  playerVoteCount: number,
): SurveyPlayerComparison {
  if (!playerChoiceOptionId) {
    return "skipped";
  }

  if (topOptionIds.includes(playerChoiceOptionId)) {
    return "top-choice";
  }

  if (playerVoteCount <= 1) {
    return "unique";
  }

  return "minority";
}

export function buildSurveyQuestionResults({
  questions,
  answers,
  playerId,
}: {
  questions: Question[];
  answers: PlayerAnswerRecord[];
  playerId: string;
}): SurveyQuestionResult[] {
  return questions.map((question) => {
    const questionAnswers = answers.filter(
      (answer) => answer.kind === "question" && answer.contentId === question.id,
    );
    const answered = questionAnswers.filter((answer) => answer.answerOptionId !== null);
    const totalAnswered = answered.length;
    const playerAnswer =
      questionAnswers.find((answer) => answer.playerId === playerId) ?? null;
    const playerChoiceOptionId = playerAnswer?.answerOptionId ?? null;

    const counts = new Map<OptionId, number>();
    question.options.forEach((option) => counts.set(option.id, 0));
    answered.forEach((answer) => {
      const optionId = answer.answerOptionId;
      if (optionId) {
        counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
      }
    });

    const topVoteCount = Math.max(0, ...question.options.map((option) => counts.get(option.id) ?? 0));
    const topOptionIds = question.options
      .filter((option) => (counts.get(option.id) ?? 0) === topVoteCount && topVoteCount > 0)
      .map((option) => option.id);
    const playerVoteCount = playerChoiceOptionId ? counts.get(playerChoiceOptionId) ?? 0 : 0;

    return {
      questionId: question.id,
      questionTitle: question.title,
      prompt: question.prompt,
      totalAnswered,
      totalResponses: questionAnswers.length,
      skippedCount: questionAnswers.length - totalAnswered,
      playerChoiceOptionId,
      playerComparison: getPlayerComparison(playerChoiceOptionId, topOptionIds, playerVoteCount),
      topOptionIds,
      options: question.options.map((option) => {
        const voteCount = counts.get(option.id) ?? 0;
        return {
          optionId: option.id,
          label: option.label,
          voteCount,
          percentage: totalAnswered === 0 ? 0 : roundPercentage((voteCount / totalAnswered) * 100),
          isTopChoice: topOptionIds.includes(option.id),
          isPlayerChoice: playerChoiceOptionId === option.id,
        };
      }),
    };
  });
}
```

```ts
// append to src/lib/data/helpers.ts
import { buildSurveyQuestionResults } from "@/lib/game/survey-results";
import type { SurveyResultsSnapshot } from "@/lib/types";

export function buildSurveyResultsSnapshot(
  db: LocalDatabase,
  player: PlayerRecord,
): SurveyResultsSnapshot {
  return {
    playerId: player.id,
    completed: player.completed,
    questionResults: buildSurveyQuestionResults({
      questions: db.questions,
      answers: db.answers,
      playerId: player.id,
    }),
  };
}
```

- [ ] **Step 4: Run the verification script to verify it passes**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: PASS with output `verify-survey-results: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/helpers.ts src/lib/game/survey-results.ts scripts/verify-survey-results.ts
git commit -m "test: add survey results aggregation"
```

## Task 2: Rework Repository Summary And Add Gated Results Endpoint

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/helpers.ts`
- Modify: `src/lib/data/index.ts`
- Modify: `src/lib/data/local-repository.ts`
- Modify: `src/lib/data/supabase-repository.ts`
- Modify: `src/app/api/game/summary/route.ts`
- Create: `src/app/api/game/results/route.ts`

- [ ] **Step 1: Extend the verification script with a failing summary/results shape assertion**

```ts
// append to scripts/verify-survey-results.ts
import { buildSummarySnapshot } from "../src/lib/data/helpers";

const summary = buildSummarySnapshot(
  {
    settings: {
      introText: "intro",
      prizeLabels: { first: "", second: "", third: "" },
      globalSoundEnabled: true,
    },
    players: [
      {
        id: "p2",
        name: "Dana",
        participantType: "solo_female",
        questionOrder: ["q-1"],
        missionOrder: [],
        currentStepIndex: 1,
        totalScore: 0,
        correctAnswers: 0,
        photoMissionsCompleted: 0,
        newPeopleMet: 0,
        comboStreak: 0,
        completed: true,
        completedAt: "2026-04-18T10:05:00.000Z",
        createdAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:05:00.000Z",
        lastSeenAt: "2026-04-18T10:05:00.000Z",
        lastRank: null,
      },
    ],
    answers,
    photos: [],
    events: [],
    questions,
    missions: [],
  },
  {
    id: "p2",
    name: "Dana",
    participantType: "solo_female",
    questionOrder: ["q-1"],
    missionOrder: [],
    currentStepIndex: 1,
    totalScore: 0,
    correctAnswers: 0,
    photoMissionsCompleted: 0,
    newPeopleMet: 0,
    comboStreak: 0,
    completed: true,
    completedAt: "2026-04-18T10:05:00.000Z",
    createdAt: "2026-04-18T10:00:00.000Z",
    updatedAt: "2026-04-18T10:05:00.000Z",
    lastSeenAt: "2026-04-18T10:05:00.000Z",
    lastRank: null,
  },
);

assert.equal(summary.survey.questionResults.length, 1);
assert.equal(summary.survey.questionResults[0].playerChoiceOptionId, "b");
```

- [ ] **Step 2: Run the verification script to verify it fails**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: FAIL because `SummarySnapshot` and `buildSummarySnapshot` do not expose `survey` yet.

- [ ] **Step 3: Add summary survey data, repository access, and the gated results route**

```ts
// replace SummarySnapshot in src/lib/types.ts
export type SummarySnapshot = {
  player: PlayerRecord;
  settings: AdminSettings;
  survey: SurveyResultsSnapshot;
};
```

```ts
// update buildSummarySnapshot in src/lib/data/helpers.ts
export function buildSummarySnapshot(
  db: LocalDatabase,
  player: PlayerRecord,
): SummarySnapshot {
  return {
    player,
    settings: db.settings,
    survey: buildSurveyResultsSnapshot(db, player),
  };
}
```

```ts
// append to src/lib/data/index.ts
  getSurveyResults: IS_SUPABASE_ENABLED
    ? supabaseGetSurveyResults
    : localGetSurveyResults,
```

```ts
// append to src/lib/data/local-repository.ts
export async function localGetSurveyResults(playerId: string) {
  const db = await readDb();
  const player = findPlayerOrThrow(db, playerId);
  return buildSurveyResultsSnapshot(db, player);
}
```

```ts
// append to src/lib/data/supabase-repository.ts
export async function supabaseGetSurveyResults(playerId: string) {
  const client = getClient();
  const { settings, players, questions, missions, player, answers } =
    await fetchSessionDb(client, playerId);

  return buildSurveyResultsSnapshot(
    {
      settings,
      players,
      answers,
      photos: [],
      events: [],
      questions,
      missions,
    },
    player,
  );
}
```

```ts
// src/app/api/game/results/route.ts
import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "חסר מזהה שחקן" }, { status: 400 });
  }

  try {
    const results = await repository.getSurveyResults(playerId);

    if (!results.completed) {
      return NextResponse.json(
        { error: "תוצאות הסקר נפתחות רק אחרי שמסיימים" },
        { status: 403 },
      );
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "השחקן לא נמצא" }, { status: 404 });
  }
}
```

- [ ] **Step 4: Run the verification script to verify it passes**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: PASS with output `verify-survey-results: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/helpers.ts src/lib/data/index.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/app/api/game/results/route.ts src/app/api/game/summary/route.ts scripts/verify-survey-results.ts
git commit -m "feat: add survey summary and gated results api"
```

## Task 3: Remove Competitive Play UI And Fix Photo Mission Input

**Files:**
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/lib/content/default-bank.ts`

- [ ] **Step 1: Add a failing UI-focused assertion to the verification script**

```ts
// append to scripts/verify-survey-results.ts
import fs from "node:fs";

const playExperienceSource = fs.readFileSync(
  new URL("../src/components/play/play-experience.tsx", import.meta.url),
  "utf8",
);

assert.equal(playExperienceSource.includes("לחץ כדי לבחור תשובה"), false);
assert.equal(playExperienceSource.includes("בונוס מהירות פעיל"), false);
assert.equal(playExperienceSource.includes("קומבו נוכחי"), false);
```

- [ ] **Step 2: Run the verification script to verify it fails**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: FAIL because the competitive strings still exist in `play-experience.tsx`.

- [ ] **Step 3: Rewrite the play screen to survey-first behavior**

```tsx
// key edits in src/components/play/play-experience.tsx
const [newPeopleMet, setNewPeopleMet] = useState("");

const surveyReviewMessage =
  reviewState !== "idle" ? "הבחירה נשמרה. אפשר להמשיך לשאלה הבאה." : null;

// inside answerQuestion success branch
setReviewState("correct");
setRevealedCorrectOptionId(null);
setPendingSessionAfterReview(result.session);
setAwaitingContinue(true);

// inside question card header
<h2 className="font-display text-3xl text-[#0f254a]">
  שאלה {questionProgress.current}
</h2>

// answer meta helper default state
helperText: ""

// remove top stat pills for score/correct answers and keep neutral progress text only
<div className="flex flex-wrap gap-2 text-sm">
  <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-[#355682]">
    {questionProgress.current} מתוך {questionProgress.total} שאלות
  </div>
  <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-[#355682]">
    {session.player.photoMissionsCompleted} משימות צילום הושלמו
  </div>
</div>

// review message
{surveyReviewMessage ? (
  <div
    aria-live="polite"
    className="mt-6 rounded-[24px] bg-[#eef8ff] px-4 py-4 text-sm text-[#0f4d97] sm:text-base"
  >
    {surveyReviewMessage}
  </div>
) : null}

// newPeopleMet input
<input
  type="number"
  name="newPeopleMet"
  autoComplete="off"
  min={0}
  max={99}
  value={newPeopleMet}
  onChange={(event) => setNewPeopleMet(event.target.value)}
  placeholder="0"
  className="glass-panel h-14 w-full rounded-[22px] px-4 text-right text-[#123460]"
/>

// submitMission payload
newPeopleMet: Number(newPeopleMet || 0),
```

```ts
// update survey framing in src/lib/content/default-bank.ts
export const defaultAdminSettings: AdminSettings = {
  introText:
    "כוכבניק - סקר הכי ישראלי שיש. עונים, מצלמים, ובסוף מגלים איך כל הקהילה בחרה.",
  prizeLabels: {
    first: "",
    second: "",
    third: "",
  },
  globalSoundEnabled: true,
};
```

- [ ] **Step 4: Run the verification script to verify it passes**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: PASS with output `verify-survey-results: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/components/play/play-experience.tsx src/lib/content/default-bank.ts scripts/verify-survey-results.ts
git commit -m "feat: convert play flow to survey mode"
```

## Task 4: Replace Competitive Summary With Survey Reveal And Add Live Results Page

**Files:**
- Create: `src/components/results/results-page.tsx`
- Create: `src/app/results/page.tsx`
- Modify: `src/components/summary/summary-page.tsx`
- Modify: `src/components/landing/landing-page.tsx`
- Modify: `src/components/shared/brand-header.tsx`
- Modify: `src/components/leaderboard/leaderboard-page.tsx`
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Extend the verification script with a failing route/title assertion**

```ts
// append to scripts/verify-survey-results.ts
const landingSource = fs.readFileSync(
  new URL("../src/components/landing/landing-page.tsx", import.meta.url),
  "utf8",
);
const headerSource = fs.readFileSync(
  new URL("../src/components/shared/brand-header.tsx", import.meta.url),
  "utf8",
);

assert.equal(landingSource.includes("כוכבניק - סקר הכי ישראלי שיש"), true);
assert.equal(headerSource.includes("/results"), true);
```

- [ ] **Step 2: Run the verification script to verify it fails**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: FAIL because the new survey title and `/results` route do not exist yet.

- [ ] **Step 3: Add the summary/results UI and rename landing/header flows**

```tsx
// src/components/results/results-page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLiveJson } from "@/hooks/use-live-json";
import type { SurveyResultsSnapshot } from "@/lib/types";
import { getStoredPlayerId } from "@/lib/utils/local-session";

export function ResultsPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setPlayerId(getStoredPlayerId());
  }, []);

  const { data, refresh } = useLiveJson<{ results: SurveyResultsSnapshot }>(
    playerId ? `/api/game/results?playerId=${playerId}` : "/api/game/results?playerId=",
    {
      initialData: {
        results: { playerId: "", completed: false, questionResults: [] },
      },
      disabled: !playerId,
      tables: ["player_answers"],
    },
  );

  useEffect(() => {
    if (!playerId) {
      return;
    }

    void refresh().catch(() => {
      setLocked(true);
    });
  }, [playerId, refresh]);

  if (!playerId || locked || !data.results.completed) {
    return (
      <div className="glass-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-[#0f254a]">תוצאות הסקר נפתחות רק בסיום</h1>
        <p className="mt-3 text-[#547198]">מסיימים את כל השאלות ואז חוזרים לראות איך הקהילה בחרה.</p>
        <Link href="/play" className="mt-6 inline-flex rounded-full bg-[#0f61d8] px-5 py-3 text-white">
          חזרה למשחק
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.results.questionResults.map((question, index) => (
        <section key={question.questionId} className="glass-panel rounded-[30px] p-5">
          <p className="text-sm text-[#5d7da3]">שאלה {index + 1}</p>
          <h2 className="mt-2 text-xl text-[#0f254a]">{question.prompt}</h2>
          <div className="mt-4 space-y-3">
            {question.options.map((option) => (
              <div key={option.optionId} className="rounded-[22px] bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#143764]">{option.label}</span>
                  <span className="text-sm text-[#0f61d8]">{option.percentage}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-[#dcecff]">
                  <div
                    className="h-full rounded-full bg-[#0f61d8]"
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
                {option.isPlayerChoice ? (
                  <p className="mt-2 text-sm text-[#2f6b41]">הבחירה שלך</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

```tsx
// src/app/results/page.tsx
import { ResultsPage } from "@/components/results/results-page";

export default function ResultsRoute() {
  return <ResultsPage />;
}
```

```tsx
// key edits in src/components/summary/summary-page.tsx
<p className="text-sm text-white/80">כוכבניק - סקר הכי ישראלי שיש</p>
<h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
  כך הקהילה בחרה
</h1>

{summary.survey.questionResults.map((question, index) => (
  <section key={question.questionId} className="glass-panel rounded-[30px] p-5">
    <p className="text-sm text-[#5d7da3]">שאלה {index + 1}</p>
    <h2 className="mt-2 text-xl text-[#0f254a]">{question.prompt}</h2>
    <div className="mt-4 space-y-3">
      {question.options.map((option) => (
        <div key={option.optionId} className="rounded-[22px] bg-white/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span>{option.label}</span>
            <span>{option.percentage}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-[#dcecff]">
            <div
              className="h-full rounded-full bg-[#0f61d8]"
              style={{ width: `${option.percentage}%` }}
            />
          </div>
          {option.isPlayerChoice ? <p className="mt-2 text-sm text-[#2f6b41]">הבחירה שלך</p> : null}
        </div>
      ))}
    </div>
  </section>
))}

<Link href="/results" className="rounded-full bg-[#0f61d8] px-5 py-3 text-white">
  לצפייה בתוצאות החיות
</Link>
```

```tsx
// key edits in src/components/landing/landing-page.tsx
<p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm text-white/92 backdrop-blur-md">
  <Sparkles size={16} />
  כוכבניק - סקר הכי ישראלי שיש
</p>

<h1 className="font-display text-4xl leading-[1.02] text-white sm:text-6xl">
  כוכבניק
</h1>

<Link href="/results" className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm text-white">
  תוצאות הסקר
</Link>
```

```tsx
// key edits in src/components/shared/brand-header.tsx
const titles: Record<string, string> = {
  "/": "כוכבניק - סקר הכי ישראלי שיש",
  "/play": "הסקר החי",
  "/gallery": "גלריה קהילתית",
  "/leaderboard": "תוצאות הסקר",
  "/results": "תוצאות הסקר החיות",
  "/summary": "מסך הסיום",
};
```

- [ ] **Step 4: Run verification, lint, typecheck, and build**

Run: `node --import tsx scripts/verify-survey-results.ts`

Expected: PASS with output `verify-survey-results: PASS`

Run: `npm run lint`

Expected: PASS with no ESLint errors in the modified files.

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run build`

Expected: SUCCESSFUL Next.js production build.

- [ ] **Step 5: Commit**

```bash
git add src/components/results/results-page.tsx src/app/results/page.tsx src/components/summary/summary-page.tsx src/components/landing/landing-page.tsx src/components/shared/brand-header.tsx src/components/leaderboard/leaderboard-page.tsx src/app/leaderboard/page.tsx scripts/verify-survey-results.ts
git commit -m "feat: add survey results reveal flow"
```

## Manual Verification

- Start a new player from `/` and confirm the landing copy frames the experience as a survey, not trivia.
- Play through one question and confirm there is no correct/incorrect reveal, no score pill, and no answer-helper text.
- Confirm the answer locks in with a neutral saved-state message and the continue button.
- Reach a photo mission and confirm the `כמה אנשים פגשת` field is easy to edit without deleting a prefilled `0`.
- Finish a full run and confirm `/summary` becomes the first time percentages are visible.
- Confirm each summary question marks the player's own answer.
- Open `/results` after completion and confirm percentages load and remain visible.
- Open `/results` before completion with a different unfinished player and confirm access is blocked with the locked-state message.

## Restore Point

Before implementation, create a restore point that includes:

- `src/components/play/play-experience.tsx`
- `src/components/summary/summary-page.tsx`
- `src/components/landing/landing-page.tsx`
- `src/components/shared/brand-header.tsx`
- `src/lib/data/local-repository.ts`
- `src/lib/data/supabase-repository.ts`
- `src/lib/data/helpers.ts`
- `src/lib/types.ts`

Recommended restore label: `survey-rework-2026-04-18`
