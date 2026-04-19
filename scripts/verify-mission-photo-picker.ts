import assert from "node:assert/strict";
import path from "node:path";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const fixturePath = path.join(
  process.cwd(),
  "public",
  "branding",
  "home-hero-bg-custom.png",
);

const missionSession = {
  player: {
    id: "player-mission-photo-picker",
    name: "טל",
    participantType: "solo_male",
    questionOrder: ["q-live"],
    missionOrder: ["m-live"],
    currentStepIndex: 1,
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
  currentStep: { kind: "mission", missionId: "m-live" },
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
  });
  const page = await context.newPage();

  await context.addInitScript(() => {
    window.localStorage.setItem(
      "kochav-michael-active-player",
      "player-mission-photo-picker",
    );
  });

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({ json: { session: missionSession } });
  });

  await page.route("**/api/game/heartbeat*", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "משימת צילום" }).waitFor();

  const picker = page.locator("[data-mission-photo-picker]");
  await picker.waitFor();
  assert.equal(
    await page.locator("[data-mission-photo-picker]").count(),
    1,
    "Expected a single mission photo picker trigger",
  );
  assert.equal(
    await picker.evaluate((element) => element.tagName),
    "BUTTON",
    "Expected the mission photo picker to use a button trigger instead of a label to avoid mobile scroll jumps",
  );
  assert.equal(await page.locator("[data-mission-photo-input]").count(), 1);

  await page.evaluate(() => window.scrollTo({ top: 420, left: 0, behavior: "auto" }));
  const fileChooserPromise = page.waitForEvent("filechooser");
  await picker.click();
  const fileChooser = await fileChooserPromise;
  const scrollBeforeSelection = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  await fileChooser.setFiles(fixturePath);
  await page.waitForFunction(() => {
    const previewImage = document.querySelector('img[alt*="תצוגה"]');
    return Boolean(previewImage);
  });
  const scrollAfterSelection = await page.evaluate(() => window.scrollY);

  assert.ok(
    Math.abs(scrollAfterSelection - scrollBeforeSelection) <= 48,
    `Expected mission photo selection to preserve the current view, received before=${scrollBeforeSelection} after=${scrollAfterSelection}`,
  );

  await browser.close();
  console.log("verify-mission-photo-picker: PASS");
}

void main();
