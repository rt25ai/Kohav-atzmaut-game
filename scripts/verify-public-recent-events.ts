import assert from "node:assert/strict";

import type { GameEventRecord } from "../src/lib/types";

const events: GameEventRecord[] = [
  {
    id: "evt-1",
    type: "rank_up",
    message: "לא אמור להופיע",
    playerId: "p1",
    playerName: "טל",
    createdAt: "2026-04-19T18:03:00.000Z",
  },
  {
    id: "evt-2",
    type: "photo_uploaded",
    message: "לא משנה",
    playerId: "p1",
    playerName: "טל",
    createdAt: "2026-04-19T18:02:00.000Z",
  },
  {
    id: "evt-3",
    type: "score_update",
    message: "לא אמור להופיע",
    playerId: "p2",
    playerName: "נועם",
    createdAt: "2026-04-19T18:01:00.000Z",
  },
  {
    id: "evt-4",
    type: "player_joined",
    message: "לא משנה",
    playerId: "p3",
    playerName: "משפחת כהן",
    createdAt: "2026-04-19T18:00:00.000Z",
  },
  {
    id: "evt-5",
    type: "admin_update",
    message: "לא אמור להופיע",
    playerId: null,
    playerName: null,
    createdAt: "2026-04-19T17:59:00.000Z",
  },
  {
    id: "evt-6",
    type: "game_completed",
    message: "לא משנה",
    playerId: "p4",
    playerName: "דנה",
    createdAt: "2026-04-19T17:58:00.000Z",
  },
];

async function main() {
  const liveEventFeedModule = (await import("../src/lib/game/live-event-feed")) as {
    filterPublicRecentEvents?: (events: GameEventRecord[]) => GameEventRecord[];
    formatPublicRecentEventMessage?: (event: GameEventRecord) => string;
  };

  assert.equal(
    typeof liveEventFeedModule.filterPublicRecentEvents,
    "function",
    "Expected live-event-feed to export filterPublicRecentEvents",
  );
  assert.equal(
    typeof liveEventFeedModule.formatPublicRecentEventMessage,
    "function",
    "Expected live-event-feed to export formatPublicRecentEventMessage",
  );

  const filteredEvents = liveEventFeedModule.filterPublicRecentEvents?.(events);
  assert.deepEqual(
    filteredEvents?.map((event) => event.type),
    ["photo_uploaded", "player_joined", "game_completed"],
  );

  assert.equal(
    liveEventFeedModule.formatPublicRecentEventMessage?.(events[1]),
    "טל · העלה תמונה",
  );
  assert.equal(
    liveEventFeedModule.formatPublicRecentEventMessage?.(events[3]),
    "משפחת כהן · התחיל משחק",
  );
  assert.equal(
    liveEventFeedModule.formatPublicRecentEventMessage?.(events[5]),
    "דנה · סיים משחק",
  );

  console.log("verify-public-recent-events: PASS");
}

void main();
