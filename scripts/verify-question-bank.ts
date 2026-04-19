import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultMissions,
  defaultQuestions,
} from "../src/lib/content/default-bank";
import {
  buildRunSteps,
  getOrderedMissionIds,
} from "../src/lib/game/run-plan";

const expectedQuestionIds = [
  "q-01",
  "q-02",
  "q-03",
  "q-04",
  "q-05",
  "q-06",
  "q-07",
  "q-08",
  "q-09",
  "q-11",
  "q-13",
  "q-15",
  "q-16",
  "q-19",
  "q-20",
] as const;

const removedQuestionIds = ["q-10", "q-12", "q-14", "q-17", "q-18"] as const;
const expectedMissionIds = ["m-01", "m-02", "m-03", "m-04", "m-05", "m-07"] as const;

assert.deepEqual(
  defaultQuestions.map((question) => question.id),
  expectedQuestionIds,
  "Unexpected question bank ids",
);
assert.deepEqual(
  defaultMissions.map((mission) => mission.id),
  expectedMissionIds,
  "Unexpected mission bank ids",
);

assert.equal(defaultQuestions.length, 15, "Expected exactly 15 questions");
assert.equal(
  defaultMissions.filter((mission) => !mission.isFinal).length,
  5,
  "Expected exactly 5 regular photo missions",
);
assert.equal(defaultMissions.at(-1)?.id, "m-07", "Expected the final mission to stay last");
assert.equal(defaultMissions.at(-1)?.isFinal, true, "Expected the final mission to stay final");

for (const [index, question] of defaultQuestions.entries()) {
  assert.equal(
    question.title,
    `שאלה ${index + 1}`,
    `Unexpected visible title for question ${question.id}`,
  );
  assert.equal(question.options.length, 3, `${question.id} should expose exactly 3 options`);
}

for (const removedQuestionId of removedQuestionIds) {
  assert.ok(
    !defaultQuestions.some((question) => question.id === removedQuestionId),
    `Did not expect ${removedQuestionId} in the question bank`,
  );
}

assert.ok(
  !defaultMissions.some((mission) => mission.id === "m-06"),
  "Did not expect m-06 in the mission bank",
);

const missionOrder = getOrderedMissionIds(defaultMissions);
const steps = buildRunSteps(
  defaultQuestions.map((question) => question.id),
  missionOrder,
);
const questionSteps = steps.filter((step) => step.kind === "question");
const missionSteps = steps.filter((step) => step.kind === "mission");
const lastStep = steps.at(-1);

assert.equal(questionSteps.length, 15, "Expected 15 question steps in the run plan");
assert.equal(missionSteps.length, 6, "Expected 5 regular missions and a final mission in the run plan");
assert.deepEqual(
  missionSteps.map((step) => step.missionId),
  missionOrder,
  "Run plan mission order should match the seeded mission order",
);
assert.equal(
  steps.at(-1)?.kind,
  "mission",
  "Expected the run plan to end with the final photo mission",
);
assert.equal(
  lastStep?.kind === "mission" ? lastStep.missionId : null,
  "m-07",
  "Expected m-07 to stay as the last step",
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const localRepositorySource = fs.readFileSync(
  path.join(projectRoot, "src", "lib", "data", "local-repository.ts"),
  "utf8",
);
const supabaseRepositorySource = fs.readFileSync(
  path.join(projectRoot, "src", "lib", "data", "supabase-repository.ts"),
  "utf8",
);

assert.ok(
  !/questionOrder:\s*shuffleArray\(/.test(localRepositorySource),
  "local-repository should not randomize question order",
);
assert.ok(
  !/return\s+shuffleArray\(questions\.map/.test(supabaseRepositorySource),
  "supabase-repository should not randomize question order",
);

console.log("verify-question-bank: PASS", {
  questions: defaultQuestions.length,
  standardMissions: defaultMissions.filter((mission) => !mission.isFinal).length,
  totalMissionSteps: missionSteps.length,
});
