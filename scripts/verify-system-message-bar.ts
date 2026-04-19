import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const announcementText = "התוצאות הסופיות פורסמו";

const deviceChecks = ["Galaxy S9+", "iPhone 13"] as const;

const finalSurveySnapshot = {
  finalizedAt: "2026-04-19T18:35:00.000Z",
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
};

async function verifyDevice(deviceName: (typeof deviceChecks)[number]) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();

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
          message: announcementText,
          startedAt: "2026-04-19T18:35:00.000Z",
          endsAt: null,
        },
        nextHostTransitionAt: null,
        surveyRuntime: {
          phase: "finalized",
          closedAt: "2026-04-19T18:34:00.000Z",
          finalizedAt: "2026-04-19T18:35:00.000Z",
          finalResultsSnapshot: finalSurveySnapshot,
          finalBannerMessage: announcementText,
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
        results: null,
        surveyPhase: "finalized",
        finalSurveySnapshot,
      },
    });
  });

  await page.goto(`${baseUrl}/results`, { waitUntil: "networkidle" });
  const messageBar = page.locator("[data-system-message-bar]");
  await messageBar.waitFor({ state: "visible" });

  const text = await messageBar.textContent();
  const metrics = await page.evaluate(() => {
    const bar = document.querySelector("[data-system-message-bar]");
    const rect = bar?.getBoundingClientRect() ?? null;

    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      rect: rect
        ? {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            height: Math.round(rect.height),
          }
        : null,
    };
  });

  await browser.close();

  assert.match(text ?? "", new RegExp(announcementText));
  assert.equal(
    metrics.scrollWidth,
    metrics.clientWidth,
    `Expected message bar to avoid horizontal overflow on ${deviceName}`,
  );
  assert.ok(metrics.rect, `Expected a visible message bar on ${deviceName}`);
  assert.ok(
    (metrics.rect?.left ?? -1) >= 0,
    `Expected message bar to stay inside the left edge on ${deviceName}`,
  );
  assert.ok(
    (metrics.rect?.right ?? metrics.viewportWidth + 1) <= metrics.viewportWidth,
    `Expected message bar to stay inside the right edge on ${deviceName}`,
  );
}

async function main() {
  for (const deviceName of deviceChecks) {
    await verifyDevice(deviceName);
  }

  console.log("verify-system-message-bar: PASS");
}

void main();
