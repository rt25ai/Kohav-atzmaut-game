import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const adminPath = process.env.ADMIN_ROUTE_SEGMENT || "admin-secret-route";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
  });
  const page = await context.newPage();

  await page.route("**/api/admin/login", async (route) => {
    await route.fulfill({ status: 200, json: { ok: true } });
  });

  await page.route("**/api/admin/snapshot", async (route) => {
    await route.fulfill({
      json: {
        snapshot: {
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          players: [],
          activePlayers: [{ id: "p1" }, { id: "p2" }],
          leaderboard: [],
          photos: [
            {
              id: "photo-1",
              playerId: "p1",
              playerName: "טל",
              missionId: "m1",
              missionTitle: "סלפי קהילתי",
              caption: "חיוך ראשון",
              photoUrl:
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
              thumbnailUrl:
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
              hidden: false,
            },
            {
              id: "photo-2",
              playerId: "p2",
              playerName: "משפחת טל",
              missionId: "m2",
              missionTitle: "רגע חגיגי",
              caption: "עם הדגל",
              photoUrl:
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
              thumbnailUrl:
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
              hidden: false,
            },
            {
              id: "photo-3",
              playerId: "p3",
              playerName: "רועי",
              missionId: "m3",
              missionTitle: "יחד בחג",
              caption: "עוד תמונה",
              photoUrl:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
              thumbnailUrl:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
              hidden: false,
            },
          ],
          totalParticipants: 57,
          activeHostAnnouncement: null,
          hostAnnouncements: [],
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
          finalizedAt: null,
          finalSurveySnapshot: null,
          liveSurveyOverview: {
            questionCount: 3,
            answeredQuestionCount: 3,
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
              {
                questionId: "q3",
                questionTitle: "שאלה 3",
                prompt: "יש לך במקרה...?",
                totalAnswered: 35,
                totalResponses: 45,
                skippedCount: 10,
                topOptionIds: ["d"],
                options: [
                  {
                    optionId: "d",
                    label: "שיתוף הדדי",
                    voteCount: 28,
                    percentage: 80,
                    isTopChoice: true,
                  },
                ],
              },
            ],
          },
          playersFinishingCurrentStep: 1,
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
            {
              playerId: "p2",
              name: "משפחת טל",
              participantType: "family",
              status: "finishing-current-step",
              currentStepIndex: 7,
              currentStepLabel: "משימת צילום 2",
              answeredQuestions: 6,
              uploadedPhotos: 2,
              lastSeenAt: new Date().toISOString(),
              completedAt: null,
            },
            {
              playerId: "p3",
              name: "נועה",
              participantType: "solo_female",
              status: "completed",
              currentStepIndex: 26,
              currentStepLabel: "מסך סיום",
              answeredQuestions: 20,
              uploadedPhotos: 6,
              lastSeenAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
  });

  await page.goto(`${baseUrl}/${adminPath}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="adminPassword"]').waitFor();
  await page.locator('input[name="adminPassword"]').fill("demo");
  await page.locator("main button").last().click();
  await page.locator("[data-admin-tools-section]").waitFor();

  assert.equal(
    await page.locator("[data-admin-settings-section]").count(),
    0,
    "Expected the old intro and prize settings block to be removed from the admin mobile view",
  );
  assert.equal(
    await page.getByText("טקסט פתיחה", { exact: true }).count(),
    0,
    "Expected the intro text field label to be removed from the admin mobile view",
  );
  assert.equal(
    await page.getByText("פרס 1", { exact: true }).count(),
    0,
    "Expected the prize labels inputs to be removed from the admin mobile view",
  );

  assert.ok(
    (await page.locator("[data-admin-rail-hint]").count()) >= 3,
    "Expected mobile admin rails to show swipe hints",
  );

  const sectionOrder = await page.evaluate(() => {
    const selectors = [
      "[data-admin-tools-section]",
      "[data-admin-survey-control-section]",
      "[data-admin-results-section]",
      "[data-admin-host-section]",
      "[data-admin-player-monitor-section]",
      "[data-admin-gallery-section]",
    ];

    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return {
        selector,
        top: rect?.top ?? null,
      };
    });
  });

  const toolsTop = sectionOrder.find(
    (item) => item.selector === "[data-admin-tools-section]",
  )?.top;
  const surveyControlTop = sectionOrder.find(
    (item) => item.selector === "[data-admin-survey-control-section]",
  )?.top;
  const hostTop = sectionOrder.find(
    (item) => item.selector === "[data-admin-host-section]",
  )?.top;
  const resultsTop = sectionOrder.find(
    (item) => item.selector === "[data-admin-results-section]",
  )?.top;
  const galleryTop = sectionOrder.find(
    (item) => item.selector === "[data-admin-gallery-section]",
  )?.top;

  assert.notEqual(toolsTop, null, "Expected tools section in admin mobile view");
  assert.notEqual(
    surveyControlTop,
    null,
    "Expected the survey control section in admin mobile view",
  );
  assert.notEqual(hostTop, null, "Expected host section in admin mobile view");
  assert.notEqual(resultsTop, null, "Expected results section in admin mobile view");
  assert.notEqual(galleryTop, null, "Expected gallery section in admin mobile view");

  assert.ok(
    (surveyControlTop ?? 0) < (toolsTop ?? 0),
    "Expected the survey control section to appear before the quick tools section on mobile",
  );
  assert.ok(
    (toolsTop ?? 0) < (resultsTop ?? 0),
    "Expected quick tools to appear before the live results section on mobile",
  );
  assert.ok(
    (toolsTop ?? 0) < (hostTop ?? 0),
    "Expected quick tools to appear before the host announcements section on mobile",
  );
  assert.ok(
    (resultsTop ?? 0) < (galleryTop ?? 0),
    "Expected the live results section to still appear before the gallery section",
  );
  assert.ok(
    (hostTop ?? 0) < (galleryTop ?? 0),
    "Expected the host announcements section to still appear before the gallery section",
  );

  const surveyMobileLayout = await page.evaluate(() => {
    const copy = document.querySelector("[data-admin-survey-copy]");
    const button = document.querySelector("[data-admin-publish-final-results]");
    const copyText = copy?.querySelector("p:last-of-type");

    if (!(copy instanceof HTMLElement) || !(button instanceof HTMLElement)) {
      return null;
    }

    const copyRect = copy.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    return {
      copyBottom: Math.round(copyRect.bottom),
      buttonTop: Math.round(buttonRect.top),
      buttonWidth: Math.round(buttonRect.width),
      copyFontSize: copyText
        ? Number.parseFloat(window.getComputedStyle(copyText).fontSize)
        : null,
      viewportWidth: window.innerWidth,
    };
  });

  assert.ok(
    surveyMobileLayout,
    "Expected survey mobile layout metrics in admin mobile view",
  );
  assert.ok(
    (surveyMobileLayout?.buttonTop ?? 0) >= (surveyMobileLayout?.copyBottom ?? 0) - 2,
    `Expected the publish results button to sit below the copy on mobile, received ${JSON.stringify(surveyMobileLayout)}`,
  );
  assert.ok(
    (surveyMobileLayout?.buttonWidth ?? 0) >= (surveyMobileLayout?.viewportWidth ?? 0) - 120,
    `Expected the publish results button to use a mobile-friendly width, received ${JSON.stringify(surveyMobileLayout)}`,
  );
  assert.ok(
    (surveyMobileLayout?.copyFontSize ?? 0) >= 15,
    `Expected admin instruction copy to be slightly larger on mobile, received ${JSON.stringify(surveyMobileLayout)}`,
  );

  const railMetrics = await page.evaluate(() => {
    const selectors = {
      results: "[data-admin-results-rail]",
      players: "[data-admin-player-monitor-rail]",
      gallery: "[data-admin-gallery-rail]",
    } as const;

    return Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => {
        const rail = document.querySelector(selector) as HTMLElement | null;
        const items = rail
          ? Array.from(rail.children).map((child) => {
              const rect = (child as HTMLElement).getBoundingClientRect();
              return { left: rect.left, top: rect.top };
            })
          : [];

        return [
          key,
          rail
            ? {
                clientWidth: rail.clientWidth,
                scrollWidth: rail.scrollWidth,
                itemCount: items.length,
                firstTop: items[0]?.top ?? null,
                secondTop: items[1]?.top ?? null,
                firstLeft: items[0]?.left ?? null,
                secondLeft: items[1]?.left ?? null,
              }
            : null,
        ];
      }),
    );
  });

  for (const [label, rail] of Object.entries(railMetrics)) {
    assert.ok(rail, `Expected ${label} rail to exist on mobile admin`);
    assert.ok(
      (rail?.scrollWidth ?? 0) > (rail?.clientWidth ?? 0),
      `Expected ${label} rail to scroll horizontally on mobile`,
    );
    assert.ok(
      rail?.itemCount && rail.itemCount > 1,
      `Expected ${label} rail to contain multiple cards`,
    );
    assert.ok(
      Math.abs((rail?.firstTop ?? 0) - (rail?.secondTop ?? 0)) < 2,
      `Expected ${label} rail cards to stay on one horizontal row`,
    );
    assert.ok(
      Math.abs((rail?.secondLeft ?? 0) - (rail?.firstLeft ?? 0)) > 20,
      `Expected ${label} rail cards to advance horizontally in the mobile rail`,
    );
  }

  await browser.close();
  console.log("verify-admin-mobile-layout: PASS");
}

void main();
