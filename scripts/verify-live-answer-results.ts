import assert from "node:assert/strict";

import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

const initialSession = {
  player: {
    id: "player-live-results",
    name: "טל",
    participantType: "solo_male",
    questionOrder: ["q-live"],
    missionOrder: ["m-live"],
    currentStepIndex: 0,
    totalScore: 120,
    correctAnswers: 1,
    photoMissionsCompleted: 0,
    newPeopleMet: 2,
    comboStreak: 0,
    completed: false,
    completedAt: null,
    createdAt: "2026-04-19T20:00:00.000Z",
    updatedAt: "2026-04-19T20:00:00.000Z",
    lastSeenAt: "2026-04-19T20:00:00.000Z",
    lastRank: 2,
  },
  settings: {
    introText: "",
    prizeLabels: { first: "", second: "", third: "" },
    globalSoundEnabled: true,
  },
  steps: [
    { kind: "question", questionId: "q-live" },
    { kind: "mission", missionId: "m-live" },
  ],
  currentStep: { kind: "question", questionId: "q-live" },
  answers: [],
  leaderboard: [],
  questions: [
    {
      type: "mcq",
      id: "q-live",
      title: "שאלה 1",
      prompt: "מה הכי מאפיין את הערב כרגע?",
      options: [
        { id: "a", label: "שקט ונעים" },
        { id: "b", label: "קהילה קרובה" },
        { id: "c", label: "אווירה חגיגית" },
      ],
      correctOptionId: "a",
      correctOptionIndex: 0,
      basePoints: 100,
    },
  ],
  missions: [
    {
      type: "photo",
      id: "m-live",
      title: "משימת צילום",
      prompt: "צלמו רגע מהאירוע",
      basePoints: 250,
      isFinal: false,
    },
  ],
  surveyPhase: "live",
  finalSurveySnapshot: null,
  resultsPromptRequired: false,
};

const answeredSession = {
  ...initialSession,
  player: {
    ...initialSession.player,
    currentStepIndex: 1,
    totalScore: 220,
    correctAnswers: 2,
    updatedAt: "2026-04-19T20:01:00.000Z",
    lastSeenAt: "2026-04-19T20:01:00.000Z",
    lastRank: 1,
  },
  currentStep: { kind: "mission", missionId: "m-live" },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let releaseAnswerRequest: (() => void) | null = null;
  const answerRequestStarted = new Promise<void>((resolve) => {
    void page.route("**/api/game/answer", async (route) => {
      resolve();
      await new Promise<void>((resume) => {
        releaseAnswerRequest = resume;
      });

      await route.fulfill({
        json: {
          session: answeredSession,
          outcome: {
            status: "correct",
            rankImproved: true,
            pointsAwarded: 100,
            liveQuestionResult: {
              questionId: "q-live",
              questionTitle: "שאלה 1",
              prompt: "מה הכי מאפיין את הערב כרגע?",
              totalAnswered: 12,
              totalResponses: 12,
              skippedCount: 0,
              playerChoiceOptionId: "b",
              playerComparison: "top-choice",
              topOptionIds: ["b"],
              options: [
                {
                  optionId: "a",
                  label: "שקט ונעים",
                  voteCount: 3,
                  percentage: 25,
                  isTopChoice: false,
                  isPlayerChoice: false,
                },
                {
                  optionId: "b",
                  label: "קהילה קרובה",
                  voteCount: 6,
                  percentage: 50,
                  isTopChoice: true,
                  isPlayerChoice: true,
                },
                {
                  optionId: "c",
                  label: "אווירה חגיגית",
                  voteCount: 3,
                  percentage: 25,
                  isTopChoice: false,
                  isPlayerChoice: false,
                },
              ],
            },
          },
        },
      });
    });
  });

  await context.addInitScript(() => {
    window.localStorage.setItem(
      "kochav-michael-active-player",
      "player-live-results",
    );
  });

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({ json: { session: initialSession } });
  });

  await page.route("**/api/game/heartbeat*", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/public/snapshot*", async (route) => {
    await route.fulfill({
      json: {
        mode: "local",
        settings: {
          introText: "",
          prizeLabels: { first: "", second: "", third: "" },
          globalSoundEnabled: true,
        },
        totalParticipants: 25,
        activePlayersNow: 12,
        leaderboard: [],
        latestPhotos: [],
        recentEvents: [],
        activeHostAnnouncement: null,
        activeSystemBanner: null,
        nextHostTransitionAt: null,
        surveyRuntime: {
          phase: "live",
          closedAt: null,
          finalizedAt: null,
          finalResultsSnapshot: null,
          finalBannerMessage: null,
          gracePlayers: [],
        },
        surveyPhase: "live",
        finalSurveySnapshot: null,
      },
    });
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  await page.getByText("מה הכי מאפיין את הערב כרגע?").waitFor();

  const selectedOption = page.locator('[data-answer-option="b"]');
  await selectedOption.click();
  await answerRequestStarted;

  assert.equal(
    await selectedOption.getAttribute("data-answer-state"),
    "pending",
  );
  assert.equal(await page.locator("[data-live-answer-results]").count(), 0);
  assert.match(
    (await page.locator("[data-pending-live-results-message]").textContent()) ?? "",
    /הבחירה נקלטה, המתינו לטעינת גרף הנתונים בלייב/,
  );

  const resumeAnswerRequest = releaseAnswerRequest as (() => void) | null;
  if (!resumeAnswerRequest) {
    throw new Error("Expected the answer request to be waiting");
  }
  resumeAnswerRequest();
  await page.locator("[data-live-answer-results]").waitFor();

  assert.equal(
    await selectedOption.getAttribute("data-answer-state"),
    "confirmed",
  );
  assert.equal(await page.locator("[data-live-results-option]").count(), 3);
  assert.equal(
    await page
      .locator('[data-live-results-option="b"]')
      .getAttribute("data-player-choice"),
    "true",
  );

  const liveNote = await page.locator("[data-live-answer-results-note]").textContent();
  assert.match(liveNote ?? "", /האחוזים כרגע/);
  assert.match(liveNote ?? "", /לא התוצאה הסופית/);

  const continueButton = page.getByRole("button", {
    name: /המשך|המשיכי|המשיכו/,
  });
  assert.equal(await continueButton.count(), 1);

  await browser.close();
  console.log("verify-live-answer-results: PASS");
}

void main();
