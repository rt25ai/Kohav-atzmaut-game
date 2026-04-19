# Final Survey Results And Live Admin Dashboard Design

Date: 2026-04-19
Status: Draft for user review

## Goal

Turn the app from a score-based trivia control room into a real live survey control room. The admin should see live survey percentages for every question, be able to officially close the survey and publish final results, and all participants should then receive a system notice and a festive final-results experience while photo sharing remains open for the rest of the evening.

## Confirmed Requirements

- The admin console should stop centering the experience around points and ranking.
- The admin should see live survey results for all questions in real time.
- The admin should still have a participant-level management view for operational tracking.
- The admin should have a clear action to publish the official final survey results.
- Once final results are published, those results become the official fixed result set and should no longer change.
- After official publication, it should no longer be possible to keep answering new survey questions.
- Participants who are already inside a question or mission screen should be allowed to finish only that current screen.
- After finishing that current screen, those participants should be told that the survey has closed and be offered:
  - move to the final results
  - finish their own game flow
- Photo uploads should remain open after survey closure.
- The survey closure should surface as a visible system message to all users.
- The public experience should open a festive, decorated, special final-results screen for the official results.

## Non-Goals

- No return to points-based competition as the main public or admin framing.
- No reopening of final results in this phase.
- No scheduled future finalization in this phase; the admin action is manual.
- No closing of the photo gallery or extra-photo uploads when the survey closes.
- No per-question moderation workflow before finalization.

## Product Summary

The product now behaves like a live community survey during the event and like a shared reveal moment once the host closes it. During the evening, the admin sees the pulse of the room: how many answered, which answer leads each question, and where participation is strong or weak. When the admin decides the reveal moment has arrived, the survey is officially closed and a festive final-results state takes over.

From that point forward, the app stops behaving like an ongoing live survey and starts behaving like a shared ceremony screen. Participants can still browse, see the final results, and continue contributing photos, but the official survey outcome is frozen and communicated clearly.

## Alternatives Considered

### Option 1: Freeze A Final Snapshot At Admin Close Time

Pros:

- Gives the event a clear official end moment
- Keeps the final results stable and trustworthy
- Lets the public experience feel ceremonial instead of still "in flux"
- Supports a graceful transition for players already mid-step without changing the published result set

Cons:

- Requires a dedicated survey-state model and stored snapshot

Decision: chosen.

### Option 2: Only Set A `closed` Flag And Keep Deriving Results Live

Pros:

- Smaller implementation on paper
- Reuses current survey-result derivation logic directly

Cons:

- The so-called final results can still drift if late operational writes or admin corrections happen
- Feels less official and less event-like
- Makes the final-results reveal weaker

Decision: rejected.

### Option 3: Two Separate Admin Actions: `Lock Survey` Then `Publish Final Results`

Pros:

- Gives the admin an explicit rehearsal stage
- Useful for more formal productions

Cons:

- Adds complexity to the admin console and system state
- More than this event flow needs right now

Decision: rejected for now.

## Chosen Architecture

Use a dedicated `survey_runtime_state` model plus a stored `finalSurveySnapshot`.

This should not live inside `admin_settings` because survey lifecycle is not presentation configuration. It is runtime event state with operational meaning:

- whether the survey is still live
- whether official final results have already been published
- when closure happened
- what the frozen official results are

This state should be available in both local mode and Supabase mode through the repository layer, just like host announcements already are.

## Survey Lifecycle Model

The survey gets three explicit phases:

- `live`
  Normal behavior. Answers continue to change the live survey results.

- `closing`
  Official final results have already been frozen and published.
  No new survey progress should continue past the player's current screen.
  Players already inside one active question or mission may finish only that current screen.
  Their late completion does not alter the official published final results.

- `finalized`
  Fully settled post-close state.
  Publicly this behaves the same as `closing`, but operationally it means there are no more players finishing their last screen.

### Why Keep `closing` And `finalized`

The user requirement creates a real grace period. The official results are final immediately, but some players are still allowed to complete only the screen they were already on. That means the system needs:

- a frozen public result snapshot
- a public "the survey is closed" state
- a temporary grace behavior for in-flight participants

Using both `closing` and `finalized` makes this explicit and prevents muddy logic.

## Frozen Final Results Rule

When the admin presses `publish final results`:

1. The system computes the final survey snapshot immediately from the answer set that exists at that moment.
2. That snapshot becomes the official result set shown to the public.
3. The survey enters `closing`.
4. Any answers submitted afterward by players who were already inside their current screen do not modify that official snapshot.

This is the core behavioral rule that preserves trust in the final reveal.

## Admin Experience Design

## Admin Top Summary

Replace the leaderboard-oriented admin KPI block with survey-oriented live KPIs:

- `משתתפים`
- `פעילים עכשיו`
- `שאלות עם תשובות`
- `תמונות`

If a quick "top" insight is still useful, it should be survey-specific, for example:

- `השאלה הכי פעילה`
- `השאלה עם הכי הרבה דילוגים`

It should not show `מקום ראשון`.

## Admin Main Dashboard Split

The admin view should be reorganized into two major monitoring areas:

### 1. `דשבורד סקר חי`

This becomes the main operational center.

For each question, show:

- question title / prompt
- total answered
- skipped count
- live percentages by answer option
- leading option
- whether results are still `live` or already `final`

The layout should be scannable, not excessively tall:

- desktop: compact stacked cards or accordion-style rows
- mobile admin: one question card at a time or collapsed cards

### 2. `טבלת משתתפים למעקב`

Keep a participant-level operational table, but remove the score/rank framing.

For each player, show:

- name
- participant type
- current state:
  - active in game
  - completed
  - waiting after closure
- current step label
- answered questions count
- uploaded photos count
- last seen time

Admin actions like reset should remain possible, but `+100 / -100` score controls should be removed because they no longer match the product.

## Admin Finalization Panel

Add a dedicated panel above the live question grid:

- current survey phase
- explanatory copy
- button `הצגת תוצאות סופיות וסגירת הסקר`
- confirmation state before executing
- status after execution:
  - `התוצאות הסופיות פורסמו`
  - timestamp of publication
  - optional count of players still finishing their current screen

Once the survey is already closed:

- the publish button becomes disabled or replaced
- a button remains to open the public final-results screen

## Public System Messaging

The finalization should appear as a public system message, but this should not be modeled as a regular host announcement.

Instead, introduce a broader `activeSystemBanner` concept in public snapshot data. It can be driven by:

- a host announcement
- a survey closure/final-results notice

### Why Not Reuse Host Announcements Directly

Host announcements are temporary editorial messages. Survey closure is system state. Mixing them would make the lifecycle confusing and the admin history noisy.

The public header should continue to show exactly one banner row, but the source should now be generalized.

### Banner Priority Rule

If the survey is in `closing` or `finalized`, the final-results system banner should take precedence over host announcements. The room should see one clear official message, not competing live strips.

## Participant Experience After Survey Closure

### Users Not In The Middle Of A Screen

As soon as public snapshot reflects `closing` or `finalized`:

- the system banner appears
- public results route shows the festive final-results experience
- if they enter the game flow again, they should be routed away from answering and toward the closed-state messaging

### Users In The Middle Of A Question Or Mission

They are allowed to finish that current screen only.

After they submit it, instead of receiving the next survey step, they should receive a closure prompt:

- headline: `הסקר נסגר והתוצאות הסופיות פורסמו`
- supportive copy
- primary action: `לתוצאות הסופיות`
- secondary action: `לסיום המשחק שלי`

`לסיום המשחק שלי` means:

- stop survey progression
- continue to their own summary / post-game path
- keep photo participation available

This keeps the event feeling smooth instead of punitive. The survey closes, but the evening memory-making continues.

## Public Final Results Screen

The current `/results` route should gain two distinct modes:

### Live Mode

When survey phase is `live`, `/results` continues to behave like the live survey feed.

### Final Mode

When survey phase is `closing` or `finalized`, `/results` should switch to a decorated final-results ceremony experience based on the stored frozen snapshot.

That final mode should feel intentionally different:

- strong festive hero
- explicit label `תוצאות סופיות`
- celebratory styling and ornamentation
- question-by-question reveal or navigation
- clear indication when a player's own answer matches a shown result

This screen should feel like the official reveal moment of the evening, not just a filtered admin report.

## Final Results Content Model

The frozen result snapshot should store, at minimum:

- finalized timestamp
- total participants counted in the snapshot
- question results for every survey question
- per-option vote counts and percentages

This can reuse the existing `SurveyQuestionResult` structure rather than introducing a second result schema.

## Data Model Design

Add a dedicated runtime state object.

For local mode:

- extend `LocalDatabase` with `surveyRuntime`

For Supabase:

- add a new single-row table such as `survey_runtime_state`

Recommended fields:

- `id text primary key`
- `phase text not null`
  Allowed values:
  - `live`
  - `closing`
  - `finalized`
- `closed_at timestamptz null`
- `finalized_at timestamptz null`
- `final_results_snapshot jsonb null`
- `final_banner_message text null`
- `updated_at timestamptz not null`

### Snapshot Semantics

- `closed_at`: when the official result freeze action happened
- `finalized_at`: when the system no longer considers any players to be finishing their current last screen
- `final_results_snapshot`: the frozen official results data
- `final_banner_message`: the public banner copy shown after closure

## API And Repository Behavior

## Public Snapshot Additions

Extend `PublicSnapshot` with:

- `surveyPhase`
- `finalSurveySnapshot`
- `activeSystemBanner`

Where:

- `surveyPhase` is `live | closing | finalized`
- `finalSurveySnapshot` is `SurveyResultsSnapshot | null`
- `activeSystemBanner` contains:
  - type
  - message
  - optional CTA label

## Admin Snapshot Additions

Extend `AdminSnapshot` with:

- `surveyPhase`
- `finalizedAt`
- `finalSurveySnapshot`
- `liveSurveyOverview`
- `playersFinishingCurrentStep`

`liveSurveyOverview` should be a compact admin-facing aggregate for all questions. It can be derived server-side from the current answer pool.

## New Admin Action

Add a dedicated admin action, for example:

- `publishFinalSurveyResults`

This action:

1. verifies the survey is still `live`
2. computes the current survey snapshot
3. stores it as `final_results_snapshot`
4. sets phase to `closing`
5. sets closure timestamps
6. emits an admin event

## Answer Submission Rule

`submitAnswer` should change behavior by phase:

- `live`
  normal behavior

- `closing`
  allow submission only if the player is still submitting the exact screen they were already on
  after success, do not continue them to a new survey step

- `finalized`
  reject new answer submissions

## Mission Submission Rule

`submitMission` should follow the same closure rule for the current in-flight screen.

Important:

- regular mission completion needed to exit the current screen may still succeed during `closing`
- extra-photo uploads remain allowed regardless of survey phase

## Session / Play Flow Behavior

Session and play responses need an explicit closure signal so the client can show the proper prompt instead of trying to move forward normally.

Recommended additions:

- `surveyClosed: boolean`
- `surveyClosedMessage: string | null`
- `canViewFinalResults: boolean`

The play client should use that to interrupt the normal step-advance flow and show the closure dialog.

## Results Finalization Transition

The system should move from `closing` to `finalized` automatically when no players remain in the grace condition.

That condition can be derived from players whose survey progression is still unresolved at the moment of closure.

This should be automatic and not require a second admin action.

## Visual Direction

### Admin

The admin survey dashboard should feel analytical but still event-friendly:

- cleaner structure
- less emphasis on competition
- more emphasis on participation and choice distribution

### Public Final Screen

The final screen should feel celebratory and ceremonial:

- festive overlays
- stronger hero section
- clear official-final wording
- elegant transitions between questions
- no sense that the results are still updating

## Expected File Impact

Primary expected touch points:

- `src/lib/types.ts`
- `src/lib/data/helpers.ts`
- `src/lib/data/local-repository.ts`
- `src/lib/data/supabase-repository.ts`
- `src/lib/data/index.ts`
- `src/app/api/admin/snapshot/route.ts`
- new admin action route for finalization
- `src/app/api/public/snapshot/route.ts`
- `src/app/api/game/answer/route.ts`
- `src/app/api/game/mission/route.ts`
- `src/app/api/game/results/route.ts`
- `src/components/admin/admin-console.tsx`
- `src/components/results/results-page.tsx`
- `src/components/play/play-experience.tsx`
- `src/components/shared/brand-header.tsx`
- `src/components/shared/system-message-bar.tsx`

Likely additions:

- a festive final-results component
- a survey-closure prompt component
- verification scripts for survey closure and frozen results

## Testing And Verification

Verify the following after implementation:

- admin snapshot no longer centers on ranking/points as the main survey control view
- live question percentages update correctly in the admin dashboard
- finalization action stores a frozen official result snapshot
- `/results` switches from live mode to final ceremonial mode after closure
- public system banner shows the final-results notice
- players mid-screen can finish only that current screen
- those players then receive the closure prompt with the two requested choices
- no new survey answers can continue after the current grace screen
- extra-photo uploads still work after closure
- final results stay unchanged after publication
- `npm run typecheck` succeeds
- touched-file lint passes
- mobile behavior remains stable

## Risks And Mitigations

### Risk: Grace-period answers accidentally change the official final results

Mitigation:

- publish and store the frozen snapshot before entering `closing`
- always render final public results from that stored snapshot, not the live answer table

### Risk: Too much logic gets stuffed into `admin_settings`

Mitigation:

- keep survey lifecycle in its own runtime state model

### Risk: Users get confused about whether the app is still live or already final

Mitigation:

- one clear public system banner
- explicit `תוצאות סופיות` hero and copy
- no live-refresh language on the final screen

### Risk: The admin loses participant visibility after removing ranking UI

Mitigation:

- keep a dedicated participant tracking table with operational status columns

## Spec Self-Review

- Placeholder scan: no `TODO`, `TBD`, or unresolved sections remain.
- Internal consistency: the chosen architecture matches the live survey dashboard, frozen snapshot, closure prompt, and festive final-results screen.
- Scope check: this is one coherent feature set around survey closure, frozen final results, and admin dashboard replacement.
- Ambiguity check: the grace-period rule is now explicit; only the currently open screen may finish, and those late submissions do not alter the official published final results.
