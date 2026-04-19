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
    id: "player-mission-scroll-stability",
    name: "טל",
    participantType: "solo_male",
    questionOrder: ["q-after-mission"],
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
    { kind: "mission", missionId: "m-live" },
    { kind: "question", questionId: "q-after-mission" },
  ],
  currentStep: { kind: "mission", missionId: "m-live" },
  answers: [],
  leaderboard: [],
  questions: [
    {
      type: "mcq",
      id: "q-after-mission",
      title: "שאלה 2",
      prompt:
        "מה הכי מסכם את הרגע הזה בקהילה שלנו, ואיך הייתם רוצים לזכור אותו גם בעוד כמה חודשים?",
      options: [
        {
          id: "a",
          label:
            "רגע שקט, מלא נוכחות, עם הרבה אנשים שמכירים אחד את השני טוב יותר בזכות הערב הזה",
        },
        {
          id: "b",
          label:
            "מפגש שמרגיש קטן ואישי אבל עדיין נותן תחושה של חגיגה משותפת וגדולה לכל מי שנמצא כאן",
        },
        {
          id: "c",
          label:
            "ערב חי ותוסס במיוחד, כזה שגורם לכולם לחייך, להצטלם ולהרגיש חלק ממשהו גדול יותר",
        },
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
      prompt: "צלמו רגע מהאירוע והעלו אותו כאן יחד עם תיאור קצר של מה רואים בתמונה.",
      basePoints: 250,
      isFinal: false,
    },
  ],
  surveyPhase: "live",
  finalSurveySnapshot: null,
  resultsPromptRequired: false,
};

const nextQuestionSession = {
  ...missionSession,
  player: {
    ...missionSession.player,
    currentStepIndex: 1,
    photoMissionsCompleted: 1,
    updatedAt: "2026-04-19T20:00:05.000Z",
    lastSeenAt: "2026-04-19T20:00:05.000Z",
  },
  currentStep: { kind: "question", questionId: "q-after-mission" },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  await context.addInitScript(() => {
    window.localStorage.setItem(
      "kochav-michael-active-player",
      "player-mission-scroll-stability",
    );

    const scopedWindow = window as Window & {
      __codexScrollOps?: Array<Record<string, unknown>>;
    };
    scopedWindow.__codexScrollOps = [];

    const pushScrollOp = (entry: Record<string, unknown>) => {
      scopedWindow.__codexScrollOps?.push({
        ...entry,
        at: Math.round(performance.now()),
      });
    };

    const originalWindowScrollTo = window.scrollTo.bind(window);
    window.scrollTo = ((...args: Parameters<typeof window.scrollTo>) => {
      const [firstArg, secondArg] = args;
      const optionsArg =
        typeof firstArg === "object" && firstArg
          ? (firstArg as ScrollToOptions)
          : null;
      const top =
        optionsArg
          ? optionsArg.top ?? null
          : typeof secondArg === "number"
            ? secondArg
            : null;

      pushScrollOp({ kind: "window.scrollTo", top });
      return originalWindowScrollTo(...args);
    }) as typeof window.scrollTo;

    const originalElementScrollTo = Element.prototype.scrollTo;
    Element.prototype.scrollTo = (function (
      this: Element,
      ...args: Parameters<Element["scrollTo"]>
    ) {
      const [firstArg, secondArg] = args;
      const optionsArg =
        typeof firstArg === "object" && firstArg
          ? (firstArg as ScrollToOptions)
          : null;
      const top =
        optionsArg
          ? optionsArg.top ?? null
          : typeof secondArg === "number"
            ? secondArg
            : null;

      pushScrollOp({
        kind: "element.scrollTo",
        top,
        tagName: this.tagName,
      });

      return originalElementScrollTo.apply(this, args);
    }) as typeof Element.prototype.scrollTo;

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (
      this: Element,
      arg?: boolean | ScrollIntoViewOptions,
    ) {
      pushScrollOp({
        kind: "element.scrollIntoView",
        tagName: this.tagName,
        block:
          typeof arg === "object" && arg
            ? (arg.block ?? null)
            : typeof arg === "boolean"
              ? (arg ? "start" : "end")
              : null,
      });

      return originalScrollIntoView.call(this, arg);
    } as typeof Element.prototype.scrollIntoView;
  });

  await page.route("**/api/game/session?*", async (route) => {
    await route.fulfill({ json: { session: missionSession } });
  });

  await page.route("**/api/game/heartbeat*", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/game/mission", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    await route.fulfill({
      json: {
        session: nextQuestionSession,
        outcome: { rankImproved: false },
      },
    });
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-mission-photo-picker]").waitFor();

  const picker = page.locator("[data-mission-photo-picker]");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await picker.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(fixturePath);
  await page.waitForFunction(() => {
    const previewImage = document.querySelector('img[alt*="תצוגה"]');
    return Boolean(previewImage);
  });

  await page.locator("button.hero-button-primary").last().scrollIntoViewIfNeeded();
  await page.locator("button.hero-button-primary").last().click();
  await page.locator("[data-answer-option]").first().waitFor();

  const stability = await page.evaluate(async () => {
    const scopedWindow = window as Window & {
      __codexScrollOps?: Array<Record<string, unknown>>;
    };
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const targetScrollY = Math.min(260, maxScroll);

    window.scrollTo({ top: targetScrollY, left: 0, behavior: "auto" });
    scopedWindow.__codexScrollOps = [];

    const samples: Array<{ at: number; y: number }> = [];
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const intervalId = window.setInterval(() => {
        samples.push({
          at: Math.round(performance.now() - start),
          y: Math.round(window.scrollY),
        });

        if (performance.now() - start >= 900) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, 16);
    });

    return {
      targetScrollY,
      finalScrollY: Math.round(window.scrollY),
      minScrollY: Math.min(...samples.map((sample) => sample.y)),
      maxScrollY: Math.max(...samples.map((sample) => sample.y)),
      lateMinScrollY: Math.min(
        ...samples
          .filter((sample) => sample.at >= 300)
          .map((sample) => sample.y),
      ),
      samples,
      scrollOps: scopedWindow.__codexScrollOps ?? [],
    };
  });

  await browser.close();

  assert.ok(
    stability.targetScrollY >= 180,
    `Expected the question screen to allow a meaningful manual scroll, received target=${stability.targetScrollY}`,
  );
  assert.ok(
    stability.finalScrollY >= stability.targetScrollY - 20,
    `Expected manual scroll after mission transition to settle near the requested position, received ${JSON.stringify(stability)}`,
  );
  assert.ok(
    stability.lateMinScrollY >= stability.targetScrollY - 20,
    `Expected manual scroll after mission transition to stay stable, received ${JSON.stringify(stability)}`,
  );
  assert.equal(
    stability.scrollOps.filter((entry) => Number(entry.top ?? 0) <= 8).length,
    0,
    `Expected no follow-up forced top-scroll after the user scrolls the next question, received ${JSON.stringify(stability.scrollOps)}`,
  );

  console.log("verify-mission-transition-scroll-stability: PASS");
}

void main();
