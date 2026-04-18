import assert from "node:assert/strict";

import {
  buildGalleryGroups,
  getMissionProgress,
  getParticipantVoice,
  getPlayerDisplayName,
  getQuestionProgress,
} from "../src/lib/game/player-experience";
import type { GalleryEntry, RunStep } from "../src/lib/types";

const maleVoice = getParticipantVoice("solo_male");
assert.equal(maleVoice.startLabel, "התחל לשחק");
assert.equal(maleVoice.skipLabel, "דלג לשלב הבא");
assert.equal(maleVoice.choosePhotoLabel, "בחר תמונה");

const femaleVoice = getParticipantVoice("solo_female");
assert.equal(femaleVoice.startLabel, "התחילי לשחק");
assert.equal(femaleVoice.continueLabel, "המשיכי לשלב הבא");
assert.equal(femaleVoice.submitMissionLabel, "שלחי וקבלי נקודות");

const familyVoice = getParticipantVoice("family");
assert.equal(familyVoice.startLabel, "התחילו לשחק");
assert.equal(familyVoice.readyLine, "מוכנים לשלב הבא?");
assert.equal(getPlayerDisplayName("לוי", "family"), "משפחת לוי");
assert.equal(getPlayerDisplayName("משפחת כהן", "family"), "משפחת כהן");

const steps: RunStep[] = [
  { kind: "question", questionId: "q-03" },
  { kind: "mission", missionId: "m-01" },
  { kind: "question", questionId: "q-10" },
  { kind: "question", questionId: "q-04" },
  { kind: "mission", missionId: "m-02" },
];

assert.deepEqual(getQuestionProgress(steps, 0), { current: 1, total: 3 });
assert.deepEqual(getQuestionProgress(steps, 2), { current: 2, total: 3 });
assert.deepEqual(getQuestionProgress(steps, 3), { current: 3, total: 3 });
assert.deepEqual(getMissionProgress(steps, 1), { current: 1, total: 2 });
assert.deepEqual(getMissionProgress(steps, 4), { current: 2, total: 2 });

const photos: GalleryEntry[] = [
  {
    id: "p-1",
    playerId: "player-1",
    playerName: "משפחת לוי",
    missionId: "m-01",
    missionTitle: "משימה 1",
    caption: "רגע יפה",
    photoUrl: "https://example.com/full-1.jpg",
    thumbnailUrl: "https://example.com/thumb-1.jpg",
    createdAt: "2026-04-18T10:00:00.000Z",
    isFinalMission: false,
  },
  {
    id: "p-2",
    playerId: "player-2",
    playerName: "נועה",
    missionId: "m-01",
    missionTitle: "משימה 1",
    caption: null,
    photoUrl: "https://example.com/full-2.jpg",
    thumbnailUrl: null,
    createdAt: "2026-04-18T11:00:00.000Z",
    isFinalMission: false,
  },
  {
    id: "p-3",
    playerId: "player-1",
    playerName: "משפחת לוי",
    missionId: "m-02",
    missionTitle: "משימה 2",
    caption: "עוד תמונה",
    photoUrl: "https://example.com/full-3.jpg",
    thumbnailUrl: "https://example.com/thumb-3.jpg",
    createdAt: "2026-04-18T12:00:00.000Z",
    isFinalMission: false,
  },
];

const groups = buildGalleryGroups(photos);
assert.equal(groups.length, 2);
assert.equal(groups[0]?.playerId, "player-1");
assert.equal(groups[0]?.photos.length, 2);
assert.equal(groups[0]?.cover.id, "p-3");
assert.equal(groups[1]?.playerId, "player-2");

console.log("verify-player-experience: PASS");
