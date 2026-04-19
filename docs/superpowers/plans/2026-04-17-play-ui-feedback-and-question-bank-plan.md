# Play UI Feedback And Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the play-screen answer feedback and mobile photo-preview instability, then rebalance the default question bank so answers are less predictable and more family-friendly.

**Architecture:** Extract answer-feedback logic into a small pure helper so we can verify the tricky state transitions without a UI test runner, keep the play screen as the single orchestration surface for question and mission flow, and add lightweight verification scripts for content integrity. Preserve the existing server API shape and scoring flow while upgrading only the client-side review UX and mission preview stability.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, `tsx` for verification scripts, existing fetch-based game API routes.

---

## File Structure

- Create: `src/lib/game/answer-review.ts`
  Responsibility: pure helper for deriving answer button visual states and review metadata from selection and server outcome.

- Create: `scripts/verify-answer-review.ts`
  Responsibility: one-off assertion script that exercises answer-review edge cases without requiring a browser test framework.

- Create: `scripts/verify-question-bank.ts`
  Responsibility: validates question option count, correct option/index alignment, and answer-letter distribution.

- Modify: `src/components/play/play-experience.tsx`
  Responsibility: add explicit question review UX, continue flow, stable mission preview shell, and object URL cleanup.

- Modify: `src/lib/utils/image-upload.ts`
  Responsibility: keep upload compression API stable and ensure mission preview changes do not depend on data URL timing assumptions.

- Modify: `src/lib/content/default-bank.ts`
  Responsibility: rewrite the default question bank with stronger distractors and rebalance correct answers across `א/ב/ג/ד`.

## Task 1: Add Answer Review Helper

**Files:**
- Create: `src/lib/game/answer-review.ts`
- Test: `scripts/verify-answer-review.ts`

- [ ] **Step 1: Write the failing verification script**

```ts
// scripts/verify-answer-review.ts
import assert from "node:assert/strict";

import {
  getAnswerReviewState,
  getOptionVisualState,
} from "../src/lib/game/answer-review";

const wrongReview = getAnswerReviewState({
  selectedOptionId: "b",
  submittedOptionId: "b",
  correctOptionId: "d",
  outcomeStatus: "wrong",
});

assert.equal(wrongReview.reviewState, "wrong");
assert.equal(wrongReview.correctOptionId, "d");
assert.equal(
  getOptionVisualState({
    optionId: "b",
    selectedOptionId: "b",
    submittedOptionId: "b",
    correctOptionId: "d",
    reviewState: wrongReview.reviewState,
  }),
  "incorrect",
);
assert.equal(
  getOptionVisualState({
    optionId: "d",
    selectedOptionId: "b",
    submittedOptionId: "b",
    correctOptionId: "d",
    reviewState: wrongReview.reviewState,
  }),
  "correct",
);

const pendingState = getOptionVisualState({
  optionId: "c",
  selectedOptionId: "c",
  submittedOptionId: null,
  correctOptionId: null,
  reviewState: "idle",
});

assert.equal(pendingState, "selected");

console.log("verify-answer-review: PASS");
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-answer-review.ts`

Expected: FAIL with module resolution error because `src/lib/game/answer-review.ts` does not exist yet.

- [ ] **Step 3: Write the minimal helper**

```ts
// src/lib/game/answer-review.ts
import type { OptionId } from "@/lib/types";

export type AnswerReviewState = "idle" | "correct" | "wrong";
export type AnswerVisualState = "default" | "selected" | "correct" | "incorrect";

type ReviewInput = {
  selectedOptionId: OptionId | null;
  submittedOptionId: OptionId | null;
  correctOptionId: OptionId | null;
  outcomeStatus: "correct" | "wrong" | "skipped";
};

type OptionStateInput = {
  optionId: OptionId;
  selectedOptionId: OptionId | null;
  submittedOptionId: OptionId | null;
  correctOptionId: OptionId | null;
  reviewState: AnswerReviewState;
};

export function getAnswerReviewState(input: ReviewInput) {
  if (input.outcomeStatus === "correct") {
    return {
      reviewState: "correct" as const,
      submittedOptionId: input.submittedOptionId,
      correctOptionId: input.correctOptionId ?? input.submittedOptionId,
    };
  }

  if (input.outcomeStatus === "wrong") {
    return {
      reviewState: "wrong" as const,
      submittedOptionId: input.submittedOptionId,
      correctOptionId: input.correctOptionId,
    };
  }

  return {
    reviewState: "idle" as const,
    submittedOptionId: input.submittedOptionId ?? input.selectedOptionId,
    correctOptionId: input.correctOptionId,
  };
}

export function getOptionVisualState(input: OptionStateInput): AnswerVisualState {
  if (input.reviewState === "correct") {
    return input.optionId === input.submittedOptionId ? "correct" : "default";
  }

  if (input.reviewState === "wrong") {
    if (input.optionId === input.correctOptionId) {
      return "correct";
    }

    if (input.optionId === input.submittedOptionId) {
      return "incorrect";
    }

    return "default";
  }

  return input.optionId === input.selectedOptionId ? "selected" : "default";
}
```

- [ ] **Step 4: Run the script to verify it passes**

Run: `node --import tsx scripts/verify-answer-review.ts`

Expected: PASS and output `verify-answer-review: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/answer-review.ts scripts/verify-answer-review.ts
git commit -m "feat: add answer review helper"
```

## Task 2: Integrate Question Review UX Into Play Screen

**Files:**
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/lib/game/answer-review.ts`
- Test: `scripts/verify-answer-review.ts`

- [ ] **Step 1: Expand the verification script with continue-flow expectations**

```ts
// append to scripts/verify-answer-review.ts
const correctReview = getAnswerReviewState({
  selectedOptionId: "a",
  submittedOptionId: "a",
  correctOptionId: "a",
  outcomeStatus: "correct",
});

assert.equal(correctReview.reviewState, "correct");
assert.equal(
  getOptionVisualState({
    optionId: "a",
    selectedOptionId: "a",
    submittedOptionId: "a",
    correctOptionId: "a",
    reviewState: correctReview.reviewState,
  }),
  "correct",
);
assert.equal(
  getOptionVisualState({
    optionId: "b",
    selectedOptionId: "a",
    submittedOptionId: "a",
    correctOptionId: "a",
    reviewState: correctReview.reviewState,
  }),
  "default",
);
```

- [ ] **Step 2: Run the script before UI integration**

Run: `node --import tsx scripts/verify-answer-review.ts`

Expected: PASS. This confirms helper behavior before wiring the component.

- [ ] **Step 3: Update `PlayExperience` to use the helper and a review state**

```tsx
// add these state fields and handlers inside src/components/play/play-experience.tsx
import { getAnswerReviewState, getOptionVisualState } from "@/lib/game/answer-review";

const [selectedOptionId, setSelectedOptionId] = useState<"a" | "b" | "c" | "d" | null>(null);
const [submittedOptionId, setSubmittedOptionId] = useState<"a" | "b" | "c" | "d" | null>(null);
const [reviewState, setReviewState] = useState<"idle" | "correct" | "wrong">("idle");
const [revealedCorrectOptionId, setRevealedCorrectOptionId] = useState<
  "a" | "b" | "c" | "d" | null
>(null);
const [awaitingContinue, setAwaitingContinue] = useState(false);

useEffect(() => {
  setSelectedOptionId(null);
  setSubmittedOptionId(null);
  setReviewState("idle");
  setRevealedCorrectOptionId(null);
  setAwaitingContinue(false);
}, [
  session?.currentStep?.kind,
  session?.currentStep?.kind === "question"
    ? session.currentStep.questionId
    : session?.currentStep?.kind === "mission"
      ? session.currentStep.missionId
      : "",
]);

const continueFromReview = () => {
  if (!session?.player.completed && awaitingContinue) {
    setAwaitingContinue(false);
  }
};

const answerQuestion = async (optionId: "a" | "b" | "c" | "d") => {
  if (!currentQuestion || busy || awaitingContinue) {
    return;
  }

  setSelectedOptionId(optionId);
  setSubmittedOptionId(optionId);
  setBusy(true);
  setError(null);
  play("click");

  try {
    const result = await postJson<{
      session: SessionSnapshot;
      outcome: {
        status: "correct" | "wrong" | "skipped";
        rankImproved: boolean;
        pointsAwarded: number;
      };
    }>("/api/game/answer", {
      playerId,
      questionId: currentQuestion.id,
      stepIndex: session.player.currentStepIndex,
      selectedOptionId: optionId,
      responseMs: Date.now() - startedAtRef.current,
      skipped: false,
    });

    const review = getAnswerReviewState({
      selectedOptionId: optionId,
      submittedOptionId: optionId,
      correctOptionId: currentQuestion.correctOptionId,
      outcomeStatus: result.outcome.status,
    });

    setSession(result.session);
    setReviewState(review.reviewState);
    setRevealedCorrectOptionId(review.correctOptionId);
    setAwaitingContinue(true);
  } catch (caughtError) {
    setSubmittedOptionId(null);
    setReviewState("idle");
    setRevealedCorrectOptionId(null);
    setError(caughtError instanceof Error ? caughtError.message : "תקלה בשליחת התשובה");
  } finally {
    setBusy(false);
  }
};
```

- [ ] **Step 4: Update answer button rendering and add a continue action**

```tsx
{currentQuestion.options.map((option) => {
  const visualState = getOptionVisualState({
    optionId: option.id,
    selectedOptionId,
    submittedOptionId,
    correctOptionId: revealedCorrectOptionId,
    reviewState,
  });

  const buttonClassName =
    visualState === "correct"
      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
      : visualState === "incorrect"
        ? "border-rose-500 bg-rose-50 text-rose-900"
        : visualState === "selected"
          ? "border-[#0f61d8] bg-[#e9f3ff] text-[#0f254a]"
          : "border-white/60 bg-white/80 text-[#123460]";

  return (
    <button
      key={option.id}
      type="button"
      disabled={busy || awaitingContinue}
      onClick={() => answerQuestion(option.id)}
      className={`rounded-[24px] border px-5 py-4 text-right transition ${buttonClassName}`}
    >
      <span className="block text-sm text-[#5d7aa4]">{option.id.toUpperCase()}</span>
      <span className="text-lg">{option.label}</span>
    </button>
  );
})}

{awaitingContinue ? (
  <button
    type="button"
    onClick={() => {
      setAwaitingContinue(false);
      play("transition");
    }}
    className="inline-flex h-12 items-center justify-center rounded-full bg-[#0f61d8] px-6 text-white"
  >
    המשך לשלב הבא
  </button>
) : null}
```

- [ ] **Step 5: Run compile verification**

Run: `npm run build`

Expected: PASS with no TypeScript errors from the new play-screen state.

- [ ] **Step 6: Commit**

```bash
git add src/components/play/play-experience.tsx src/lib/game/answer-review.ts scripts/verify-answer-review.ts
git commit -m "feat: add answer review feedback"
```

## Task 3: Stabilize Mission Preview On Mobile

**Files:**
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/lib/utils/image-upload.ts`

- [ ] **Step 1: Capture the current regression in code comments and structure**

```tsx
// add directly above the mission preview shell in src/components/play/play-experience.tsx
// Keep this shell height stable so image selection/upload does not shift the whole mobile layout.
```

- [ ] **Step 2: Add stable object URL lifecycle management**

```tsx
const previewObjectUrlRef = useRef<string | null>(null);

useEffect(() => {
  return () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
  };
}, []);

const updatePreviewFromFile = (file: File | null) => {
  if (previewObjectUrlRef.current) {
    URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;
  }

  if (!file) {
    setPreviewUrl(null);
    return;
  }

  const nextUrl = URL.createObjectURL(file);
  previewObjectUrlRef.current = nextUrl;
  setPreviewUrl(nextUrl);
};
```

- [ ] **Step 3: Use a fixed preview shell instead of conditionally reshaping the layout**

```tsx
<div className="rounded-[28px] border border-white/60 bg-white/70 p-3">
  <div className="relative min-h-[260px] overflow-hidden rounded-[22px] bg-[#eef5ff]">
    {previewUrl ? (
      <Image src={previewUrl} alt="תצוגה מקדימה" fill className="object-cover" />
    ) : (
      <div className="flex h-[260px] items-center justify-center text-center text-sm text-[#5d7aa4]">
        בוחרים תמונה והיא תופיע כאן בלי להקפיץ את המסך
      </div>
    )}

    {busy ? (
      <div className="absolute inset-0 flex items-center justify-center bg-[#082a54]/45 text-white">
        <LoaderCircle className="animate-spin" size={28} />
      </div>
    ) : null}
  </div>
</div>
```

- [ ] **Step 4: Ensure file selection uses the lifecycle helper**

```tsx
onChange={(event) => {
  const file = event.target.files?.[0] ?? null;
  setSelectedFile(file);
  updatePreviewFromFile(file);
}}
```

- [ ] **Step 5: Keep `compressForUpload` API stable and explicit**

```ts
// src/lib/utils/image-upload.ts
export async function compressForUpload(file: File) {
  const full = await imageCompression(file, {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.82,
  });

  const thumb = await imageCompression(file, {
    maxSizeMB: 0.18,
    maxWidthOrHeight: 480,
    useWebWorker: true,
    initialQuality: 0.72,
  });

  return {
    photoUrl: await blobToDataUrl(full),
    thumbnailUrl: await blobToDataUrl(thumb),
  };
}
```

- [ ] **Step 6: Run compile verification**

Run: `npm run build`

Expected: PASS and no runtime type regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/play/play-experience.tsx src/lib/utils/image-upload.ts
git commit -m "fix: stabilize mission photo preview"
```

## Task 4: Rebalance And Rewrite The Default Question Bank

**Files:**
- Modify: `src/lib/content/default-bank.ts`
- Test: `scripts/verify-question-bank.ts`

- [ ] **Step 1: Write the failing question-bank verification script**

```ts
// scripts/verify-question-bank.ts
import assert from "node:assert/strict";

import { defaultQuestions } from "../src/lib/content/default-bank";

const counts = new Map<string, number>();

for (const question of defaultQuestions) {
  assert.equal(question.options.length, 4, `${question.id} should expose exactly 4 options`);
  assert.equal(
    question.options[question.correctOptionIndex]?.id,
    question.correctOptionId,
    `${question.id} has mismatched correct option metadata`,
  );

  counts.set(question.correctOptionId, (counts.get(question.correctOptionId) ?? 0) + 1);
}

assert.ok((counts.get("a") ?? 0) >= 3, "Need at least 3 correct answers on option a");
assert.ok((counts.get("b") ?? 0) >= 3, "Need at least 3 correct answers on option b");
assert.ok((counts.get("c") ?? 0) >= 3, "Need at least 3 correct answers on option c");
assert.ok((counts.get("d") ?? 0) >= 3, "Need at least 3 correct answers on option d");

console.log("verify-question-bank: PASS", Object.fromEntries(counts));
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-question-bank.ts`

Expected: FAIL because the current bank uses 3 options and heavily clusters correct answers on `ג`.

- [ ] **Step 3: Replace `defaultQuestions` with the full balanced bank**

```ts
export const defaultQuestions: Question[] = [
  {
    type: "mcq",
    id: "q-01",
    title: "1",
    prompt: "נגמרו הפחמים בדיוק כשהמנגל התחיל להתחמם. מה הכי סביר שיקרה עכשיו?",
    options: [
      { id: "a", label: "יעברו ישר לקינוחים בלי לדבר על זה" },
      { id: "b", label: "המנגל ייסגר מיד וכולם ילכו הביתה" },
      { id: "c", label: "ייפתח דיון קצר אך נלהב על מי היה אמור להביא" },
      { id: "d", label: "אף אחד לא ישים לב שמשהו השתבש" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-02",
    title: "2",
    prompt: "אתם עומדים בתור ליד מישהו שלא פגשתם קודם. מה הכי סביר שיקרה?",
    options: [
      { id: "a", label: "תוך דקה תגלו מכר משותף או קרבת משפחה מפתיעה" },
      { id: "b", label: "כל אחד יסתכל רק על הטלפון שלו עד סוף הערב" },
      { id: "c", label: "תנהלו שיחה שלמה בלי לדעת אפילו איך קוראים לו" },
      { id: "d", label: "מישהו יעבור את התור ואף אחד לא יגיב" },
    ],
    correctOptionId: "a",
    correctOptionIndex: 0,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-03",
    title: "3",
    prompt: "איזה פתיח הכי טבעי לשיחה בין שני אנשים באירוע קהילתי?",
    options: [
      { id: "a", label: "יש לך במקרה טבלת אקסל של כל המשתתפים?" },
      { id: "b", label: "כמה אחוזי לחות יש היום לדעתך?" },
      { id: "c", label: "אפשר רגע לבדוק איתך משהו על התקציב?" },
      { id: "d", label: "גם אתם מפה או שבאתם עם מישהו מהיישוב?" },
    ],
    correctOptionId: "d",
    correctOptionIndex: 3,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-04",
    title: "4",
    prompt: "מה בדרך כלל קורה כשכמה ילדים שלא מכירים מתחילים לשחק יחד?",
    options: [
      { id: "a", label: "כל אחד מסמן טריטוריה ונשאר בה" },
      { id: "b", label: "אחרי רגע הם כבר ממציאים משחק שרק הם מבינים" },
      { id: "c", label: "מבוגר יידרש לכתוב להם חוקים מסודרים" },
      { id: "d", label: "הם יעדיפו לעמוד בצד ולנתח את הסיטואציה" },
    ],
    correctOptionId: "b",
    correctOptionIndex: 1,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-05",
    title: "5",
    prompt: "אמרו לכם להביא 'משהו קטן' למפגש. מה הכי סביר שתביאו בפועל?",
    options: [
      { id: "a", label: "מגש שמספיק ליותר אנשים ממה שתכננתם" },
      { id: "b", label: "מפית אחת מתקפלת כי לא רציתם להגזים" },
      { id: "c", label: "רק מלח ופלפל, כדי לא להתבלט" },
      { id: "d", label: "בקבוק מים אישי עם השם שלכם עליו" },
    ],
    correctOptionId: "a",
    correctOptionIndex: 0,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-06",
    title: "6",
    prompt: "מה הכי סביר שיקרה ליד שולחן הכיבוד חמש דקות אחרי שפתחו אותו?",
    options: [
      { id: "a", label: "כולם יעמדו במרחק מנומס ויחכו לתורם" },
      { id: "b", label: "אף אחד לא ייגע עד שתהיה הכרזה רשמית" },
      { id: "c", label: "יישמעו 'אני רק טועם' בזמן שהצלחות כבר מתמלאות" },
      { id: "d", label: "השולחן ייסגר זמנית לצורך ספירת מלאי" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-07",
    title: "7",
    prompt: "מישהו אומר 'אני רק שואל'. למה כדאי להתכונן?",
    options: [
      { id: "a", label: "לשאלה אחת קצרה של כן או לא" },
      { id: "b", label: "לשיחה שתכלול לפחות עוד שלוש שאלות המשך" },
      { id: "c", label: "להפסקה מוזיקלית לא מתוכננת" },
      { id: "d", label: "לבקשה לחתימה על מסמך" },
    ],
    correctOptionId: "b",
    correctOptionIndex: 1,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-08",
    title: "8",
    prompt: "מישהו מבקש להצטרף לשולחן שלכם. מה התגובה הכי טבעית באירוע כזה?",
    options: [
      { id: "a", label: "תציעו לו לעמוד לידכם עד שיתפנה מקום" },
      { id: "b", label: "תשלחו אותו לשולחן ועדת הקבלה" },
      { id: "c", label: "תבקשו לראות אם הוא ברשימת המוזמנים שלכם" },
      { id: "d", label: "תזיזו קצת כיסאות ותגידו לו לשבת בכיף" },
    ],
    correctOptionId: "d",
    correctOptionIndex: 3,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-09",
    title: "9",
    prompt: "מה הכי מחבר בין אנשים באירוע קהילתי מוצלח?",
    options: [
      { id: "a", label: "רגע של שיחה אמיתית עם מישהו שלא הכרתם קודם" },
      { id: "b", label: "לוח זמנים מדויק ברמת הדקות" },
      { id: "c", label: "שקט מוחלט ליד הרמקולים" },
      { id: "d", label: "טופס משוב שמחולק בכניסה" },
    ],
    correctOptionId: "a",
    correctOptionIndex: 0,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-10",
    title: "10",
    prompt: "איזה משפט הכי סביר לשמוע בסוף ערב מוצלח?",
    options: [
      { id: "a", label: "מעניין אם זה עומד בתקן אירועים" },
      { id: "b", label: "חייבים לעשות את זה שוב, רק בלי לחכות שנה" },
      { id: "c", label: "אני לא בטוח שהייתה מספיק תאורה ליד הסלטים" },
      { id: "d", label: "טוב, מיצינו בדיוק בזמן" },
    ],
    correctOptionId: "b",
    correctOptionIndex: 1,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-11",
    title: "11",
    prompt: "מה הכי סביר שיקרה בקבוצת הוואטסאפ של היישוב אחרי האירוע?",
    options: [
      { id: "a", label: "רק הודעת תודה אחת קצרה ותו לא" },
      { id: "b", label: "הקבוצה תיסגר עד לשנה הבאה" },
      { id: "c", label: "מישהו יכתוב תודה, ואז יתחיל שרשור של תמונות והשלמות" },
      { id: "d", label: "יעברו מיד לדבר רק על מזג האוויר" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-12",
    title: "12",
    prompt: "מישהו אומר 'תקפצו אלינו לקפה'. מה הפירוש הכי מציאותי?",
    options: [
      { id: "a", label: "מפגש של שבע דקות בדיוק" },
      { id: "b", label: "עצירה טכנית רק למילוי בקבוק מים" },
      { id: "c", label: "מפגש שבו שותים קפה, מדברים, וכנראה גם טועמים משהו" },
      { id: "d", label: "הזמנה רשמית עם לוח זמנים ומקומות מסומנים" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-13",
    title: "13",
    prompt: "ראיתם תור ארוך ליד דוכן פופולרי. מה הכי סביר שמישהו ישאל?",
    options: [
      { id: "a", label: "אפשר לעזור איכשהו כדי לזרז?" },
      { id: "b", label: "מי מנהל פה את התנועה?" },
      { id: "c", label: "יש דוח מסודר על זמני ההמתנה?" },
      { id: "d", label: "מה מחלקים פה שכולם מחכים ככה?" },
    ],
    correctOptionId: "d",
    correctOptionIndex: 3,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-14",
    title: "14",
    prompt: "מישהו אומר 'אני רק טועם'. מה הכי סביר שיקרה שנייה אחר כך?",
    options: [
      { id: "a", label: "הוא יעבור הלאה בלי לגעת בכלום" },
      { id: "b", label: "הטעימה תתרחב לעוד שתיים-שלוש בדיקות איכות" },
      { id: "c", label: "הוא יתחיל לרשום הערות קולינריות" },
      { id: "d", label: "הוא יבקש אישור מוועדת הטעימות" },
    ],
    correctOptionId: "b",
    correctOptionIndex: 1,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-15",
    title: "15",
    prompt: "פגשתם בחו\"ל מישהו שגם מכיר את היישוב שלכם. מה הכי סביר שיקרה?",
    options: [
      { id: "a", label: "כל אחד ינהן בנימוס וימשיך לדרכו" },
      { id: "b", label: "תעברו לשיחה רק באנגלית מתוך עיקרון" },
      { id: "c", label: "תוך רגע תרגישו שאתם מכירים שנים" },
      { id: "d", label: "תצלמו רק את השלט ותיפרדו" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-16",
    title: "16",
    prompt: "מה הכי סביר שיקרה כשילד מסביר למבוגר איך משהו עובד?",
    options: [
      { id: "a", label: "המבוגר יעביר את הנושא הלאה מיד" },
      { id: "b", label: "יבקשו חוות דעת טכנית מעוד שלושה אנשים" },
      { id: "c", label: "כולם יתבלבלו יותר ממה שהיו קודם" },
      { id: "d", label: "המבוגר יקשיב ברצינות כאילו קיבל הדרכה ממומחה" },
    ],
    correctOptionId: "d",
    correctOptionIndex: 3,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-17",
    title: "17",
    prompt: "ביקשו עזרה קטנה בהרמת ציוד. מה הכי סביר שיקרה?",
    options: [
      { id: "a", label: "תוך רגע יצטרפו עוד שניים ויהפכו את זה למבצע משותף" },
      { id: "b", label: "כולם יעמידו פנים שלא שמעו" },
      { id: "c", label: "יפתחו קבוצת דיון על הדרך הנכונה להרים" },
      { id: "d", label: "הציוד יחכה למחר בבוקר" },
    ],
    correctOptionId: "a",
    correctOptionIndex: 0,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-18",
    title: "18",
    prompt: "מה הכי סביר שיקרה כשמישהו מתחיל לספר סיפור מצחיק על אירוע קודם?",
    options: [
      { id: "a", label: "כולם יבקשו לשמוע את זה רק בכתב" },
      { id: "b", label: "מישהו יוסיף פרט, ואז עוד מישהו יתקן אותו בחיוך" },
      { id: "c", label: "השיחה תיעצר כדי לאמת תאריכים" },
      { id: "d", label: "כולם ישמרו על שקט מוחלט עד הסוף" },
    ],
    correctOptionId: "b",
    correctOptionIndex: 1,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-19",
    title: "19",
    prompt: "מה הכי עוזר לאדם חדש להרגיש שייך מהר באירוע כזה?",
    options: [
      { id: "a", label: "לתת לו לעמוד לבד עד שיתרגל" },
      { id: "b", label: "להסביר לו רק את החוקים הטכניים" },
      { id: "c", label: "להכיר לו אנשים, לשתף אותו, ולדבר איתו בגובה העיניים" },
      { id: "d", label: "להפנות אותו ישר ללוח המודעות" },
    ],
    correctOptionId: "c",
    correctOptionIndex: 2,
    basePoints: 100,
  },
  {
    type: "mcq",
    id: "q-20",
    title: "20",
    prompt: "מה באמת מחבר בין כל האנשים כאן הערב?",
    options: [
      { id: "a", label: "רק מי שהביא אוכל נשאר מחובר" },
      { id: "b", label: "בעיקר רשימת ההפעלה של הערב" },
      { id: "c", label: "זה שיש לכולם בדיוק אותו טעם" },
      { id: "d", label: "התחושה שאפשר להכיר, לצחוק, ולחגוג יחד" },
    ],
    correctOptionId: "d",
    correctOptionIndex: 3,
    basePoints: 100,
  },
];
```

- [ ] **Step 4: Run the bank verification script**

Run: `node --import tsx scripts/verify-question-bank.ts`

Expected: PASS and output a balanced distribution object.

- [ ] **Step 5: Run full compile verification**

Run: `npm run build`

Expected: PASS and no content-shape regressions.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/default-bank.ts scripts/verify-question-bank.ts
git commit -m "feat: rebalance default question bank"
```

## Task 5: Final End-To-End Verification

**Files:**
- Modify: none
- Test: `scripts/verify-answer-review.ts`
- Test: `scripts/verify-question-bank.ts`

- [ ] **Step 1: Run helper verification**

Run: `node --import tsx scripts/verify-answer-review.ts`

Expected: PASS

- [ ] **Step 2: Run content verification**

Run: `node --import tsx scripts/verify-question-bank.ts`

Expected: PASS

- [ ] **Step 3: Run production-style compile**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Manual browser verification checklist**

Use the local play flow and verify:

- selecting an answer immediately shows a selected state
- a wrong answer turns red and the correct answer turns green
- a correct answer turns green
- the continue action appears after answer review
- choosing a mission image keeps the preview region stable on mobile width
- repeated image picks do not visibly collapse the page

- [ ] **Step 5: Verify the worktree is clean enough to hand off**

Run: `git status --short`

Expected: only the planned implementation files are modified, with no unexpected debug artifacts.
