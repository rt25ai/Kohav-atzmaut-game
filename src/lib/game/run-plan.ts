import { defaultMissions, defaultQuestions } from "@/lib/content/default-bank";
import type { PhotoMission, Question, RunStep } from "@/lib/types";

export function shuffleArray<T>(items: T[], seed = Math.random()): T[] {
  const clone = [...items];
  let currentSeed = seed * 9973;

  for (let i = clone.length - 1; i > 0; i -= 1) {
    currentSeed = Math.sin(currentSeed + i) * 10_000;
    const fraction = currentSeed - Math.floor(currentSeed);
    const j = Math.floor(fraction * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone;
}

export function buildRunSteps(
  questionOrder: string[],
  missionOrder: string[],
): RunStep[] {
  const steps: RunStep[] = [];
  const standardMissionIds = missionOrder.slice(0, 6);
  const finalMissionId = missionOrder[6];

  questionOrder.forEach((questionId, index) => {
    steps.push({ kind: "question", questionId });

    if ((index + 1) % 3 === 0 && standardMissionIds[(index + 1) / 3 - 1]) {
      steps.push({
        kind: "mission",
        missionId: standardMissionIds[(index + 1) / 3 - 1],
      });
    }
  });

  if (finalMissionId) {
    steps.push({ kind: "mission", missionId: finalMissionId });
  }

  return steps;
}

export function getQuestionMap(questions: Question[] = defaultQuestions) {
  return new Map(questions.map((question) => [question.id, question]));
}

export function getMissionMap(missions: PhotoMission[] = defaultMissions) {
  return new Map(missions.map((mission) => [mission.id, mission]));
}
