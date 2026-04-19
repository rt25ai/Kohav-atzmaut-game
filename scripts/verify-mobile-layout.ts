import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const hydrationErrorPattern = /Hydration failed/i;
const corruptedCopyPattern = /\?{3,}/;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollX: window.scrollX,
    introText:
      document.querySelector("h1 + p")?.textContent?.trim() ?? "",
  }));

  await browser.close();

  assert.equal(
    pageErrors.some((message) => hydrationErrorPattern.test(message)),
    false,
    `Expected no hydration mismatch errors, received: ${pageErrors.join("\n\n")}`,
  );

  assert.equal(
    metrics.scrollWidth,
    metrics.clientWidth,
    `Expected no horizontal overflow on mobile, received scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
  );

  assert.equal(
    metrics.scrollX,
    0,
    `Expected mobile page to start without horizontal offset, received scrollX=${metrics.scrollX}`,
  );

  assert.equal(
    corruptedCopyPattern.test(metrics.introText),
    false,
    `Expected landing intro copy to stay readable, received: ${metrics.introText}`,
  );

  console.log("verify-mobile-layout: PASS");
}

void main();
