# Summary Results Sheet And Restart Design

Date: 2026-04-19
Status: Draft for user review

## Goal

Make the summary screen feel much more usable on mobile by replacing the long vertical survey-results section with a focused internal results sheet, adding a simple one-column chart for the player's own choice, and exposing a clear `start new game` action from the summary screen.

## Confirmed Requirements

- The summary screen should no longer show all question results as a long page section.
- The results should open from a dedicated button on the summary screen.
- The results UI should open as an internal window, not a full page navigation.
- The internal results UI should show one question at a time.
- Navigation between questions should be sideways, not long vertical scrolling.
- Each question should show one graph column only:
  - `X`: the player's chosen answer
  - `Y`: the percentage of participants who chose the same answer
- The results window must include a clear exit button.
- The summary screen must include a `new game` button that takes the player back to the start screen.
- The existing `add more photos` capability after finishing the game must remain available.

## Non-Goals

- No full analytics dashboard on the summary page in this phase.
- No multi-series chart with all answer options in this phase.
- No separate dedicated `/summary/results` route in this phase.
- No changes to the underlying survey result calculation logic in this phase.
- No redesign of the extra-photo upload flow beyond fitting cleanly around the new results interaction.

## Product Summary

The summary screen should stop feeling like a second results page and start feeling like a celebration screen with focused actions. The player lands there, sees the key summary metrics, can optionally open an internal results viewer, can continue adding photos, and can restart the evening experience from the beginning if needed.

The detailed survey breakdown should feel like a guided flip-through of the player's answers, not a massive feed they need to scroll through. On mobile especially, this should behave more like an app drawer or bottom sheet than a document.

## Approaches Considered

### Option 1: Bottom Sheet Results Viewer

Pros:

- Best fit for mobile ergonomics
- Keeps the summary screen visible behind the results context
- Easy to close and return to the main summary actions
- Supports sideways navigation naturally inside a bounded area

Cons:

- Requires a bit more layout/state work than a normal inline section

Decision: chosen.

### Option 2: Centered Modal

Pros:

- Familiar overlay pattern
- Visually distinct from the rest of the page

Cons:

- Feels tighter and less comfortable on narrow mobile screens
- More likely to feel cramped with question copy, graph, and navigation together

Decision: rejected.

### Option 3: Inline Carousel Inside The Page

Pros:

- Simplest rendering model
- No overlay logic required

Cons:

- Still makes the summary page feel long and crowded
- Does not fully answer the request for an internal dedicated window

Decision: rejected.

## Chosen Experience

Use a `bottom sheet` style internal results viewer that opens from the summary screen. It should sit above the summary content, include a clear `X` close button, and show one question card at a time.

Each card should present:

- question index, for example `3 / 20`
- the question prompt
- the player's chosen answer
- a simple single-column chart showing how many participants chose that same answer
- a short comparison label or insight if useful

Question-to-question movement should happen horizontally:

- swipe left and right on mobile
- explicit previous/next controls

The sheet should not require the player to scroll through all 20 questions in one long column.

## Summary Screen Information Architecture

The summary screen should be reorganized into four clear zones:

1. `celebration hero`
   Existing festive top section remains and continues to anchor the emotional finish.

2. `key metrics`
   Existing key stats remain visible.

3. `primary actions`
   Add a clear action row with:
   - `show results`
   - `new game`
   - existing `gallery` / `add more photos` actions as appropriate

4. `continuing the evening`
   The extra-photo upload section remains below, so players can keep contributing after they finish.

The results details themselves should move out of the page flow and into the sheet.

## Results Sheet Design

### Entry Point

Add a dedicated button on the summary screen:

- label: `הצגת התוצאות`

Pressing it opens the results sheet.

### Sheet Behavior

- opens over the summary page
- closes with:
  - `X` button
  - optional backdrop tap if that feels stable in mobile testing
- preserves the player's place in the current summary screen
- defaults to the first question when opened, unless we decide later to persist the last viewed index

### Header

The sheet header should include:

- title like `תוצאות הסקר`
- current question index such as `3 / 20`
- close button `X`

### Navigation

The body should support:

- swipe horizontal navigation on touch devices
- previous and next buttons
- disabled edge behavior at the first and last question

This should behave like a compact in-app carousel, not a free-scroll gallery.

## Single-Column Graph Design

The chart should be intentionally simple.

For each question:

- the `X` meaning is the player's chosen answer label
- the `Y` meaning is the percentage of all participants who chose that same answer

Visually, this should appear as one highlighted vertical bar with:

- the answer label beneath or beside it
- the percentage value displayed clearly
- optional helper text like `בחרו כמוך`

We are explicitly not showing the full answer distribution in this phase. The goal is quick personal comprehension, not analytical comparison.

## New Game Behavior

The summary screen should also include a `new game` button.

Expected behavior:

- clear the locally stored active player id
- clear the locally stored cached session snapshot
- return the user to `/`
- present the normal start experience again

This should behave as a fresh entry into the game, not as a resume.

## State And Data Strategy

The necessary data already exists in `summary.survey.questionResults`, so no backend format change is required for the core feature.

The summary screen should derive a smaller display model for the sheet from each `SurveyQuestionResult`:

- prompt
- current player choice label
- current player choice percentage
- question index
- total question count

If a question was skipped:

- show a skip state instead of a graph bar
- keep the sideways navigation consistent

This avoids overloading the sheet with unnecessary full-distribution UI while reusing the existing results data safely.

## Component Design

Expected decomposition:

- `summary-page.tsx`
  Owns overall summary state and sheet open/close state.

- new `summary-results-sheet.tsx`
  Owns the internal bottom-sheet shell and question navigation.

- new `summary-results-card.tsx`
  Renders one question at a time.

- new lightweight `summary-single-bar-chart.tsx`
  Renders the single-column chart for the chosen answer percentage.

This keeps the current summary page from growing into another oversized component.

## Mobile UX Requirements

- opening the results sheet must feel immediate and stable
- the sheet must fit comfortably on Android and iPhone widths
- no horizontal page overflow outside the intended question swipe area
- the sheet itself may animate sideways between cards, but the page behind it must remain stable
- the bottom sheet must not push the whole summary page into a long reflow

## Error And Empty-State Handling

- if there are no summary results, the `show results` button should be hidden or disabled
- if a question has no player choice, show a `דילגת על השאלה` state instead of the bar chart
- if the summary is missing entirely, the existing empty summary state remains unchanged

## Expected File Impact

Primary expected touch points:

- `src/components/summary/summary-page.tsx`
- `src/components/results/survey-results-list.tsx` or possible retirement from summary usage
- new `src/components/summary/summary-results-sheet.tsx`
- new `src/components/summary/summary-results-card.tsx`
- new `src/components/summary/summary-single-bar-chart.tsx`
- `src/lib/utils/local-session.ts`
- `src/app/globals.css` if shared styles are needed

Verification additions:

- a summary-focused mobile script to ensure the sheet opens and closes correctly
- a verification that `new game` clears local resume state and returns to `/`

## Testing And Verification

Verify the following after implementation:

- `show results` opens an internal sheet from the summary page
- the sheet closes from the `X` button
- only one question card is visible at a time
- navigation between questions is horizontal
- skipped questions render gracefully
- the single-column chart shows the player's chosen answer and matching percentage
- the old long vertical results section is no longer rendered on the summary page
- `new game` clears local session state and returns to the landing screen
- extra-photo uploads still work after the summary changes
- mobile summary layout remains stable on Android and iPhone widths
- `npm run typecheck` succeeds
- touched-file lint passes
- production deployment succeeds

## Risks And Mitigations

### Risk: The sheet duplicates too much logic from the existing survey results list

Mitigation: create a summary-specific display model and focused child components instead of trying to cram the current long-list component into a sheet.

### Risk: Horizontal navigation introduces overflow bugs on mobile

Mitigation: contain sideways movement inside the sheet/card viewport only and verify on Android and iPhone widths.

### Risk: New game clears too much or too little local state

Mitigation: only clear the stored active player/session keys needed for restart and verify the landing screen opens fresh afterward.

### Risk: The summary page becomes visually crowded

Mitigation: move detailed results behind the dedicated `show results` button and keep the main page focused on celebration, actions, and photo continuation.

## Spec Self-Review

- Placeholder scan: no `TODO`, `TBD`, or vague unfinished sections remain.
- Internal consistency: the one-question-at-a-time sheet, the single-column graph, and the restart behavior all align with the approved direction.
- Scope check: this is one coherent summary-screen feature set and should fit a single implementation plan.
- Ambiguity check: the chosen direction explicitly uses a bottom sheet, one card at a time, sideways navigation, a close button, and a single-column graph only.
