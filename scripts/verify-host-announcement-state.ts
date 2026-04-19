import assert from "node:assert/strict";

import {
  deriveHostAnnouncementState,
  getActiveHostAnnouncement,
  getNextHostTransitionAt,
} from "../src/lib/data/helpers";
import type { HostAnnouncementRecord } from "../src/lib/types";

const rows: HostAnnouncementRecord[] = [
  {
    id: "sticky-1",
    message: "כולם לטקס המרכזי בעוד 5 דקות",
    scheduledFor: "2026-04-19T18:00:00.000Z",
    endsMode: "until_next",
    endsAt: null,
    clearedAt: null,
    createdAt: "2026-04-19T17:55:00.000Z",
    updatedAt: "2026-04-19T17:55:00.000Z",
  },
  {
    id: "timed-1",
    message: "כולם ליד הבמה עכשיו",
    scheduledFor: "2026-04-19T18:30:00.000Z",
    endsMode: "at_time",
    endsAt: "2026-04-19T18:40:00.000Z",
    clearedAt: null,
    createdAt: "2026-04-19T18:10:00.000Z",
    updatedAt: "2026-04-19T18:10:00.000Z",
  },
  {
    id: "cancelled-future",
    message: "בוטל",
    scheduledFor: "2026-04-19T18:50:00.000Z",
    endsMode: "until_next",
    endsAt: null,
    clearedAt: "2026-04-19T18:20:00.000Z",
    createdAt: "2026-04-19T18:11:00.000Z",
    updatedAt: "2026-04-19T18:20:00.000Z",
  },
];

const at1820 = deriveHostAnnouncementState(rows, "2026-04-19T18:20:00.000Z");
assert.equal(at1820.active?.id, "sticky-1");
assert.equal(at1820.nextTransitionAt, "2026-04-19T18:30:00.000Z");
assert.equal(
  at1820.announcements.find((announcement) => announcement.id === "sticky-1")?.status,
  "active",
);

const at1835 = deriveHostAnnouncementState(rows, "2026-04-19T18:35:00.000Z");
assert.equal(at1835.active?.id, "timed-1");
assert.equal(at1835.nextTransitionAt, "2026-04-19T18:40:00.000Z");

const at1845 = deriveHostAnnouncementState(rows, "2026-04-19T18:45:00.000Z");
assert.equal(at1845.active, null);
assert.equal(at1845.nextTransitionAt, null);
assert.equal(
  at1845.announcements.find((announcement) => announcement.id === "sticky-1")?.status,
  "ended",
);
assert.equal(
  at1845.announcements.find(
    (announcement) => announcement.id === "cancelled-future",
  )?.status,
  "cancelled",
);

assert.equal(
  getActiveHostAnnouncement(rows, "2026-04-19T18:35:00.000Z")?.id,
  "timed-1",
);
assert.equal(
  getNextHostTransitionAt(rows, "2026-04-19T18:20:00.000Z"),
  "2026-04-19T18:30:00.000Z",
);

console.log("verify-host-announcement-state: PASS");
