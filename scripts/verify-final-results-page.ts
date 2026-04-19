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

  const finalSurveySnapshot = {
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
          {
            optionId: "b",
            label: "שגרה רגועה",
            voteCount: 25,
            percentage: 45,
            isTopChoice: false,
          },
        ],
      },
      {
        questionId: "q2",
        questionTitle: "שאלה 2",
        prompt: "כמה אנשים צריך במושב כדי לתקן משהו?",
        totalAnswered: 56,
        totalResponses: 56,
        skippedCount: 0,
        topOptionIds: ["c"],
        options: [
          {
            optionId: "c",
            label: "כמה אנשים",
            voteCount: 41,
            percentage: 73,
            isTopChoice: true,
          },
        ],
      },
    ],
  };

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
        activePlayersNow: 0,
        leaderboard: [],
        latestPhotos: [],
        recentEvents: [],
        activeHostAnnouncement: null,
        activeSystemBanner: {
          type: "final-results",
          message: "התוצאות הסופיות פורסמו",
          startedAt: "2026-04-19T20:31:00.000Z",
          endsAt: null,
        },
        nextHostTransitionAt: null,
        surveyRuntime: {
          phase: "finalized",
          closedAt: "2026-04-19T20:30:00.000Z",
          finalizedAt: "2026-04-19T20:31:00.000Z",
          finalResultsSnapshot: finalSurveySnapshot,
          finalBannerMessage: "התוצאות הסופיות פורסמו",
          gracePlayers: [],
        },
        surveyPhase: "finalized",
        finalSurveySnapshot,
      },
    });
  });

  await page.route("**/api/game/results*", async (route) => {
    await route.fulfill({
      json: {
        surveyPhase: "finalized",
        finalSurveySnapshot,
        results: {
          playerId: "player-1",
          completed: false,
          questionResults: [
            {
              questionId: "q1",
              questionTitle: "שאלה 1",
              prompt: "מה הכי מאפיין חיים במושב?",
              totalAnswered: 56,
              totalResponses: 56,
              skippedCount: 0,
              playerChoiceOptionId: "a",
              playerComparison: "top-choice",
              topOptionIds: ["a"],
              options: [
                {
                  optionId: "a",
                  label: "קהילה קרובה",
                  voteCount: 31,
                  percentage: 55,
                  isTopChoice: true,
                  isPlayerChoice: true,
                },
              ],
            },
          ],
        },
      },
    });
  });

  await page.goto(`${baseUrl}/results`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-final-results-showcase]").waitFor();

  assert.equal(await page.locator("[data-final-result-card]").count(), 2);
  assert.equal(
    await page.getByText("כך הקהילה בחרה הערב", { exact: false }).count(),
    1,
  );
  assert.equal(await page.locator("[data-system-message-bar]").count(), 1);

  await browser.close();
  console.log("verify-final-results-page: PASS");
}

void main();
