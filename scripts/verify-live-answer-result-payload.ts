import assert from "node:assert/strict";

import type { PlayerAnswerRecord, Question } from "../src/lib/types";

const question: Question = {
  type: "mcq",
  id: "q-live",
  title: "שאלה חיה",
  prompt: "מה הכי מאפיין את הערב כרגע?",
  options: [
    { id: "a", label: "שקט ונעים" },
    { id: "b", label: "קהילה קרובה" },
    { id: "c", label: "אווירה חגיגית" },
  ],
  correctOptionId: "a",
  correctOptionIndex: 0,
  basePoints: 100,
};

const answers: PlayerAnswerRecord[] = [
  {
    id: "answer-a",
    playerId: "p2",
    kind: "question",
    contentId: "q-live",
    stepIndex: 0,
    status: "correct",
    answerOptionId: "a",
    responseMs: 900,
    pointsAwarded: 100,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-19T20:01:00.000Z",
  },
  {
    id: "answer-b",
    playerId: "p1",
    kind: "question",
    contentId: "q-live",
    stepIndex: 0,
    status: "correct",
    answerOptionId: "b",
    responseMs: 760,
    pointsAwarded: 100,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-19T20:02:00.000Z",
  },
  {
    id: "answer-c",
    playerId: "p3",
    kind: "question",
    contentId: "q-live",
    stepIndex: 0,
    status: "correct",
    answerOptionId: "c",
    responseMs: 1100,
    pointsAwarded: 100,
    caption: null,
    photoUrl: null,
    thumbnailUrl: null,
    missionTitle: null,
    newPeopleMet: 0,
    isFinalMission: false,
    createdAt: "2026-04-19T20:03:00.000Z",
  },
];

async function main() {
  const surveyResultsModule = (await import("../src/lib/game/survey-results")) as {
    buildLiveQuestionResult?: (input: {
      question: Question;
      answers: PlayerAnswerRecord[];
      playerId: string;
    }) => {
      questionId: string;
      playerChoiceOptionId: string | null;
      totalAnswered: number;
      options: Array<{
        optionId: string;
        percentage: number;
        isPlayerChoice: boolean;
      }>;
    };
  };

  assert.equal(
    typeof surveyResultsModule.buildLiveQuestionResult,
    "function",
    "Expected survey-results to export buildLiveQuestionResult for the immediate live-answer payload",
  );

  const liveQuestionResult = surveyResultsModule.buildLiveQuestionResult?.({
    question,
    answers,
    playerId: "p1",
  });

  assert.ok(liveQuestionResult);
  assert.equal(liveQuestionResult?.questionId, "q-live");
  assert.equal(liveQuestionResult?.playerChoiceOptionId, "b");
  assert.equal(liveQuestionResult?.totalAnswered, 3);
  assert.deepEqual(
    liveQuestionResult?.options.map((option) => ({
      optionId: option.optionId,
      percentage: option.percentage,
      isPlayerChoice: option.isPlayerChoice,
    })),
    [
      { optionId: "a", percentage: 33, isPlayerChoice: false },
      { optionId: "b", percentage: 33, isPlayerChoice: true },
      { optionId: "c", percentage: 33, isPlayerChoice: false },
    ],
  );

  console.log("verify-live-answer-result-payload: PASS");
}

void main();
