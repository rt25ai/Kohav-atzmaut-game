import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

type DeviceCheck = {
  label: string;
  deviceName: keyof typeof devices;
};

type Sample = {
  label: string;
  scrollWidth: number;
  clientWidth: number;
  scrollX: number;
};

type Bounds = {
  left: number;
  right: number;
  width: number;
};

type LayoutMetrics = {
  viewportWidth: number;
  header: Bounds | null;
  hero: Bounds | null;
};

const deviceChecks: DeviceCheck[] = [
  { label: "android", deviceName: "Galaxy S9+" },
  { label: "iphone", deviceName: "iPhone 13" },
];

async function collectSample(
  page: Awaited<ReturnType<typeof chromium.launch>> extends never ? never : any,
  label: string,
): Promise<Sample> {
  return page.evaluate(
    (sampleLabel: string) => ({
      label: sampleLabel,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollX: window.scrollX,
    }),
    label,
  );
}

async function collectLayoutMetrics(
  page: Awaited<ReturnType<typeof chromium.launch>> extends never ? never : any,
): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const headerElement = document.querySelector("header .stage-panel");
    const heroElement = document.querySelector("main section");
    const headerRect = headerElement?.getBoundingClientRect() ?? null;
    const heroRect = heroElement?.getBoundingClientRect() ?? null;

    return {
      viewportWidth: window.innerWidth,
      header: headerRect
        ? {
            left: headerRect.left,
            right: headerRect.right,
            width: headerRect.width,
          }
        : null,
      hero: heroRect
        ? {
            left: heroRect.left,
            right: heroRect.right,
            width: heroRect.width,
          }
        : null,
    };
  });
}

async function verifyDevice(check: DeviceCheck) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices[check.deviceName],
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(120);

  const introOverlayPresent = await page.evaluate(
    () => document.querySelector("[data-reduced-motion]") !== null,
  );

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);

  const top = await collectSample(page, "top");
  const topLayout = await collectLayoutMetrics(page);
  const fakeSummaryPreviewCount = await page
    .getByText("בסוף המשחק", { exact: true })
    .count();
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(250);
  const mid = await collectSample(page, "mid");
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(250);
  const lower = await collectSample(page, "lower");

  await browser.close();

  assert.equal(
    introOverlayPresent,
    false,
    `Expected the ${check.label} mobile home page to open without a full-screen intro overlay`,
  );

  for (const sample of [top, mid, lower]) {
    assert.equal(
      sample.scrollWidth,
      sample.clientWidth,
      `Expected no horizontal overflow on mobile home at ${sample.label} for ${check.label}, received scrollWidth=${sample.scrollWidth} clientWidth=${sample.clientWidth}`,
    );

    assert.equal(
      sample.scrollX,
      0,
      `Expected no horizontal offset on mobile home at ${sample.label} for ${check.label}, received scrollX=${sample.scrollX}`,
    );
  }

  assert.ok(topLayout.header, `Expected a mobile header panel for ${check.label}`);
  assert.ok(topLayout.hero, `Expected a home hero section for ${check.label}`);
  assert.equal(
    fakeSummaryPreviewCount,
    0,
    `Expected the ${check.label} mobile home page to avoid showing a fake end-of-game preview card`,
  );

  for (const target of [topLayout.header, topLayout.hero]) {
    assert.ok(target, `Missing layout target for ${check.label}`);
    assert.ok(
      target.left >= 0,
      `Expected ${check.label} mobile layout to stay flush on the left edge, received left=${target.left}`,
    );
    assert.ok(
      target.right <= topLayout.viewportWidth,
      `Expected ${check.label} mobile layout to stay inside the right edge, received right=${target.right} viewport=${topLayout.viewportWidth}`,
    );
  }
}

async function main() {
  for (const deviceCheck of deviceChecks) {
    await verifyDevice(deviceCheck);
  }

  console.log("verify-mobile-home: PASS");
}

void main();
