import assert from "node:assert/strict";
import fs from "node:fs";

import { buildSummarySnapshot } from "../src/lib/data/helpers";
import { buildSurveyQuestionResults } from "../src/lib/game/survey-results";
import type { LocalDatabase, PlayerAnswerRecord, PlayerRecord, Question } from "../src/lib/types";

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
assert.equal(
  result.options.find((option) => option.optionId === "a")?.voteCount,
  2,
);
assert.equal(
  result.options.find((option) => option.optionId === "a")?.percentage,
  67,
);
assert.equal(
  result.options.find((option) => option.optionId === "b")?.percentage,
  33,
);
assert.equal(result.playerComparison, "unique");

const player: PlayerRecord = {
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
};

const db: LocalDatabase = {
  settings: {
    introText: "intro",
    prizeLabels: { first: "", second: "", third: "" },
    globalSoundEnabled: true,
  },
  players: [player],
  answers,
  photos: [],
  events: [],
  questions,
  missions: [],
};

const summary = buildSummarySnapshot(db, player);

assert.equal(summary.survey.questionResults.length, 1);
assert.equal(summary.survey.questionResults[0].playerChoiceOptionId, "b");

const playExperienceSource = fs.readFileSync(
  new URL("../src/components/play/play-experience.tsx", import.meta.url),
  "utf8",
);

assert.equal(playExperienceSource.includes("לחץ כדי לבחור תשובה"), false);
assert.equal(playExperienceSource.includes("בונוס מהירות פעיל"), false);
assert.equal(playExperienceSource.includes("קומבו נוכחי"), false);

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

console.log("verify-survey-results: PASS");
