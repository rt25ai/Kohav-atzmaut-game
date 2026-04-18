import assert from "node:assert/strict";

import { defaultQuestions } from "../src/lib/content/default-bank";

const counts = new Map<string, number>();

for (const question of defaultQuestions) {
  assert.equal(question.options.length, 4, `${question.id} should expose exactly 4 options`);
  assert.equal(
    question.options[question.correctOptionIndex]?.id,
    question.correctOptionId,
    `${question.id} has mismatched correct option metadata`,
  );

  counts.set(question.correctOptionId, (counts.get(question.correctOptionId) ?? 0) + 1);
}

assert.ok((counts.get("a") ?? 0) >= 5, "Need at least 5 correct answers on option a");
assert.ok((counts.get("b") ?? 0) >= 5, "Need at least 5 correct answers on option b");
assert.ok((counts.get("c") ?? 0) >= 5, "Need at least 5 correct answers on option c");
assert.ok((counts.get("d") ?? 0) >= 5, "Need at least 5 correct answers on option d");

console.log("verify-question-bank: PASS", Object.fromEntries(counts));
