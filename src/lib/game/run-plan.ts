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

export function getOrderedQuestionIds(questions: Question[]) {
  return questions.map((question) => question.id);
}

export function getOrderedMissionIds(missions: PhotoMission[]) {
  const standardMissionIds = missions
    .filter((mission) => !mission.isFinal)
    .map((mission) => mission.id);
  const finalMissionId = missions.find((mission) => mission.isFinal)?.id;

  return [...standardMissionIds, finalMissionId].filter(Boolean) as string[];
}

export function buildRunSteps(
  questionOrder: string[],
  missionOrder: string[],
): RunStep[] {
  const steps: RunStep[] = [];
  const standardMissionCount = Math.floor(questionOrder.length / 3);
  const standardMissionIds = missionOrder.slice(0, standardMissionCount);
  const finalMissionId =
    missionOrder.length > standardMissionCount
      ? missionOrder.at(-1) ?? null
      : null;

  questionOrder.forEach((questionId, index) => {
    const isLastQuestion = index === questionOrder.length - 1;
    const isMissionSlot = (index + 1) % 3 === 0;
    const missionIdForSlot = isMissionSlot
      ? standardMissionIds[(index + 1) / 3 - 1]
      : undefined;

    // If the last question would normally get a mission after it AND a final mission
    // follows, pre-insert the standard mission BEFORE the last question so there are
    // never two missions back-to-back.
    if (isLastQuestion && missionIdForSlot && finalMissionId) {
      steps.push({ kind: "mission", missionId: missionIdForSlot });
    }

    steps.push({ kind: "question", questionId });

    if (missionIdForSlot && !(isLastQuestion && finalMissionId)) {
      steps.push({ kind: "mission", missionId: missionIdForSlot });
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
