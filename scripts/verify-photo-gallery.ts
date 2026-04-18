import assert from "node:assert/strict";

import {
  EXTRA_GALLERY_MISSION_ID,
  EXTRA_GALLERY_MISSION_TITLE,
  buildPhotoLightboxItem,
} from "../src/lib/game/photo-gallery";
import { buildGalleryGroups } from "../src/lib/game/player-experience";
import type { GalleryEntry } from "../src/lib/types";

const missionPhoto: GalleryEntry = {
  id: "p-1",
  playerId: "player-1",
  playerName: "משפחת לוי",
  missionId: "m-01",
  missionTitle: "משימה 1",
  caption: "מצאנו פינה מוצלת",
  photoUrl: "https://example.com/full-1.jpg",
  thumbnailUrl: "https://example.com/thumb-1.jpg",
  createdAt: "2026-04-18T10:00:00.000Z",
  isFinalMission: false,
};

const extraPhoto: GalleryEntry = {
  id: "p-2",
  playerId: "player-1",
  playerName: "משפחת לוי",
  missionId: EXTRA_GALLERY_MISSION_ID,
  missionTitle: EXTRA_GALLERY_MISSION_TITLE,
  caption: "ועוד רגע יפה אחרי הסיום",
  photoUrl: "https://example.com/full-2.jpg",
  thumbnailUrl: "https://example.com/thumb-2.jpg",
  createdAt: "2026-04-18T12:00:00.000Z",
  isFinalMission: false,
};

assert.equal(EXTRA_GALLERY_MISSION_ID, "bonus-gallery");
assert.equal(EXTRA_GALLERY_MISSION_TITLE, "רגעים נוספים מהערב");

assert.deepEqual(buildPhotoLightboxItem(missionPhoto), {
  src: missionPhoto.photoUrl,
  alt: missionPhoto.missionTitle,
  title: "משפחת לוי • משימה 1",
  caption: "מצאנו פינה מוצלת",
});

assert.deepEqual(buildPhotoLightboxItem(extraPhoto), {
  src: extraPhoto.photoUrl,
  alt: extraPhoto.missionTitle,
  title: "משפחת לוי • רגעים נוספים מהערב",
  caption: "ועוד רגע יפה אחרי הסיום",
});

const groups = buildGalleryGroups([missionPhoto, extraPhoto]);
assert.equal(groups.length, 1);
assert.equal(groups[0]?.playerId, "player-1");
assert.equal(groups[0]?.photos.length, 2);
assert.equal(groups[0]?.cover.id, "p-2");

console.log("verify-photo-gallery: PASS");
