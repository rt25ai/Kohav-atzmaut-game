import assert from "node:assert/strict";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
  });

  await context.addInitScript(() => {
    (window as Window & { __soundStarts?: number }).__soundStarts = 0;
    const SourceCtor = window.AudioBufferSourceNode;

    if (SourceCtor?.prototype?.start) {
      const originalStart = SourceCtor.prototype.start;
      SourceCtor.prototype.start = function (...args) {
        (window as Window & { __soundStarts?: number }).__soundStarts =
          ((window as Window & { __soundStarts?: number }).__soundStarts ?? 0) + 1;
        return originalStart.apply(this, args);
      };
    }
  });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  const soundToggle = page.locator("header button[aria-label]").first();
  await soundToggle.click();
  await page.waitForTimeout(250);
  const afterToggle = await page.evaluate(
    () => (window as Window & { __soundStarts?: number }).__soundStarts ?? 0,
  );

  await soundToggle.click();
  await page.locator('input[name="playerName"]').fill("Sound Verify");
  await page.locator("button.hero-button-primary").first().click();
  await page.waitForTimeout(400);
  const totalStarts = await page.evaluate(
    () => (window as Window & { __soundStarts?: number }).__soundStarts ?? 0,
  );

  await browser.close();

  assert.ok(
    afterToggle >= 1,
    `Expected sound toggle click to start audio, received ${afterToggle}`,
  );
  assert.ok(
    totalStarts >= 2,
    `Expected at least two audio source starts on home interactions, received ${totalStarts}`,
  );

  console.log("verify-sound-playback: PASS", { afterToggle, totalStarts });
}

void main();
