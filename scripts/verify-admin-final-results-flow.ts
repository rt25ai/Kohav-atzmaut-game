import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  localGetSurveyRuntime,
  localPublishFinalSurveyResults,
  localReopenSurveyToLive,
  localSubmitAnswer,
} from "../src/lib/data/local-repository";
import type { LocalDatabase } from "../src/lib/types";

const DB_PATH = path.join(process.cwd(), "data", "local-db.json");

async function readExistingDb() {
  try {
    return await fs.readFile(DB_PATH, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const backup = await readExistingDb();
  const now = new Date().toISOString();

  const fixture: LocalDatabase = {
    settings: {
      introText: "",
      prizeLabels: { first: "", second: "", third: "" },
      globalSoundEnabled: true,
    },
    players: [
      {
        id: "player-live",
        name: "Tal",
        participantType: "solo_male",
        questionOrder: ["q-01", "q-02", "q-03"],
        missionOrder: ["m-01"],
        currentStepIndex: 0,
        totalScore: 0,
        correctAnswers: 0,
        photoMissionsCompleted: 0,
        newPeopleMet: 0,
        comboStreak: 0,
        completed: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        lastRank: null,
      },
    ],
    answers: [],
    photos: [],
    events: [],
    hostAnnouncements: [],
    questions: [
      {
        id: "q-01",
        type: "mcq",
        title: "שאלה 1",
        prompt: "מה הכי מאפיין חיים במושב?",
        options: [
          { id: "a", label: "קהילה קרובה" },
          { id: "b", label: "שגרה רגועה" },
          { id: "c", label: "שילוב בין פרטיות לשותפות" },
        ],
        correctOptionId: "a",
        correctOptionIndex: 0,
        basePoints: 100,
      },
      {
        id: "q-02",
        type: "mcq",
        title: "שאלה 2",
        prompt: "כמה אנשים צריך במושב כדי לתקן משהו?",
        options: [
          { id: "a", label: "אחד שיודע באמת" },
          { id: "b", label: "שניים - אחד עובד ואחד מחזיק" },
          { id: "c", label: 'כמה אנשים - כי תמיד יש עוד דרך "יותר טובה"' },
        ],
        correctOptionId: "a",
        correctOptionIndex: 0,
        basePoints: 100,
      },
      {
        id: "q-03",
        type: "mcq",
        title: "שאלה 3",
        prompt: '"יש לך במקרה...?" במושב זה אומר:',
        options: [
          { id: "a", label: "שאלה מנומסת" },
          { id: "b", label: "בקשה אמיתית לעזרה" },
          { id: "c", label: "התחלה של שיתוף הדדי" },
        ],
        correctOptionId: "a",
        correctOptionIndex: 0,
        basePoints: 100,
      },
    ],
    missions: [
      {
        id: "m-01",
        type: "photo",
        title: "משימת צילום 1",
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

  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(fixture, null, 2), "utf8");

  try {
    const closingRuntime = await localPublishFinalSurveyResults();
    assert.equal(closingRuntime.phase, "closing");
    assert.equal(closingRuntime.finalResultsSnapshot?.questionResults.length, 3);
    assert.equal(
      closingRuntime.finalResultsSnapshot?.questionResults[0]?.totalAnswered,
      0,
    );
    assert.equal(closingRuntime.gracePlayers.length, 1);

    await localSubmitAnswer({
      playerId: "player-live",
      questionId: "q-01",
      stepIndex: 0,
      selectedOptionId: "a",
      responseMs: 1100,
      skipped: false,
    });

    const finalizedRuntime = await localGetSurveyRuntime();
    assert.equal(finalizedRuntime.phase, "finalized");
    assert.equal(finalizedRuntime.gracePlayers.length, 0);
    assert.equal(
      finalizedRuntime.finalResultsSnapshot?.questionResults[0]?.totalAnswered,
      0,
    );

    await assert.rejects(
      () =>
        localSubmitAnswer({
          playerId: "player-live",
          questionId: "q-02",
          stepIndex: 1,
          selectedOptionId: "a",
          responseMs: 900,
          skipped: false,
        }),
      /התוצאות הסופיות כבר פורסמו|הסקר נסגר/,
    );

    const reopenedRuntime = await localReopenSurveyToLive();
    assert.equal(reopenedRuntime.phase, "live");
    assert.equal(reopenedRuntime.closedAt, null);
    assert.equal(reopenedRuntime.finalizedAt, null);
    assert.equal(reopenedRuntime.finalResultsSnapshot, null);
    assert.equal(reopenedRuntime.finalBannerMessage, null);
    assert.equal(reopenedRuntime.gracePlayers.length, 0);

    const reopenedAnswer = await localSubmitAnswer({
      playerId: "player-live",
      questionId: "q-02",
      stepIndex: 1,
      selectedOptionId: "b",
      responseMs: 950,
      skipped: false,
    });
    assert.equal(reopenedAnswer.session.surveyPhase, "live");
    assert.equal(reopenedAnswer.outcome.status, "correct");

    console.log("verify-admin-final-results-flow: PASS");
  } finally {
    if (backup === null) {
      await fs.rm(DB_PATH, { force: true });
    } else {
      await fs.writeFile(DB_PATH, backup, "utf8");
    }
  }
}

void main();
