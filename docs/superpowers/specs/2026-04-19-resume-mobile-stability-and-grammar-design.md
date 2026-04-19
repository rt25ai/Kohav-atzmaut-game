# Resume, Mobile Stability, And Grammar Design

Date: 2026-04-19
Status: Draft for user review

## Goal

Make the experience resilient when players leave and return during the event, keep the mobile play flow visually stable, strengthen the festive flag-confetti effect, and remove grammar mismatches between singular male, singular female, and family phrasing.

## Confirmed Requirements

- A player who leaves mid-game should return to the same progress point without re-entering a name.
- A player who already finished should be able to return directly to their summary page and keep uploading extra photos during the evening.
- The home action in the header should not accidentally erase active progress.
- The app should keep correct Hebrew wording for `solo_male`, `solo_female`, and `family`.
- Flag-confetti should be noticeably more visible and cover about half the screen area when it appears.
- Confetti should appear only sometimes, not continuously.
- Selecting or uploading a photo on mobile must not cause the screen to jump.
- After moving between steps or screens, the viewport should start from the top instead of staying scrolled lower down.
- The fixes must hold on both Android and iPhone sized screens.

## Non-Goals

- No new account system or login flow.
- No server-side identity model beyond the existing player/session pattern.
- No redesign of the question cards or summary layout beyond what is needed for stability.
- No always-on confetti layer or long-running particle effect.
- No change to the survey content itself in this phase.

## Experience Summary

The app should feel like it remembers the player throughout the evening. If someone briefly leaves the game, comes back from the home page, or reopens the site, they should land back in the right place instead of feeling reset.

The play flow should also feel anchored on mobile. Each new question, photo mission, or summary screen should open from the top, and photo selection should not yank the viewport or create visible layout jumps.

The celebratory layer should become easier to notice. Flag-confetti should read as a real festive accent rather than a tiny decorative detail, while still staying short and non-blocking.

## Product Thesis

At a community event, continuity matters more than strict app boundaries. The system should behave as if the event is ongoing and the player is simply stepping in and out of it.

## Route and Resume Design

### Local Identity and Session Continuity

The existing stored `playerId` and cached `SessionSnapshot` should remain the primary continuity mechanism on the client. The app already stores them; this phase should make the navigation and recovery behavior honor that storage consistently.

### Landing Route Behavior

On the landing page:

- If there is no stored player, show the normal entry form.
- If there is a stored player and the session is still active, redirect directly to `/play`.
- If there is a stored player and the server reports that the player completed the run, redirect directly to `/summary`.
- If the stored player/session is invalid or the fetch fails in a way that proves the session is gone, clear storage and show the normal entry form.

The redirect should happen automatically and should not require a secondary confirmation step.

### Header Home Behavior

The current home action should become a navigation-only action. Going back to `/` should no longer clear the stored player/session by default. A future explicit restart flow can clear progress, but this phase should not erase it during normal navigation.

## Grammar Design

### Target

Every user-facing activity sentence that depends on participant type should use the correct Hebrew form for:

- single male
- single female
- family / plural

### Scope

Audit and fix the live event copy and any play/summary microcopy that may accidentally use plural or neutral wording for single-player states.

### Rule

All dynamic activity strings should derive from the participant-type helper path rather than fallback generic strings when the player identity is known.

## Mobile Stability Design

### Step-To-Top Behavior

Whenever the player advances to a new question, a photo mission, or the summary route, the viewport should reset to the top immediately. This should be handled intentionally in client code rather than relying on browser defaults.

The same behavior should apply when the app auto-resumes a player into `/play` or `/summary`.

### Upload Stability

The image-selection and upload flow should preserve layout height around the preview area so that choosing a file does not cause sudden reflow. Any helper messages added after upload should also avoid pushing the main form unexpectedly.

If the browser changes scroll position while returning from the native file picker, the client should restore a stable top-aligned viewport for the relevant screen state.

### Motion Safety

The fixes must preserve the current RTL and mobile layout stability:

- no horizontal overflow
- no clipped top-stage content
- no scroll position carryover between steps
- no upload-triggered jumping

## Festive Confetti Design

### Visibility

The Israel-flag confetti should become larger and more readable. Instead of a tiny accent near the chip, the burst should occupy a bounded overlay that can visually span around half of the local screen area when active.

### Behavior

The burst should stay:

- short-lived
- pointer-events disabled
- clipped to the stage area
- safe under reduced-motion preferences

### Triggering

Confetti should appear occasionally on celebratory moments such as:

- answer saved
- mission upload success
- summary upload success
- summary arrival

It should not appear on every single transition.

## Technical Design

### Landing Page Changes

Add client-side resume detection to the landing page. The component should:

- read stored player/session on mount
- fetch the latest session when a stored player exists
- route to `/play` or `/summary` based on completion state
- only clear local storage when the stored session is truly invalid

### Brand Header Changes

Update the home navigation action so it preserves session storage. Clearing local progress should be removed from the default home path.

### Play Experience Changes

The play screen should gain explicit viewport reset behavior tied to step changes. It should also stabilize the photo mission UI around preview selection and upload confirmation so that form height changes do not create visible jumps.

### Summary Changes

The summary page should continue to use the stored player id and remain reachable by returning completed players. It should also get explicit top-of-screen behavior on entry.

### Shared Festive Effect Changes

The festive burst component and matching CSS should be expanded so confetti pieces are larger, more numerous, and distributed over a taller overlay area. The effect should stay bounded and efficient.

### Copy and Event Formatting Changes

Consolidate grammar-sensitive live event copy around the participant-type helpers so player-specific strings always reflect the correct voice when a player name and participant type are available.

## Expected File Impact

Primary expected touch points:

- `src/components/landing/landing-page.tsx`
- `src/components/shared/brand-header.tsx`
- `src/components/play/play-experience.tsx`
- `src/components/summary/summary-page.tsx`
- `src/components/summary/summary-extra-photo-form.tsx`
- `src/components/shared/festive-burst.tsx`
- `src/app/globals.css`
- `src/lib/data/live-event-copy.ts`

Potential verification updates:

- `scripts/verify-mobile-home.ts`
- `scripts/verify-mobile-play.ts`
- `scripts/verify-summary-extra-photo.ts`
- a new resume-flow verification script if needed

## Error Handling

- If auto-resume cannot validate the stored player, clear the invalid local state and fall back to the regular landing form.
- If a summary fetch fails for a supposedly completed player, do not trap the user in a broken redirect loop.
- If a festive effect fails to render, the play flow should continue normally.

## Testing and Verification

Verify the following after implementation:

- Returning to the site mid-game lands on `/play` at the same step.
- Returning after completion lands on `/summary`.
- Going home through the header does not wipe progress.
- Summary extra-photo upload still works after returning later.
- New steps open from the top on mobile.
- Summary opens from the top on mobile.
- Choosing and uploading a photo no longer causes obvious screen jumping.
- No horizontal overflow is introduced on Android or iPhone viewports.
- Flag-confetti is visibly larger and still does not block taps.
- Live event phrasing is correct for male, female, and family cases.
- `npm run typecheck` succeeds.
- Lint passes on touched files.
- Production deployment succeeds and production verification passes.

## Risks and Mitigations

### Risk: Auto-resume creates redirect loops

Mitigation: only redirect after validating the stored player and clear invalid local state immediately on hard failure.

### Risk: Scroll fixes fight browser behavior

Mitigation: trigger viewport resets at explicit step and route boundaries instead of attaching broad global scroll handlers.

### Risk: Larger confetti reintroduces overflow

Mitigation: keep the overlay clipped, non-interactive, and bounded to the stage container while verifying on narrow mobile widths.

### Risk: Grammar fixes become fragmented again later

Mitigation: keep participant-type phrasing centralized around shared helper usage rather than duplicating ad-hoc strings.
