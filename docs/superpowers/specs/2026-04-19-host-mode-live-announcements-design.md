# Host Mode Live Announcements Design

Date: 2026-04-19
Status: Draft for user review

## Goal

Add a real `Host Mode` layer so the event manager can send live system messages during the evening, schedule future messages for an exact time, optionally define an automatic end time, and surface the active message as a fixed live system bar in the public experience only when a message is active.

## Confirmed Requirements

- Only users with access to the admin console can create and control host messages.
- The admin can write a message and publish it immediately at any moment.
- The admin can schedule a message for an exact date and time.
- For each message, the admin can choose one of two behaviors:
  - stay active until another message replaces it
  - stay active until a specific end time and then disappear automatically
- In the public app, a fixed system-message row should appear only when there is an active host message.
- The system-message row should update live across the regular user interface.
- The public message bar should work across the evening and feel like part of the event flow, not a hidden admin-only feature.

## Non-Goals

- No push notifications, SMS, WhatsApp, or browser notifications in this phase.
- No per-user targeting or audience segmentation in this phase.
- No multi-admin identity tracking or audit log beyond the existing admin event stream.
- No rich message types like images, buttons, links, or polls in this phase.
- No standalone host dashboard outside the existing admin console route.

## Product Summary

The app should start behaving like a real event companion, not just a question flow. The host needs a simple way to steer the room in real time: announce the next activity, remind people where to gather, trigger a bonus moment, or direct attention to the stage.

Participants should see this guidance in a consistent place on the site. When a host message is active, it should appear as a fixed live strip under the top header across the public experience. When no message is active, that strip should not exist at all.

## Chosen Architecture

Use a dedicated `host_announcements` data model instead of extending `admin_settings`.

This is the cleanest approach because scheduled messages, time windows, and replacement behavior are not settings. They are event records with their own lifecycle. Putting them in a separate table keeps the model simple, preserves room for future extensions, and avoids turning `admin_settings` into a fragile JSON queue.

## Alternatives Considered

### Option 1: Store host messaging state inside `admin_settings`

Pros:

- Fastest one-row implementation
- Minimal API surface at first

Cons:

- Queueing and scheduling become awkward quickly
- Harder to reason about active versus future versus ended messages
- Creates brittle nested update logic for both local and Supabase repositories

Decision: rejected.

### Option 2: Dedicated `host_announcements` table

Pros:

- Natural fit for scheduled and live message lifecycle
- Supports immediate publishing, queueing, cancellation, and auto-expiry cleanly
- Keeps admin snapshot and public snapshot logic explicit

Cons:

- Requires schema work and a few more repository methods

Decision: chosen.

### Option 3: Hybrid cache in `admin_settings` plus queue table

Pros:

- Slightly faster public reads in theory

Cons:

- Duplicated state
- More opportunities for sync bugs
- Unnecessary for the current scale

Decision: rejected.

## Data Model Design

### New Table: `public.host_announcements`

Add a new table in `supabase/schema.sql`:

- `id text primary key`
- `message text not null`
- `scheduled_for timestamptz not null`
- `ends_mode text not null`
  Allowed values:
  - `until_next`
  - `at_time`
- `ends_at timestamptz null`
- `cleared_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Field Semantics

- `message`: the public host message text shown in the system bar
- `scheduled_for`: the exact moment the message becomes eligible to go live
- `ends_mode`:
  - `until_next` means the message remains active until a later message replaces it
  - `at_time` means the message automatically ends at `ends_at`
- `ends_at`: required when `ends_mode = at_time`, otherwise `null`
- `cleared_at`: manual stop/cancel timestamp used for both pending and already-active announcements

### Why `cleared_at` Instead Of A Stored Status

Status should be derived from timestamps instead of stored as a mutable enum. That avoids drift between "scheduled", "active", "ended", and "cancelled" and keeps the source of truth small and durable.

## Derived Lifecycle Rules

Every announcement has:

- `startAt = scheduled_for`
- `manualEndAt = cleared_at`
- `autoEndAt = ends_at` when `ends_mode = at_time`

Additionally, announcements with `ends_mode = until_next` have a derived replacement boundary:

- `replacedAt = scheduled_for` of the next non-cleared announcement that starts after this one

The announcement's effective end is:

- the earliest of `manualEndAt`, `autoEndAt`, or `replacedAt`
- if none exist, the message is open-ended

### Public Active Message Rule

At any given moment, the active host message is the announcement that:

- is not cleared before it starts
- has `startAt <= now`
- has no effective end before `now`
- has the most recent `startAt`

### Important Behavioral Consequence

A message with `until_next` never comes back after a later message starts, even if the later message was temporary and already ended. The earlier message's effective end becomes the later message's start time, so it stays finished.

This matches the user's expectation that "until the next message" means "until something newer takes over", not "pause and resume later".

## Admin Experience Design

### Placement

Add a new `Host Mode` section to the existing admin console, near the current live settings area.

### Create Message Form

The form should include:

- message textarea
- option:
  - `שלח עכשיו`
  - `תזמן לשעה מדויקת`
- date-time picker shown only for scheduled mode
- option:
  - `עד ההודעה הבאה`
  - `עד זמן סיום`
- end date-time picker shown only for `עד זמן סיום`
- primary submit button

### Admin Validation Rules

- message is required and trimmed
- max message length should be `180` characters
- scheduled time must be valid
- if `ends_mode = at_time`, `ends_at` must be after `scheduled_for`
- an immediate message uses `scheduled_for = now`

### Time Handling

The admin UI should use the admin browser's local time via `datetime-local`. Before saving, times should be converted to ISO UTC strings. When displayed again in the admin console, they should be shown in local time for the current browser.

This keeps scheduling intuitive for the event manager while preserving consistent storage.

### Admin Sections

The admin console should show three host-mode blocks:

1. `הודעה פעילה עכשיו`
   Shows the current active message if one exists, with:
   - text
   - start time
   - optional end time
   - button `סיום עכשיו`

2. `הודעות מתוזמנות`
   Shows future pending announcements, sorted by nearest start first, with:
   - text
   - scheduled start
   - end behavior summary
   - button `הפעל עכשיו`
   - button `בטל`
   - button `מחק`

3. `הודעות קודמות`
   Shows recent ended or cancelled announcements for context, newest first

The third block is intentionally lightweight and read-only except for delete. It gives the host confidence about what already happened during the evening without introducing full analytics or auditing.

## Public Experience Design

### Fixed System Message Bar

The public experience should gain a new fixed row under the main top header. It should:

- appear only when there is an active host message
- stay visible across `/`, `/play`, `/gallery`, `/results`, `/summary`, and other public routes that use the shared shell
- remain RTL
- feel live, festive, and readable without overwhelming the screen

### Placement

The simplest and most stable placement is inside the shared header stack, directly under the existing header panel. This keeps the message visually anchored to the app's "live status" area and avoids adding a second unrelated floating component.

### Public Copy Treatment

The bar should include:

- a small live marker like `הודעת מערכת`
- the host message text
- optional time context when useful, such as `מסתיים ב-...` only for timed messages

The bar must stay compact:

- desktop: single row when possible
- mobile: one or two lines, no sideways overflow

### Visual Style

The message row should look like a calm live broadcast, not a warning banner:

- use the existing festive blue system
- include a subtle glow or live-dot cue
- keep motion restrained
- no blocking overlay behavior

## Snapshot And API Design

### Public Snapshot Additions

Extend `PublicSnapshot` with:

- `activeHostAnnouncement: ActiveHostAnnouncement | null`
- `nextHostTransitionAt: string | null`

Where `ActiveHostAnnouncement` includes:

- `id`
- `message`
- `startedAt`
- `endsAt`
- `endsMode`

`nextHostTransitionAt` is the next exact moment when the public host-message state could change, either because:

- a scheduled message begins
- the active timed message ends

### Admin Snapshot Additions

Extend `AdminSnapshot` with:

- `activeHostAnnouncement: ActiveHostAnnouncement | null`
- `hostAnnouncements: HostAnnouncementRecord[]`
- `nextHostTransitionAt: string | null`

`HostAnnouncementRecord` should expose enough derived data for rendering:

- raw timestamps
- derived status:
  - `active`
  - `scheduled`
  - `ended`
  - `cancelled`
- effective end timestamp

### Repository Strategy

Both local and Supabase repositories should:

- read all host announcements
- derive active and scheduled state in shared helper logic
- expose the same shape for public and admin snapshots

This avoids having local mode and Supabase mode behave differently.

### Admin API

Add a dedicated route:

- `src/app/api/admin/host-announcements/route.ts`

Use action-style requests to match existing admin patterns:

- create immediate
- create scheduled
- activate now
- stop now
- cancel
- delete

This avoids adding multiple route files for a still-small feature.

## Live Update Strategy

### Why Polling Alone Is Not Enough

Realtime database events will fire when rows are inserted or updated, but a scheduled message becoming active at a future exact minute does not produce a new row change by itself. That means "wait for realtime only" is not enough.

### Chosen Strategy

Use a hybrid approach:

- realtime updates still refresh when announcements are created, cancelled, or edited
- the public header also watches `nextHostTransitionAt`
- when `nextHostTransitionAt` is in the future, the client schedules a one-shot refresh for that exact transition

This keeps scheduled activation and auto-expiry accurate without introducing a backend cron job for this phase.

### Implementation Placement

Because `BrandHeader` already subscribes to `/api/public/snapshot`, it should own the system-message row and the one-shot refresh timer for `nextHostTransitionAt`.

## Event Stream Integration

Whenever a host announcement is created, activated, stopped, or cancelled, append a `game_events` entry of type `admin_update`.

Examples:

- `המנחה שלח הודעה חיה לקהל`
- `הופעלה הודעה מתוזמנת`
- `הודעת מערכת הסתיימה`
- `הודעה מתוזמנת בוטלה`

This keeps the live event stream aligned with what the host is doing without inventing a second admin-only history channel.

## Expected File Impact

Primary expected touch points:

- `supabase/schema.sql`
- `src/lib/types.ts`
- `src/lib/data/helpers.ts`
- `src/lib/data/local-repository.ts`
- `src/lib/data/supabase-repository.ts`
- `src/components/admin/admin-console.tsx`
- `src/components/shared/brand-header.tsx`
- potentially a new `src/components/shared/system-message-bar.tsx`
- `src/app/api/admin/host-announcements/route.ts`

Verification additions:

- `scripts/verify-host-mode-admin.ts`
- `scripts/verify-system-message-bar.ts`

## Error Handling

- If the admin submits an invalid time range, show immediate form validation and do not create a row.
- If the public snapshot has no active announcement, the public bar should not render at all.
- If `nextHostTransitionAt` is stale or missed, the regular polling cycle still corrects the state.
- If an announcement is cancelled before it starts, it should never appear publicly.
- If an active announcement is manually stopped, it should disappear on the next live refresh and not reappear.

## Testing And Verification

Verify the following after implementation:

- an immediate host message appears in the public fixed bar without reload
- a scheduled host message appears at the exact scheduled moment
- a timed host message disappears automatically after its end time
- a sticky message remains active until a later message starts
- an earlier sticky message does not reappear after a later timed message ends
- `stop now` removes the active bar
- `cancel` removes a future scheduled message before it appears
- the public bar is absent when no host message is active
- the bar remains readable and non-breaking on Android and iPhone widths
- `npm run typecheck` succeeds
- touched-file lint passes
- production deployment succeeds
- production verification succeeds

## Risks And Mitigations

### Risk: Scheduled transitions become inconsistent between local and Supabase modes

Mitigation: derive announcement state in shared helper logic, not inline inside only one repository.

### Risk: A timed message causes an old sticky message to return

Mitigation: use the "effective end equals next message start" rule for `until_next` messages.

### Risk: The fixed system bar adds extra mobile height and breaks the header again

Mitigation: keep the message strip inside the existing shared header stack and verify mobile widths in both play and home flows.

### Risk: Scheduling appears "late" because no DB event fires at activation time

Mitigation: include `nextHostTransitionAt` in snapshots and schedule an exact client refresh for that moment.

## Spec Self-Review

- Placeholder scan: no `TODO`, `TBD`, or vague "handle later" wording remains.
- Internal consistency: the chosen table-based model matches the admin UI, public bar, and timing rules.
- Scope check: this is still one coherent feature set and should fit a single implementation plan.
- Ambiguity check: message precedence, non-revival of old sticky messages, and timed disappearance behavior are explicitly defined.
