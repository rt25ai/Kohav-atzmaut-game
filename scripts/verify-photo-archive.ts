import assert from "node:assert/strict";

import {
  ARCHIVE_MANIFEST_FILENAME,
  buildPhotoArchiveEntries,
  buildPhotoArchiveManifestCsv,
} from "../src/lib/admin/photo-archive";
import type { PhotoUploadRecord } from "../src/lib/types";

const photos: PhotoUploadRecord[] = [
  {
    id: "photo-1",
    playerId: "player-1",
    playerName: "משפחת לוי",
    missionId: "bonus-gallery",
    missionTitle: "רגעים נוספים מהערב",
    caption: "רגע מתוק מהסיום",
    photoUrl: "https://example.com/path/family-photo.webp?token=123",
    thumbnailUrl: null,
    hidden: false,
    createdAt: "2026-04-18T10:15:00.000Z",
    isFinalMission: false,
  },
  {
    id: "photo-2",
    playerId: "player-2",
    playerName: "אבי כהן",
    missionId: "mission-2",
    missionTitle: "מניפים דגלים / ביחד",
    caption: null,
    photoUrl: "data:image/png;base64,Zm9v",
    thumbnailUrl: null,
    hidden: true,
    createdAt: "2026-04-18T10:20:00.000Z",
    isFinalMission: false,
  },
];

const entries = buildPhotoArchiveEntries(photos);

assert.equal(entries.length, 2);
assert.equal(entries[0]?.filename, "001_משפחת-לוי_רגעים-נוספים-מהערב_photo-1.webp");
assert.equal(entries[1]?.filename, "002_אבי-כהן_מניפים-דגלים-ביחד_photo-2.png");
assert.equal(entries[0]?.extension, "webp");
assert.equal(entries[1]?.extension, "png");

const manifest = buildPhotoArchiveManifestCsv(entries);

assert.ok(manifest.startsWith(`filename,player_name,mission_title,caption,created_at,hidden\n`));
assert.ok(manifest.includes(ARCHIVE_MANIFEST_FILENAME) === false);
assert.ok(manifest.includes("001_משפחת-לוי_רגעים-נוספים-מהערב_photo-1.webp"));
assert.ok(manifest.includes("\"רגע מתוק מהסיום\""));
assert.ok(manifest.includes("\"true\""));

console.log("verify-photo-archive: PASS");
