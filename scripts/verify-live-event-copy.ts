import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.localStorage.removeItem("kochav-michael-active-player");
    window.localStorage.removeItem("kochav-michael-active-session");
  });

  await page.route("**/api/public/snapshot", async (route) => {
    await route.fulfill({
      json: {
        settings: {
          introText: "בודקים טקסטי אירועים חיים",
          prizeLabels: { first: "", second: "", third: "" },
          globalSoundEnabled: true,
        },
        totalParticipants: 3,
        activePlayersNow: 2,
        leaderboard: [],
        latestPhotos: [],
        recentEvents: [
          {
            id: "event-male",
            type: "score_update",
            message: "אורי בחר תשובה והוסיף קול חדש לסקר",
            playerId: "male-player",
            playerName: "אורי",
            createdAt: new Date().toISOString(),
          },
          {
            id: "event-female",
            type: "rank_up",
            message: "מיכל בלטה בגל התשובות האחרון",
            playerId: "female-player",
            playerName: "מיכל",
            createdAt: new Date().toISOString(),
          },
          {
            id: "event-family",
            type: "photo_uploaded",
            message: 'משפחת טל העלו תמונה למשימה "משימת צילום 1"',
            playerId: "family-player",
            playerName: "משפחת טל",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
  });

  await page.route("**/api/public/gallery", async (route) => {
    await route.fulfill({
      json: { photos: [] },
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  const liveMessages = await page
    .locator("main .stage-panel-soft p.text-sm.leading-6.text-white")
    .allTextContents();

  await browser.close();

  assert.ok(
    liveMessages.includes("אורי בחר תשובה והוסיף קול חדש לסקר"),
    `Expected male event wording to stay exact, received: ${JSON.stringify(liveMessages)}`,
  );
  assert.ok(
    liveMessages.includes("מיכל בלטה בגל התשובות האחרון"),
    `Expected female event wording to stay exact, received: ${JSON.stringify(liveMessages)}`,
  );
  assert.ok(
    liveMessages.includes('משפחת טל העלו תמונה למשימה "משימת צילום 1"'),
    `Expected family event wording to stay exact, received: ${JSON.stringify(liveMessages)}`,
  );

  console.log("verify-live-event-copy: PASS");
}

void main();
