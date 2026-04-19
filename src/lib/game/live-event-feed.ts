import type { GameEventRecord } from "@/lib/types";

const PUBLIC_RECENT_EVENT_TYPES = new Set<GameEventRecord["type"]>([
  "player_joined",
  "photo_uploaded",
  "game_completed",
]);

export function filterPublicRecentEvents(
  events: GameEventRecord[],
  limit = 12,
) {
  return events
    .filter((event) => PUBLIC_RECENT_EVENT_TYPES.has(event.type))
    .slice(0, limit);
}

export function formatPublicRecentEventMessage(event: GameEventRecord) {
  const namePrefix = event.playerName ? `${event.playerName} · ` : "";

  switch (event.type) {
    case "player_joined":
      return `${namePrefix}התחיל משחק`;
    case "photo_uploaded":
      return `${namePrefix}העלה תמונה`;
    case "game_completed":
      return `${namePrefix}סיים משחק`;
    default:
      return event.message?.trim() || "הקהילה ממשיכה לשחק יחד";
  }
}
