import assert from "node:assert/strict";

import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const adminPath = process.env.ADMIN_ROUTE_SEGMENT || "admin-secret-route";

function buildSnapshot(phase: "live" | "finalized") {
  const finalizedAt =
    phase === "finalized" ? new Date("2026-04-19T21:00:00.000Z").toISOString() : null;

  return {
    snapshot: {
      settings: {
        introText: "",
        prizeLabels: { first: "", second: "", third: "" },
        globalSoundEnabled: true,
      },
      players: [],
      activePlayers: [],
      leaderboard: [],
      photos: [],
      totalParticipants: 57,
      activeHostAnnouncement: null,
      hostAnnouncements: [],
      nextHostTransitionAt: null,
      surveyRuntime: {
        phase,
        closedAt: phase === "finalized" ? finalizedAt : null,
        finalizedAt,
        finalResultsSnapshot:
          phase === "finalized"
            ? {
                finalizedAt,
                totalParticipants: 57,
                questionResults: [],
              }
            : null,
        finalBannerMessage: phase === "finalized" ? "התוצאות הסופיות פורסמו" : null,
        gracePlayers: [],
      },
      surveyPhase: phase,
      finalizedAt,
      finalSurveySnapshot:
        phase === "finalized"
          ? {
              finalizedAt,
              totalParticipants: 57,
              questionResults: [],
            }
          : null,
      liveSurveyOverview: {
        questionCount: 2,
        answeredQuestionCount: 2,
        totalParticipants: 57,
        questions: [
          {
            questionId: "q1",
            questionTitle: "שאלה 1",
            prompt: "מה הכי מאפיין חיים במושב?",
            totalAnswered: 40,
            totalResponses: 45,
            skippedCount: 5,
            topOptionIds: ["a"],
            options: [
              {
                optionId: "a",
                label: "קהילה קרובה",
                voteCount: 22,
                percentage: 55,
                isTopChoice: true,
              },
              {
                optionId: "b",
                label: "שגרה רגועה",
                voteCount: 18,
                percentage: 45,
                isTopChoice: false,
              },
            ],
          },
          {
            questionId: "q2",
            questionTitle: "שאלה 2",
            prompt: "כמה אנשים צריך במושב כדי לתקן משהו?",
            totalAnswered: 38,
            totalResponses: 45,
            skippedCount: 7,
            topOptionIds: ["c"],
            options: [
              {
                optionId: "c",
                label: "כמה אנשים",
                voteCount: 30,
                percentage: 79,
                isTopChoice: true,
              },
            ],
          },
        ],
      },
      playersFinishingCurrentStep: 0,
      playerMonitor: [
        {
          playerId: "p1",
          name: "טל",
          participantType: "solo_male",
          status: "active",
          currentStepIndex: 3,
          currentStepLabel: "שאלה 4",
          answeredQuestions: 3,
          uploadedPhotos: 1,
          lastSeenAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
    },
  };
}

async function main() {
  let surveyPhase: "live" | "finalized" = "live";
  const surveyActions: string[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/api/admin/login", async (route) => {
    await route.fulfill({ status: 200, json: { ok: true } });
  });

  await page.route("**/api/admin/snapshot", async (route) => {
    await route.fulfill({
      json: buildSnapshot(surveyPhase),
    });
  });

  await page.route("**/api/admin/survey-runtime", async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    surveyActions.push(body.action ?? "");

    if (body.action === "publish-final-results") {
      surveyPhase = "finalized";
    }

    if (body.action === "reopen-live-survey") {
      surveyPhase = "live";
    }

    await route.fulfill({
      status: 200,
      json: {
        runtime: buildSnapshot(surveyPhase).snapshot.surveyRuntime,
      },
    });
  });

  await page.goto(`${baseUrl}/${adminPath}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="adminPassword"]').waitFor();
  await page.locator('input[name="adminPassword"]').fill("demo");
  await page.locator("main button").last().click();
  await page.locator("[data-admin-live-question-card]").first().waitFor();

  assert.equal(await page.locator("[data-admin-tools-section]").count(), 1);
  assert.equal(await page.locator("[data-admin-settings-section]").count(), 0);
  assert.equal(await page.locator("text=טקסט פתיחה").count(), 0);
  assert.equal(await page.locator("text=פרס 1").count(), 0);
  assert.equal(await page.locator("text=מקום ראשון").count(), 0);
  assert.equal(await page.locator("text=דשבורד סקר חי").count(), 1);
  assert.equal(await page.locator("[data-admin-live-question-card]").count(), 2);
  assert.equal(await page.locator("[data-admin-publish-final-results]").count(), 1);

  await page.locator("[data-admin-publish-final-results]").click();
  await page.locator("[data-admin-survey-confirm-modal]").waitFor();
  assert.equal(await page.locator("[data-admin-confirm-publish-final-results]").count(), 1);
  assert.equal(await page.locator("[data-admin-cancel-survey-action]").count(), 1);

  await page.locator("[data-admin-cancel-survey-action]").click();
  await page.locator("[data-admin-survey-confirm-modal]").waitFor({ state: "hidden" });
  assert.deepEqual(surveyActions, []);

  await page.locator("[data-admin-publish-final-results]").click();
  await page.locator("[data-admin-confirm-publish-final-results]").click();
  await page.locator("[data-admin-reopen-live-results]").waitFor();
  assert.deepEqual(surveyActions, ["publish-final-results"]);

  await page.locator("[data-admin-reopen-live-results]").click();
  await page.locator("[data-admin-survey-confirm-modal]").waitFor();
  assert.equal(await page.locator("[data-admin-confirm-reopen-live-results]").count(), 1);
  await page.locator("[data-admin-confirm-reopen-live-results]").click();
  await page.locator("[data-admin-reopen-live-results]").waitFor({ state: "hidden" });
  await page.locator("[data-admin-publish-final-results]").waitFor();

  assert.deepEqual(surveyActions, [
    "publish-final-results",
    "reopen-live-survey",
  ]);

  await browser.close();
  console.log("verify-admin-dashboard-ui: PASS");
}

void main();
