import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const playerName = `Mobile Play Test ${Date.now()}`;
const savedBadgeLabel = "\u05E0\u05E9\u05DE\u05E8";

async function collectFirstAnswerLayout(
  page: Awaited<ReturnType<typeof chromium.launch>> extends never ? never : any,
) {
  return page.evaluate(() => {
    const firstAnswer = document.querySelector("button[aria-pressed]");
    if (!(firstAnswer instanceof HTMLElement)) {
      return null;
    }

    const badge = firstAnswer.querySelector(":scope > span");
    const content = firstAnswer.querySelector(":scope > div");

    if (!(badge instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      return null;
    }

    const badgeRect = badge.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    return {
      badgeText: badge.textContent?.trim() ?? "",
      badgeLeft: Math.round(badgeRect.left),
      badgeRight: Math.round(badgeRect.right),
      contentLeft: Math.round(contentRect.left),
      contentRight: Math.round(contentRect.right),
    };
  });
}

async function main() {
  const startResponse = await fetch(`${baseUrl}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: playerName,
      participantType: "solo_male",
    }),
  });

  assert.equal(startResponse.status, 200, "Expected game start to succeed");
  const startJson = (await startResponse.json()) as {
    session: Record<string, unknown>;
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
  });
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
  }, startJson.session);

  await page.route("**/api/game/session?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  await page.locator("main .section-kicker").first().waitFor();
  await page.waitForTimeout(250);

  const stepLabelBefore = await page
    .locator("main .section-kicker")
    .first()
    .textContent();
  const initialAnswerLayout = await collectFirstAnswerLayout(page);
  await page.locator("button[aria-pressed]").first().click();
  await page.locator("[data-festive-accent]").first().waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const badge = document.querySelector("button[aria-pressed] > span");
    return badge?.textContent?.trim() === "\u05E0\u05E9\u05DE\u05E8";
  });
  const confirmedAnswerLayout = await collectFirstAnswerLayout(page);
  const festiveMetrics = await page.evaluate(() => {
    const accent = document.querySelector("[data-festive-accent]");
    const accentRect = accent?.getBoundingClientRect() ?? null;

    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      accentRect: accentRect
        ? {
            left: Math.round(accentRect.left),
            right: Math.round(accentRect.right),
          }
        : null,
    };
  });

  await page.evaluate(() => window.scrollTo({ top: 900, left: 0 }));
  await page.locator("button.hero-button-primary").last().click({ force: true });
  await page.waitForFunction(
    (previousLabel) => {
      const currentLabel = document
        .querySelector("main .section-kicker")
        ?.textContent?.trim();

      return Boolean(currentLabel && currentLabel !== previousLabel);
    },
    stepLabelBefore?.trim() ?? "",
  );
  await page.waitForFunction(() => window.scrollY <= 8, { timeout: 800 });

  const scrollAfterTransition = await page.evaluate(() => window.scrollY);

  const metrics = await page.evaluate(() => {
    const header = document.querySelector("header");
    const headerPanel = header?.firstElementChild;
    const mainHeading = document.querySelector("main h1");
    const interactiveHeaderNodes = Array.from(
      document.querySelectorAll("header a, header button, header p, header img"),
    );
    const headerPanelRect = headerPanel?.getBoundingClientRect() ?? null;

    return {
      viewportWidth: window.innerWidth,
      headerPanelHeight: headerPanel?.getBoundingClientRect().height ?? 0,
      mainHeadingText: mainHeading?.textContent?.trim() ?? "",
      overflowingHeaderNodes: interactiveHeaderNodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            text:
              node.getAttribute("aria-label") ||
              node.textContent?.trim() ||
              node.getAttribute("alt") ||
              node.tagName,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
          };
        })
        .filter((node) => node.left < 0 || node.right > window.innerWidth + 1),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      headerPanelRect: headerPanelRect
        ? {
            left: Math.round(headerPanelRect.left),
            right: Math.round(headerPanelRect.right),
            top: Math.round(headerPanelRect.top),
            bottom: Math.round(headerPanelRect.bottom),
            width: Math.round(headerPanelRect.width),
            height: Math.round(headerPanelRect.height),
          }
        : null,
    };
  });

  await browser.close();

  assert.equal(
    metrics.scrollWidth,
    metrics.clientWidth,
    `Expected play screen to avoid horizontal overflow, received scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
  );

  assert.equal(
    metrics.overflowingHeaderNodes.length,
    0,
    `Expected all mobile header items to stay inside the viewport, received: ${JSON.stringify(metrics.overflowingHeaderNodes)}`,
  );

  assert.ok(
    metrics.headerPanelHeight <= 160,
    `Expected compact mobile header height, received ${metrics.headerPanelHeight}px`,
  );

  assert.ok(
    metrics.mainHeadingText.length > 0,
    "Expected play screen content to render immediately after start without a full-screen loading state",
  );

  assert.ok(initialAnswerLayout, "Expected a visible first answer option before selection");
  assert.ok(
    initialAnswerLayout.badgeLeft >= initialAnswerLayout.contentRight - 1,
    `Expected the mobile answer badge to appear on the right before selection, received ${JSON.stringify(initialAnswerLayout)}`,
  );

  assert.ok(confirmedAnswerLayout, "Expected a visible first answer option after selection");
  assert.ok(
    festiveMetrics.accentRect,
    "Expected festive answer feedback to appear after the save state",
  );
  assert.equal(
    festiveMetrics.scrollWidth,
    festiveMetrics.clientWidth,
    `Expected festive feedback to avoid horizontal overflow, received scrollWidth=${festiveMetrics.scrollWidth} clientWidth=${festiveMetrics.clientWidth}`,
  );
  assert.equal(
    confirmedAnswerLayout.badgeText,
    savedBadgeLabel,
    `Expected the confirmed answer badge to show "${savedBadgeLabel}", received ${JSON.stringify(confirmedAnswerLayout)}`,
  );
  assert.ok(
    confirmedAnswerLayout.badgeLeft >= confirmedAnswerLayout.contentRight - 1,
    `Expected the confirmed mobile answer badge to remain on the right, received ${JSON.stringify(confirmedAnswerLayout)}`,
  );
  assert.ok(
    scrollAfterTransition <= 8,
    `Expected the next step to open from the top, received scrollY=${scrollAfterTransition}`,
  );

  console.log("verify-mobile-play: PASS");
}

void main();
