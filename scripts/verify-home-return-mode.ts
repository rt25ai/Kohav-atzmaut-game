import assert from "node:assert/strict";

import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

const storedSession = {
  player: {
    id: "player-home-return",
    name: "משפחת טל",
    participantType: "family",
    questionOrder: ["q1"],
    missionOrder: ["m1"],
    currentStepIndex: 0,
    totalScore: 0,
    correctAnswers: 0,
    photoMissionsCompleted: 0,
    newPeopleMet: 0,
    comboStreak: 0,
    completed: false,
    completedAt: null,
    createdAt: "2026-04-19T20:00:00.000Z",
    updatedAt: "2026-04-19T20:00:00.000Z",
    lastSeenAt: "2026-04-19T20:00:00.000Z",
    lastRank: null,
  },
  settings: {
    introText: "",
    prizeLabels: { first: "", second: "", third: "" },
    globalSoundEnabled: true,
  },
  steps: [{ kind: "question", questionId: "q1" }],
  currentStep: { kind: "question", questionId: "q1" },
  answers: [],
  leaderboard: [],
  questions: [],
  missions: [],
  surveyPhase: "live",
  finalSurveySnapshot: null,
  resultsPromptRequired: false,
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.addInitScript((session) => {
    window.localStorage.setItem(
      "kochav-michael-active-player",
      String((session as { player: { id: string } }).player.id),
    );
    window.localStorage.setItem(
      "kochav-michael-active-session",
      JSON.stringify(session),
    );
  }, storedSession);

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({ json: { session: storedSession } });
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
        activePlayersNow: 1,
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

  await page.route("**/api/public/gallery*", async (route) => {
    await route.fulfill({ json: { photos: [] } });
  });

  await page.goto(`${baseUrl}/?return=home`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-resume-game]").waitFor();

  assert.equal(await page.locator("[data-resume-game]").count(), 1);
  assert.equal(await page.locator("[data-start-new-game]").count(), 1);
  assert.match(page.url(), /\?return=home$/);

  const resumeText = await page.locator("[data-resume-game]").textContent();
  assert.match(resumeText ?? "", /המשיכו משחק/);

  await page.locator("[data-start-new-game]").click();
  await page.locator('input[name="playerName"]').waitFor();

  assert.equal(await page.locator("[data-resume-game]").count(), 0);
  assert.equal(await page.locator('input[name="playerName"]').count(), 1);

  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  const visibleHomeLink = page.locator("[data-home-link]:visible").first();
  await visibleHomeLink.waitFor();
  const homeHref = await visibleHomeLink.getAttribute("href");
  assert.equal(homeHref, "/?return=home");

  await browser.close();
  console.log("verify-home-return-mode: PASS");
}

void main();
