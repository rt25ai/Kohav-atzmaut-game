# Host Mode Live Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time `Host Mode` so the community manager can publish live system messages immediately or schedule them for an exact time, optionally auto-expire them, and surface the active announcement as a fixed public message bar only when one is active.

**Architecture:** Model host announcements as first-class records rather than admin settings. Keep lifecycle derivation centralized in shared helper logic so local mode and Supabase mode behave identically. Feed that derived state into both admin and public snapshots, expose focused admin actions through a dedicated route, and render the public announcement strip inside the existing header stack so we do not reintroduce mobile overflow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Zod, Supabase Postgres and Realtime, existing `useLiveJson` polling-plus-realtime hook, Playwright verification scripts.

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-19-host-mode-live-announcements-plan.md`
  Responsibility: implementation breakdown for host announcements.

- Create: `src/app/api/admin/host-announcements/route.ts`
  Responsibility: admin-only create, activate, stop, cancel, and delete actions.

- Create: `src/components/shared/system-message-bar.tsx`
  Responsibility: compact public live-message strip rendered inside the shared header stack.

- Create: `scripts/verify-host-announcement-state.ts`
  Responsibility: prove shared lifecycle derivation for immediate, scheduled, timed, cancelled, and replaced messages.

- Modify: `src/lib/types.ts`
  Responsibility: add host-announcement domain types and snapshot shapes.

- Modify: `src/lib/data/helpers.ts`
  Responsibility: derive active/public/admin host-announcement state and next transition times.

- Modify: `src/lib/data/local-repository.ts`
  Responsibility: persist host announcements in local mode and expose them through admin/public snapshots plus admin actions.

- Modify: `src/lib/data/supabase-repository.ts`
  Responsibility: read/write host announcements in Supabase and expose the same derived snapshot state.

- Modify: `src/lib/data/index.ts`
  Responsibility: export repository methods for host-announcement actions.

- Modify: `src/components/admin/admin-console.tsx`
  Responsibility: add the `Host Mode` creation form, active message controls, and scheduled/history lists.

- Modify: `src/components/shared/brand-header.tsx`
  Responsibility: include the public system-message bar and schedule exact refreshes from `nextHostTransitionAt`.

- Modify: `src/hooks/use-live-json.ts`
  Responsibility: allow one-off manual refresh scheduling without breaking existing polling.

- Modify: `src/app/api/public/snapshot/route.ts`
  Responsibility: return the expanded public snapshot with active host message data.

- Modify: `src/app/api/admin/snapshot/route.ts`
  Responsibility: return the expanded admin snapshot with host announcement state.

- Modify: `supabase/schema.sql`
  Responsibility: create the `host_announcements` table, indexes, policies, trigger, and realtime publication entry.

## Task 1: Add Failing Coverage For Host Announcement State Derivation

**Files:**
- Create: `scripts/verify-host-announcement-state.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/helpers.ts`

- [ ] **Step 1: Write the failing lifecycle verification**

```ts
// scripts/verify-host-announcement-state.ts
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
    message: "הולכים לטקס המרכזי בעוד 5 דקות",
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
  at1845.announcements.find((announcement) => announcement.id === "cancelled-future")?.status,
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
```

- [ ] **Step 2: Run the script to confirm it fails**

Run:

```bash
node --import tsx scripts/verify-host-announcement-state.ts
```

Expected: FAIL because host-announcement types and derivation helpers do not exist yet.

- [ ] **Step 3: Add the minimal host-announcement types and derivation helpers**

Implement:

- `HostAnnouncementEndsMode`
- `HostAnnouncementStatus`
- `HostAnnouncementRecord`
- `ActiveHostAnnouncement`
- `HostAnnouncementView`
- `deriveHostAnnouncementState()`
- `getActiveHostAnnouncement()`
- `getNextHostTransitionAt()`

Rules to lock in:

- `until_next` announcements end when the next non-cancelled announcement starts.
- cancelled future announcements never appear publicly.
- an older sticky announcement never comes back after a newer announcement starts.

- [ ] **Step 4: Re-run the lifecycle verification until it passes**

Run:

```bash
node --import tsx scripts/verify-host-announcement-state.ts
```

Expected: `verify-host-announcement-state: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/helpers.ts scripts/verify-host-announcement-state.ts
git commit -m "test: cover host announcement state derivation"
```

## Task 2: Persist Host Announcements In Local Mode And Supabase

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data/local-repository.ts`
- Modify: `src/lib/data/supabase-repository.ts`
- Modify: `src/lib/data/index.ts`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Extend the shared repository contract**

Add repository methods for:

- `createHostAnnouncement`
- `activateHostAnnouncementNow`
- `stopHostAnnouncementNow`
- `cancelHostAnnouncement`
- `deleteHostAnnouncement`

Also extend:

- `PublicSnapshot`
- `AdminSnapshot`
- `LocalDatabase`

with:

- `activeHostAnnouncement`
- `nextHostTransitionAt`
- `hostAnnouncements` on admin snapshots
- `hostAnnouncements` storage in local DB

- [ ] **Step 2: Add local persistence and snapshot mapping**

Implement local-mode support in `src/lib/data/local-repository.ts`:

- store `hostAnnouncements` in `local-db.json`
- derive admin/public host state using the shared helpers
- append `admin_update` events for create/activate/stop/cancel/delete

Action expectations:

- create immediate: uses `scheduledFor = now`
- activate now: updates `scheduledFor = now` and clears `clearedAt`
- stop now: sets `clearedAt = now`
- cancel: sets `clearedAt = now`
- delete: removes row entirely

- [ ] **Step 3: Add Supabase schema and repository support**

Update `supabase/schema.sql` to add:

- table `public.host_announcements`
- `ends_mode` check constraint
- supporting indexes
- updated-at trigger
- RLS enablement and public read policy
- realtime publication entry

Implement matching Supabase repository logic:

- select and map rows
- derive admin/public host state in memory
- insert/update/delete announcement rows
- add `admin_update` event messages for host actions

- [ ] **Step 4: Re-run the state verification and basic type checks**

Run:

```bash
node --import tsx scripts/verify-host-announcement-state.ts
npm run typecheck
```

Expected:

- state verification still passes
- typecheck may still fail from missing API/UI wiring, but no repository typing regressions should remain

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/lib/data/index.ts supabase/schema.sql
git commit -m "feat: persist host announcements"
```

## Task 3: Add Admin API And Admin Console Host Mode Controls

**Files:**
- Create: `src/app/api/admin/host-announcements/route.ts`
- Modify: `src/components/admin/admin-console.tsx`
- Modify: `src/app/api/admin/snapshot/route.ts`

- [ ] **Step 1: Create the admin route with schema validation**

Implement a single action-style route using `zod` with actions:

- `create`
- `activate-now`
- `stop-now`
- `cancel`
- `delete`

Validation rules:

- `message` required, trimmed, max `180`
- `scheduledFor` required for scheduled create
- `endsAt` required only for `at_time`
- `endsAt > scheduledFor`

- [ ] **Step 2: Add Host Mode controls to the admin console**

Extend `AdminConsole` with:

- textarea for message
- publish-mode choice: immediate or scheduled
- `datetime-local` field for scheduled start
- end behavior choice: `until_next` or `at_time`
- `datetime-local` field for end time when needed
- active message card with `stop now`
- scheduled list with `activate now`, `cancel`, `delete`
- previous messages list for recent history

Keep the section visually consistent with the existing glass/stage UI and RTL.

- [ ] **Step 3: Wire the admin UI to live refresh**

Add:

- `host_announcements` to the admin realtime tables list
- success/error handling for admin host actions
- local optimistic reset of the form after successful create

- [ ] **Step 4: Typecheck the admin path**

Run:

```bash
npm run typecheck
npx eslint src/components/admin/admin-console.tsx src/app/api/admin/host-announcements/route.ts
```

Expected:

- typecheck succeeds for the new admin types
- focused lint passes for the touched admin files

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/host-announcements/route.ts src/components/admin/admin-console.tsx src/app/api/admin/snapshot/route.ts
git commit -m "feat: add admin host mode controls"
```

## Task 4: Add The Public System Message Bar And Exact Transition Refresh

**Files:**
- Create: `src/components/shared/system-message-bar.tsx`
- Modify: `src/components/shared/brand-header.tsx`
- Modify: `src/hooks/use-live-json.ts`
- Modify: `src/app/api/public/snapshot/route.ts`

- [ ] **Step 1: Add a reusable public message bar**

Implement `SystemMessageBar` with:

- live/system label
- announcement message
- optional time hint for timed messages
- compact mobile-safe layout
- no horizontal overflow

It should render only when `activeHostAnnouncement` exists.

- [ ] **Step 2: Teach the header to refresh at the next transition moment**

In `BrandHeader`:

- include `host_announcements` in realtime tables
- render `SystemMessageBar` under the existing header panel
- watch `nextHostTransitionAt`
- schedule a one-shot `refresh()` when that timestamp arrives

This preserves exact scheduled activation and timed disappearance without backend cron work.

- [ ] **Step 3: Keep the header mobile-safe**

Adjust spacing and any necessary `main` top padding only if required so:

- the message row feels attached to the header
- mobile home/play layouts still fit without sideways overflow
- existing logo/flag/live-data layout remains intact

- [ ] **Step 4: Re-run mobile layout coverage**

Run:

```bash
node --import tsx scripts/verify-mobile-home.ts
node --import tsx scripts/verify-mobile-play.ts
```

Expected:

- both scripts still pass
- no regression in header width/overflow

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/system-message-bar.tsx src/components/shared/brand-header.tsx src/hooks/use-live-json.ts src/app/api/public/snapshot/route.ts
git commit -m "feat: show live host announcements in header"
```

## Task 5: Full Verification, Seed/Schema Alignment, And Production Deployment

**Files:**
- Modify: any touched files from prior tasks

- [ ] **Step 1: Run the focused local verification suite**

Run:

```bash
node --import tsx scripts/verify-host-announcement-state.ts
node --import tsx scripts/verify-mobile-home.ts
node --import tsx scripts/verify-mobile-play.ts
npm run typecheck
npx eslint src/lib/types.ts src/lib/data/helpers.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/lib/data/index.ts src/app/api/admin/host-announcements/route.ts src/components/admin/admin-console.tsx src/components/shared/system-message-bar.tsx src/components/shared/brand-header.tsx src/hooks/use-live-json.ts src/app/api/public/snapshot/route.ts src/app/api/admin/snapshot/route.ts scripts/verify-host-announcement-state.ts
```

Expected:

- all verification scripts print `PASS`
- `npm run typecheck` exits `0`
- focused `eslint` exits `0`

- [ ] **Step 2: Ensure Supabase schema is applied in the current environment**

Use the project's existing deployment/data workflow so the new table exists before production verification.

Expected:

- `host_announcements` exists in the linked Supabase project
- realtime publication includes the new table

- [ ] **Step 3: Deploy to production**

Run:

```bash
npx vercel --prod --yes
```

Expected: successful production deployment aliased to `https://kochav-michael-game.vercel.app`

- [ ] **Step 4: Re-run critical production checks**

Run:

```bash
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-mobile-home.ts
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-mobile-play.ts
$env:VERIFY_BASE_URL="https://kochav-michael-game.vercel.app"; node --import tsx scripts/verify-host-announcement-state.ts
```

Expected:

- all scripts print `PASS`
- the live site shows the public message row only when an announcement is active

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-19-host-mode-live-announcements-plan.md src/lib/types.ts src/lib/data/helpers.ts src/lib/data/local-repository.ts src/lib/data/supabase-repository.ts src/lib/data/index.ts src/app/api/admin/host-announcements/route.ts src/components/admin/admin-console.tsx src/components/shared/system-message-bar.tsx src/components/shared/brand-header.tsx src/hooks/use-live-json.ts src/app/api/public/snapshot/route.ts src/app/api/admin/snapshot/route.ts scripts/verify-host-announcement-state.ts supabase/schema.sql
git commit -m "feat: add live host announcements"
```

## Self-Review

### Spec coverage

- Immediate host messages: covered by Tasks 2 and 3.
- Exact-time scheduled messages: covered by Tasks 2, 3, and 4.
- Optional auto-expiry versus sticky-until-next behavior: covered by Tasks 1 and 2.
- Public system-message row only when active: covered by Task 4.
- Accurate scheduled/timed transitions without reload: covered by Tasks 1 and 4.
- Admin control inside the existing admin console: covered by Task 3.

### Placeholder scan

- No `TODO`, `TBD`, or vague "handle later" placeholders remain.
- Every task includes concrete files, commands, and expected outcomes.

### Risk check

- Shared derivation helper prevents local/Supabase lifecycle drift.
- Header integration keeps the public strip inside the existing stable layout.
- `nextHostTransitionAt` plus regular polling covers missed timers and future activations.
