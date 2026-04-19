import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const sessionKey = "kochav-michael-active-player";
const snapshotKey = "kochav-michael-active-session";

async function verifyResume(
  completed: boolean,
  expectedPath: "/play" | "/summary",
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  const playerId = completed ? "resume-summary-player" : "resume-play-player";

  await page.addInitScript(
    ({
      activeKey,
      activeValue,
      cachedKey,
      cachedValue,
    }: {
      activeKey: string;
      activeValue: string;
      cachedKey: string;
      cachedValue: string;
    }) => {
      window.localStorage.setItem(activeKey, activeValue);
      window.localStorage.setItem(cachedKey, cachedValue);
    },
    {
      activeKey: sessionKey,
      activeValue: playerId,
      cachedKey: snapshotKey,
      cachedValue: JSON.stringify({
        player: {
          id: playerId,
          name: "Resume Test",
          participantType: "solo_male",
          currentStepIndex: completed ? 26 : 4,
          completed,
        },
      }),
    },
  );

  await page.route("**/api/public/snapshot", async (route) => {
    await route.fulfill({
      json: {
        settings: {
          introText: "בדיקת חזרה אוטומטית",
          prizeLabels: { first: "", second: "", third: "" },
          globalSoundEnabled: true,
        },
        totalParticipants: 1,
        activePlayersNow: 1,
        leaderboard: [],
        latestPhotos: [],
        recentEvents: [],
      },
    });
  });

  await page.route("**/api/public/gallery", async (route) => {
    await route.fulfill({
      json: { photos: [] },
    });
  });

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({
      json: {
        session: {
          player: {
            id: playerId,
            name: "Resume Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: completed ? 26 : 4,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: completed ? 6 : 1,
            newPeopleMet: 0,
            comboStreak: 0,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          steps: [],
          currentStep: null,
          answers: [],
          leaderboard: [],
          questions: [],
          missions: [],
        },
      },
    });
  });

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Resume Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 0,
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
          survey: { playerId, completed: true, questionResults: [] },
        },
      },
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForURL(`**${expectedPath}`, { timeout: 10_000 });

  assert.equal(new URL(page.url()).pathname, expectedPath);

  await browser.close();
}

async function verifyRestartFromSummary() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  const playerId = "restart-summary-player";

  await page.addInitScript(
    ({
      activeKey,
      activeValue,
      cachedKey,
      cachedValue,
    }: {
      activeKey: string;
      activeValue: string;
      cachedKey: string;
      cachedValue: string;
    }) => {
      window.localStorage.setItem(activeKey, activeValue);
      window.localStorage.setItem(cachedKey, cachedValue);
    },
    {
      activeKey: sessionKey,
      activeValue: playerId,
      cachedKey: snapshotKey,
      cachedValue: JSON.stringify({
        player: {
          id: playerId,
          name: "Restart Test",
          participantType: "solo_male",
          currentStepIndex: 26,
          completed: true,
        },
      }),
    },
  );

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Restart Test",
            participantType: "solo_male",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 0,
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
          survey: { playerId, completed: true, questionResults: [] },
        },
      },
    });
  });

  await page.goto(`${baseUrl}/summary`, { waitUntil: "networkidle" });
  await page.locator("[data-summary-new-game]").click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 10_000 });

  const storageState = await page.evaluate(
    ({ activeKey, cachedKey }) => ({
      active: window.localStorage.getItem(activeKey),
      session: window.localStorage.getItem(cachedKey),
    }),
    { activeKey: sessionKey, cachedKey: snapshotKey },
  );

  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(storageState.active, null);
  assert.equal(storageState.session, null);

  await browser.close();
}

async function main() {
  await verifyResume(false, "/play");
  await verifyResume(true, "/summary");
  await verifyRestartFromSummary();

  console.log("verify-resume-flow: PASS");
}

void main();
