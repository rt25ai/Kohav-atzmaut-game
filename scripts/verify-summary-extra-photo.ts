import assert from "node:assert/strict";
import path from "node:path";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const playerId = "summary-extra-photo-test";
const fixturePath = path.join(
  process.cwd(),
  "public",
  "branding",
  "home-hero-bg-custom.png",
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  const uploadedCaptions: string[] = [];

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
            name: "Summary Test",
            participantType: "solo_female",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 8,
            comboStreak: 0,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          rank: 1,
          totalPlayers: 1,
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
                questionId: "q-1",
                questionTitle: "שאלה 1",
                prompt: "מה הכי מאפיין חיים במושב?",
                totalAnswered: 8,
                totalResponses: 8,
                skippedCount: 0,
                playerChoiceOptionId: "a",
                playerComparison: "top-choice",
                topOptionIds: ["a"],
                options: [
                  {
                    optionId: "a",
                    label: "קהילה קרובה",
                    voteCount: 5,
                    percentage: 63,
                    isTopChoice: true,
                    isPlayerChoice: true,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  });

  await page.route("**/api/game/extra-photo", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    uploadedCaptions.push(body.caption);
    await route.fulfill({
      json: {
        photo: {
          id: `${uploadedCaptions.length}`,
          caption: body.caption,
          photoUrl: body.photoUrl,
          thumbnailUrl: body.thumbnailUrl,
          createdAt: new Date().toISOString(),
        },
      },
    });
  });

  await page.goto(`${baseUrl}/summary`, { waitUntil: "domcontentloaded" });
  await page
    .locator("[data-festive-confetti]")
    .first()
    .waitFor({ timeout: 2_000 });
  await page.locator("[data-summary-new-game]").waitFor();
  await page.locator("[data-summary-open-results]").waitFor();

  const initialSummaryMetrics = await page.evaluate(() => {
    const confetti = document.querySelector("[data-festive-confetti]");
    const rect = confetti?.getBoundingClientRect() ?? null;

    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      confettiHeight: rect?.height ?? 0,
    };
  });

  await page.setInputFiles("[data-summary-extra-file-input]", fixturePath);
  await page
    .locator("[data-summary-extra-caption]")
    .fill("רגע ראשון מהסיום");
  await page.locator("[data-summary-extra-submit]").scrollIntoViewIfNeeded();
  const scrollBeforeFirstUpload = await page.evaluate(() => window.scrollY);
  await page.locator("[data-summary-extra-submit]").click();
  await page.locator("[data-summary-extra-item]").first().waitFor();
  const scrollAfterFirstUpload = await page.evaluate(() => window.scrollY);

  await page.setInputFiles("[data-summary-extra-file-input]", fixturePath);
  await page
    .locator("[data-summary-extra-caption]")
    .fill("עוד תמונה חגיגית");
  await page.locator("[data-summary-extra-submit]").scrollIntoViewIfNeeded();
  const scrollBeforeSecondUpload = await page.evaluate(() => window.scrollY);
  await page.locator("[data-summary-extra-submit]").click();
  await page.locator("[data-summary-extra-item]").nth(1).waitFor();

  const itemCount = await page.locator("[data-summary-extra-item]").count();
  const successText = await page
    .locator("[data-summary-extra-success]")
    .textContent();
  const finalScrollY = await page.evaluate(() => window.scrollY);
  const newGameButtonCount = await page.locator("[data-summary-new-game]").count();
  const openResultsButtonCount = await page
    .locator("[data-summary-open-results]")
    .count();

  await browser.close();

  assert.ok(
    initialSummaryMetrics.scrollY <= 8,
    `Expected summary to open from the top, received scrollY=${initialSummaryMetrics.scrollY}`,
  );
  assert.ok(
    initialSummaryMetrics.confettiHeight >=
      initialSummaryMetrics.viewportHeight * 0.35,
    `Expected visible festive confetti coverage, received ${initialSummaryMetrics.confettiHeight}px for viewport ${initialSummaryMetrics.viewportHeight}px`,
  );
  assert.equal(newGameButtonCount, 1);
  assert.equal(openResultsButtonCount, 1);
  assert.deepEqual(uploadedCaptions, ["רגע ראשון מהסיום", "עוד תמונה חגיגית"]);
  assert.equal(itemCount, 2);
  assert.ok(
    (successText ?? "").trim().length > 0,
    "Expected a visible success message after uploading an extra photo",
  );
  assert.ok(
    Math.abs(scrollAfterFirstUpload - scrollBeforeFirstUpload) <= 48,
    `Expected the first summary upload to preserve the current view, received before=${scrollBeforeFirstUpload} after=${scrollAfterFirstUpload}`,
  );
  assert.ok(
    Math.abs(finalScrollY - scrollBeforeSecondUpload) <= 48,
    `Expected the second summary upload to preserve the current view, received before=${scrollBeforeSecondUpload} after=${finalScrollY}`,
  );

  console.log("verify-summary-extra-photo: PASS");
}

void main();
