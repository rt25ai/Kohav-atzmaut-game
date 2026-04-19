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
      options: [
        { id: "a", label: "קהילה קרובה" },
        { id: "b", label: "שגרה רגועה" },
        { id: "c", label: "איזון" },
        { id: "d", label: "אחר" },
      ],
      correctOptionId: "a",
      correctOptionIndex: 0,
      basePoints: 100,
    },
    {
      id: "q2",
      type: "mcq",
      title: "שאלה 2",
      prompt: "כמה אנשים צריך כדי לתקן משהו?",
      options: [
        { id: "a", label: "אחד" },
        { id: "b", label: "שניים" },
        { id: "c", label: "כמה" },
        { id: "d", label: "תלוי" },
      ],
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
    gracePlayers: [],
  },
};

const frozen = createFrozenSurveySnapshot(db, "2026-04-19T18:00:00.000Z");
assert.equal(frozen.questionResults.length, 2);
assert.equal(frozen.totalParticipants, 1);

const closingState: SurveyRuntimeState = {
  phase: "closing",
  closedAt: "2026-04-19T18:00:00.000Z",
  finalizedAt: null,
  finalResultsSnapshot: frozen,
  finalBannerMessage: "התוצאות הסופיות פורסמו",
  gracePlayers: [{ playerId: "p-live", stepIndex: 1 }],
};

assert.equal(getSurveyRuntimePhase(closingState), "closing");
assert.equal(buildLiveSurveyOverview(db).questionCount, 2);
assert.equal(
  shouldAllowCurrentStepCompletionAfterClosure({
    phase: "closing",
    playerCurrentStepIndex: 1,
    playerId: "p-live",
    submittedStepIndex: 1,
    gracePlayers: closingState.gracePlayers,
  }),
  true,
);
assert.equal(
  shouldAllowCurrentStepCompletionAfterClosure({
    phase: "closing",
    playerCurrentStepIndex: 1,
    playerId: "p-live",
    submittedStepIndex: 2,
    gracePlayers: closingState.gracePlayers,
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
