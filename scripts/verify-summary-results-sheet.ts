import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const playerId = "summary-results-sheet-test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: "kochav-michael-active-player", value: playerId },
  );

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Summary Results Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 7,
            comboStreak: 0,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          rank: 1,
          totalPlayers: 3,
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          leaderboard: [],
          survey: {
            playerId,
            completed: true,
            questionResults: [
              {
                questionId: "q1",
                questionTitle: "שאלה 1",
                prompt: "מה הכי מאפיין חיים במושב?",
                totalAnswered: 10,
                totalResponses: 12,
                skippedCount: 2,
                playerChoiceOptionId: "opt-a",
                playerComparison: "top-choice",
                topOptionIds: ["opt-a"],
                options: [
                  {
                    optionId: "opt-a",
                    label: "קהילה קרובה",
                    voteCount: 7,
                    percentage: 58,
                    isTopChoice: true,
                    isPlayerChoice: true,
                  },
                  {
                    optionId: "opt-b",
                    label: "שגרה רגועה",
                    voteCount: 3,
                    percentage: 25,
                    isTopChoice: false,
                    isPlayerChoice: false,
                  },
                ],
              },
              {
                questionId: "q2",
                questionTitle: "שאלה 2",
                prompt: "כמה אנשים צריך במושב כדי לתקן משהו?",
                totalAnswered: 9,
                totalResponses: 12,
                skippedCount: 3,
                playerChoiceOptionId: null,
                playerComparison: "skipped",
                topOptionIds: ["opt-c"],
                options: [
                  {
                    optionId: "opt-c",
                    label: "כמה אנשים",
                    voteCount: 5,
                    percentage: 56,
                    isTopChoice: true,
                    isPlayerChoice: false,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  });

  await page.goto(`${baseUrl}/summary`, { waitUntil: "networkidle" });

  await page.locator("[data-summary-open-results]").click();
  await page.locator("[data-summary-results-sheet]").waitFor();

  assert.equal(await page.locator("[data-summary-result-card]").count(), 1);
  assert.equal(
    (await page.locator("[data-summary-results-card-index]").textContent())?.trim(),
    "1 / 2",
  );
  assert.equal(await page.locator("[data-summary-single-bar]").count(), 1);
  assert.equal(await page.locator("[data-survey-results-list]").count(), 0);

  await page.locator("[data-summary-results-next]").click();
  await page.waitForFunction(() => {
    const element = document.querySelector("[data-summary-results-card-index]");
    return element?.textContent?.trim() === "2 / 2";
  });

  assert.equal(
    (await page.locator("[data-summary-results-card-index]").textContent())?.trim(),
    "2 / 2",
  );
  assert.equal(await page.locator("[data-summary-skip-state]").count(), 1);

  await page.locator("[data-summary-results-close]").click();
  await page.locator("[data-summary-results-sheet]").waitFor({
    state: "hidden",
  });

  await browser.close();

  console.log("verify-summary-results-sheet: PASS");
}

void main();
