import assert from "node:assert/strict";

import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.addInitScript(() => {
    window.localStorage.setItem("kochav-michael-active-player", "player-1");
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
        totalParticipants: 56,
        activePlayersNow: 2,
        leaderboard: [],
        latestPhotos: [],
        recentEvents: [],
        activeHostAnnouncement: null,
        activeSystemBanner: {
          type: "final-results",
          message: "התוצאות הסופיות פורסמו",
          startedAt: "2026-04-19T20:30:00.000Z",
          endsAt: null,
        },
        nextHostTransitionAt: null,
        surveyRuntime: {
          phase: "finalized",
          closedAt: "2026-04-19T20:30:00.000Z",
          finalizedAt: "2026-04-19T20:31:00.000Z",
          finalResultsSnapshot: {
            finalizedAt: "2026-04-19T20:31:00.000Z",
            totalParticipants: 56,
            questionResults: [
              {
                questionId: "q1",
                questionTitle: "שאלה 1",
                prompt: "מה הכי מאפיין חיים במושב?",
                totalAnswered: 56,
                totalResponses: 56,
                skippedCount: 0,
                topOptionIds: ["a"],
                options: [
                  {
                    optionId: "a",
                    label: "קהילה קרובה",
                    voteCount: 31,
                    percentage: 55,
                    isTopChoice: true,
                  },
                ],
              },
            ],
          },
          finalBannerMessage: "התוצאות הסופיות פורסמו",
          gracePlayers: [],
        },
        surveyPhase: "finalized",
        finalSurveySnapshot: {
          finalizedAt: "2026-04-19T20:31:00.000Z",
          totalParticipants: 56,
          questionResults: [
            {
              questionId: "q1",
              questionTitle: "שאלה 1",
              prompt: "מה הכי מאפיין חיים במושב?",
              totalAnswered: 56,
              totalResponses: 56,
              skippedCount: 0,
              topOptionIds: ["a"],
              options: [
                {
                  optionId: "a",
                  label: "קהילה קרובה",
                  voteCount: 31,
                  percentage: 55,
                  isTopChoice: true,
                },
              ],
            },
          ],
        },
      },
    });
  });

  await page.route("**/api/game/session*", async (route) => {
    await route.fulfill({
      json: {
        session: {
          player: {
            id: "player-1",
            name: "טל",
            participantType: "solo_male",
            questionOrder: ["q1"],
            missionOrder: ["m1"],
            currentStepIndex: 1,
            totalScore: 120,
            correctAnswers: 1,
            photoMissionsCompleted: 0,
            newPeopleMet: 3,
            comboStreak: 0,
            completed: false,
            completedAt: null,
            createdAt: "2026-04-19T20:00:00.000Z",
            updatedAt: "2026-04-19T20:31:00.000Z",
            lastSeenAt: "2026-04-19T20:31:00.000Z",
            lastRank: 1,
          },
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          steps: [
            { kind: "question", questionId: "q1" },
            { kind: "mission", missionId: "m1" },
          ],
          currentStep: null,
          answers: [],
          leaderboard: [],
          questions: [],
          missions: [],
          surveyPhase: "finalized",
          finalSurveySnapshot: {
            finalizedAt: "2026-04-19T20:31:00.000Z",
            totalParticipants: 56,
            questionResults: [
              {
                questionId: "q1",
                questionTitle: "שאלה 1",
                prompt: "מה הכי מאפיין חיים במושב?",
                totalAnswered: 56,
                totalResponses: 56,
                skippedCount: 0,
                topOptionIds: ["a"],
                options: [
                  {
                    optionId: "a",
                    label: "קהילה קרובה",
                    voteCount: 31,
                    percentage: 55,
                    isTopChoice: true,
                  },
                ],
              },
            ],
          },
          resultsPromptRequired: true,
        },
      },
    });
  });

  await page.route("**/api/game/heartbeat*", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: "networkidle" });
  await page.locator("[data-play-results-closed]").waitFor();

  assert.equal(await page.locator("[data-play-results-closed]").count(), 1);
  assert.equal(
    await page.getByRole("button", { name: "לתוצאות הסופיות" }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", { name: "למסך הסיום שלי" }).count(),
    1,
  );

  await browser.close();
  console.log("verify-play-final-results-prompt: PASS");
}

void main();
