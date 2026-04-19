import { defaultAdminSettings } from "@/lib/content/default-bank";
import type { AdminSettings } from "@/lib/types";

const MIN_REPLACEMENT_MARKS = 4;
const REPLACEMENT_MARK_RATIO = 0.2;

function looksCorruptedText(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }

  const replacementMarkCount = trimmedValue.match(/\?/g)?.length ?? 0;
  return (
    replacementMarkCount >= MIN_REPLACEMENT_MARKS &&
    replacementMarkCount / trimmedValue.length >= REPLACEMENT_MARK_RATIO
  );
}

export function getSafeIntroText(value: unknown) {
  if (typeof value !== "string") {
    return defaultAdminSettings.introText;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || looksCorruptedText(trimmedValue)) {
    return defaultAdminSettings.introText;
  }

  return trimmedValue;
}

export function normalizeAdminSettings(settings: AdminSettings): AdminSettings {
  return {
    ...settings,
    introText: getSafeIntroText(settings.introText),
  };
}
