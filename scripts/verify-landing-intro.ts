import assert from "node:assert/strict";
import fs from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import {
  LANDING_INTRO_ASSET_PATH,
  LANDING_INTRO_TIMELINE,
  LANDING_INTRO_TOTAL_MS,
  getLandingHeroReveal,
  getLandingIntroStage,
} from "../src/lib/landing/intro-sequence";
import { LandingIntroOverlayFrame } from "../src/components/landing/landing-intro-overlay";

assert.equal(
  LANDING_INTRO_ASSET_PATH,
  "/branding/landing-intro-hf-20260418.png",
);
assert.equal(LANDING_INTRO_TOTAL_MS, 2_000);
assert.deepEqual(LANDING_INTRO_TIMELINE.exit, { delayMs: 1_650, durationMs: 350 });

assert.equal(getLandingIntroStage(0), "build");
assert.equal(getLandingIntroStage(249), "build");
assert.equal(getLandingIntroStage(250), "reveal");
assert.equal(getLandingIntroStage(1_249), "reveal");
assert.equal(getLandingIntroStage(1_250), "hold");
assert.equal(getLandingIntroStage(1_649), "hold");
assert.equal(getLandingIntroStage(1_650), "exit");
assert.equal(getLandingIntroStage(1_999), "exit");
assert.equal(getLandingIntroStage(2_000), "complete");

assert.deepEqual(getLandingHeroReveal(true), { opacity: 0, y: 28 });
assert.deepEqual(getLandingHeroReveal(false), { opacity: 1, y: 0 });

const fullMotionMarkup = renderToStaticMarkup(
  createElement(LandingIntroOverlayFrame, { reduceMotion: false }),
);
assert.match(fullMotionMarkup, /branding\/landing-intro-hf-20260418\.png/);
assert.match(fullMotionMarkup, /data-reduced-motion="false"/);

const reducedMotionMarkup = renderToStaticMarkup(
  createElement(LandingIntroOverlayFrame, { reduceMotion: true }),
);
assert.match(reducedMotionMarkup, /data-reduced-motion="true"/);

const landingPageSource = fs.readFileSync(
  new URL("../src/components/landing/landing-page.tsx", import.meta.url),
  "utf8",
);

assert.equal(landingPageSource.includes("LandingIntroOverlay"), true);
assert.equal(landingPageSource.includes("const [showIntro, setShowIntro] = useState(true);"), true);
assert.equal(landingPageSource.includes("getLandingHeroReveal(showIntro)"), true);

console.log("verify-landing-intro: PASS");
