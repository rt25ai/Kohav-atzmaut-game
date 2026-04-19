import assert from "node:assert/strict";

import { getFestiveCue } from "../src/lib/game/festive-feedback";

const savedFirst = getFestiveCue("answer-saved", 0);
assert.equal(savedFirst.copy, "נשמר, איזה כיף");
assert.deepEqual(savedFirst.emojis, ["✨", "🎉", "💙"]);
assert.equal(savedFirst.showConfetti, false);

const savedThird = getFestiveCue("answer-saved", 2);
assert.equal(savedThird.showConfetti, true);

const summaryFinished = getFestiveCue("summary-finished", 0);
assert.equal(summaryFinished.showConfetti, true);
assert.deepEqual(summaryFinished.emojis, ["🇮🇱", "🎉", "🥳"]);

const photoChosen = getFestiveCue("photo-chosen", 1);
assert.equal(photoChosen.copy, "בחרת רגע ששווה לזכור");
assert.deepEqual(photoChosen.emojis, ["📸", "💙"]);

console.log("verify-festive-feedback: PASS");
