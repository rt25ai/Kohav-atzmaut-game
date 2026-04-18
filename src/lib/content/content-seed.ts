import type { AdminSettings, OptionId, PhotoMission, Question } from "../types";

import {
  defaultAdminSettings,
  defaultMissions,
  defaultQuestions,
} from "./default-bank";

const OPTION_IDS: OptionId[] = ["a", "b", "c", "d"];

type ContentRow = Record<string, unknown>;

function clampOptionIndex(index: number, optionCount: number) {
  if (optionCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), optionCount - 1);
}

function normalizeOptionLabels(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object" && "label" in entry) {
        return String((entry as { label: unknown }).label);
      }

      return "";
    })
    .filter(Boolean)
    .slice(0, OPTION_IDS.length);
}

export function buildSeedQuestionRows(questions: Question[] = defaultQuestions) {
  return questions.map((question, index) => ({
    id: question.id,
    type: question.type,
    title: question.title,
    prompt: question.prompt,
    options: question.options.map((option) => option.label),
    correct_option_index: question.correctOptionIndex,
    base_points: question.basePoints,
    sort_order: index + 1,
    active: true,
  }));
}

export function buildSeedMissionRows(missions: PhotoMission[] = defaultMissions) {
  return missions.map((mission, index) => ({
    id: mission.id,
    type: mission.type,
    title: mission.title,
    prompt: mission.prompt,
    base_points: mission.basePoints,
    is_final: Boolean(mission.isFinal),
    sort_order: index + 1,
    active: true,
  }));
}

export function buildSeedAdminSettingsRow(
  settings: AdminSettings = defaultAdminSettings,
) {
  return {
    id: 1,
    intro_text: settings.introText,
    prize_first: settings.prizeLabels.first,
    prize_second: settings.prizeLabels.second,
    prize_third: settings.prizeLabels.third,
    global_sound_enabled: settings.globalSoundEnabled,
    updated_at: new Date().toISOString(),
  };
}

export function mapQuestionRow(row: ContentRow): Question {
  const optionLabels = normalizeOptionLabels(row.options);
  const correctOptionIndex = clampOptionIndex(
    Number(row.correct_option_index ?? 0),
    optionLabels.length || 4,
  );

  return {
    type: "mcq",
    id: String(row.id),
    title: String(row.title),
    prompt: String(row.prompt),
    options: optionLabels.map((label, index) => ({
      id: OPTION_IDS[index]!,
      label,
    })),
    correctOptionId: OPTION_IDS[correctOptionIndex] ?? "a",
    correctOptionIndex,
    basePoints: Number(row.base_points ?? 100),
  };
}

export function mapMissionRow(row: ContentRow): PhotoMission {
  return {
    type: "photo",
    id: String(row.id),
    title: String(row.title),
    prompt: String(row.prompt),
    basePoints: Number(row.base_points ?? 250),
    isFinal: Boolean(row.is_final),
  };
}
