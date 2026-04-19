import assert from "node:assert/strict";

import {
  defaultMissions,
  defaultQuestions,
} from "../src/lib/content/default-bank";
import type { RunStep } from "../src/lib/types";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const response = await fetch(`${baseUrl}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Production Content Verify",
      participantType: "solo_male",
    }),
  });

  assert.equal(
    response.status,
    200,
    `Expected /api/game/start to return 200, received ${response.status}`,
  );

  const { session } = (await response.json()) as {
    session: {
      questions: typeof defaultQuestions;
      missions: typeof defaultMissions;
      player: {
        questionOrder: string[];
        missionOrder: string[];
      };
      steps: RunStep[];
      resultsPromptRequired: boolean;
      surveyPhase: "live" | "closing" | "finalized";
      currentStep: { kind: "question" | "mission"; questionId?: string | null } | null;
    };
  };

  assert.deepEqual(
    session.questions.map((question) => ({
      id: question.id,
      title: question.title,
      prompt: question.prompt,
      options: question.options.map((option) => option.label),
    })),
    defaultQuestions.map((question) => ({
      id: question.id,
      title: question.title,
      prompt: question.prompt,
      options: question.options.map((option) => option.label),
    })),
    "Production questions do not match the default bank",
  );

  assert.deepEqual(
    session.missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      prompt: mission.prompt,
      isFinal: Boolean(mission.isFinal),
    })),
    defaultMissions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      prompt: mission.prompt,
      isFinal: Boolean(mission.isFinal),
    })),
    "Production missions do not match the default bank",
  );

  assert.deepEqual(
    session.player.questionOrder,
    defaultQuestions.map((question) => question.id),
    "Production question order is not deterministic",
  );

  assert.deepEqual(
    session.player.missionOrder,
    defaultMissions.map((mission) => mission.id),
    "Production mission order is not deterministic",
  );

  assert.equal(
    session.steps.filter((step) => step.kind === "question").length,
    defaultQuestions.length,
    "Production run plan question count does not match the default bank",
  );
  assert.equal(
    session.steps.filter((step) => step.kind === "mission").length,
    defaultMissions.length,
    "Production run plan mission count does not match the default bank",
  );
  assert.equal(
    session.steps.at(-1)?.kind,
    "mission",
    "Expected production to end with the final photo mission",
  );

  if (session.resultsPromptRequired) {
    assert.equal(
      session.currentStep,
      null,
      "Expected currentStep to be null when production requires the results prompt",
    );
  } else {
    assert.equal(
      session.currentStep?.kind,
      "question",
      "Expected the first production step to be a question",
    );
    assert.equal(
      session.currentStep?.questionId,
      "q-01",
      "Expected production to start from q-01",
    );
  }

  console.log("verify-production-content: PASS");
}

void main();
