import assert from "node:assert/strict";

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

assert.equal(LANDING_INTRO_ASSET_PATH, "/branding/site-icon.png");
assert.equal(LANDING_INTRO_TOTAL_MS, 1_500);
assert.deepEqual(LANDING_INTRO_TIMELINE.exit, { delayMs: 1_200, durationMs: 300 });

assert.equal(getLandingIntroStage(0), "build");
assert.equal(getLandingIntroStage(199), "build");
assert.equal(getLandingIntroStage(200), "reveal");
assert.equal(getLandingIntroStage(899), "reveal");
assert.equal(getLandingIntroStage(900), "hold");
assert.equal(getLandingIntroStage(1_199), "hold");
assert.equal(getLandingIntroStage(1_200), "exit");
assert.equal(getLandingIntroStage(1_499), "exit");
assert.equal(getLandingIntroStage(1_500), "complete");

assert.deepEqual(getLandingHeroReveal(true), { opacity: 0, y: 28 });
assert.deepEqual(getLandingHeroReveal(false), { opacity: 1, y: 0 });

const fullMotionMarkup = renderToStaticMarkup(
  createElement(LandingIntroOverlayFrame, { reduceMotion: false }),
);
assert.match(fullMotionMarkup, /branding\/site-icon\.png/);
assert.match(fullMotionMarkup, /data-reduced-motion="false"/);

const reducedMotionMarkup = renderToStaticMarkup(
  createElement(LandingIntroOverlayFrame, { reduceMotion: true }),
);
assert.match(reducedMotionMarkup, /data-reduced-motion="true"/);

console.log("verify-landing-intro: PASS");
