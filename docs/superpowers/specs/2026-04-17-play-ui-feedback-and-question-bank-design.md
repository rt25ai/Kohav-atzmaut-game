# Play UI Feedback And Question Bank Design

## Goal

Improve the gameplay experience in three focused areas without changing the overall game structure:

1. Stop mobile screen jumping/flicker during photo upload and preview.
2. Add clear answer feedback so players can see what they selected, whether it was correct, and what the correct answer was when they were wrong.
3. Rebalance and rewrite the default question bank so the correct answer is not predictably `ג` and the distractors feel smarter while staying family-friendly.

## Scope

In scope:

- `src/components/play/play-experience.tsx`
- `src/lib/utils/image-upload.ts`
- `src/lib/content/default-bank.ts`
- Small supporting type/helper updates that are directly required by these behaviors

Out of scope:

- Changing the core scoring model
- Adding new routes or admin tooling
- Reworking the overall visual design system
- Replacing the current upload pipeline

## Problem Summary

### Mobile photo upload instability

The current mission screen resets `previewUrl` and `selectedFile` around step changes and swaps between empty and filled preview states inside a layout that does not reserve a stable preview area. On mobile this can feel like the entire screen is jumping or flickering while the preview and upload state update.

### Missing answer feedback

Question answers are submitted immediately, but the player does not get a visible review state showing:

- which option they selected
- whether that option was correct or incorrect
- which option was actually correct

This makes the game feel unresponsive and confusing.

### Predictable question bank

The default question bank currently places the correct answer almost entirely on option `ג`, and many distractors are obviously weaker than the correct answer. Players can guess the pattern instead of engaging with the content.

## Approach

Use a narrow behavioral update rather than a structural rewrite:

1. Introduce an explicit client-side answer review state for each question.
2. Reserve a stable visual container for mission image preview and upload status.
3. Rewrite and rebalance the default questions with distributed correct options.

This keeps implementation small, preserves the current flow, and directly addresses the reported pain points.

## UX Design

### Question interaction

Question flow will move from "instant submit with no visible feedback" to "select -> submit -> review -> continue".

New behavior:

- When a player taps an option, that option becomes visibly selected immediately.
- While the answer request is in flight, all answer buttons are disabled.
- After the server responds, the screen enters a short review state.
- In the review state:
  - if the player chose correctly, the selected option is marked green
  - if the player chose incorrectly, the selected option is marked red
  - the correct option is always highlighted green
- A clear continue action moves to the next step after the review state is shown.

This preserves learning value and removes ambiguity.

### Mission and photo interaction

Mission flow stays the same, but the preview area becomes stable.

New behavior:

- The mission card will always reserve space for the preview area, even before a file is selected.
- Selecting a photo only updates content inside that reserved frame instead of changing the overall page structure.
- The upload action shows a stable loading state inside the same region.
- Preview object URLs are managed carefully and released when replaced or when the step changes.

This should stop the visible layout jump and reduce the flicker feeling on mobile.

## State Design

### Question review state

`PlayExperience` will add a dedicated per-question UI state with:

- selected option id
- submitted option id
- review result (`correct` / `wrong` / `idle`)
- revealed correct option id
- waiting-for-continue boolean

Rules:

- selection can change until submit starts
- once submit starts, answer buttons lock
- after response, review state is derived from response and question metadata
- advancing to the next step resets all question review state

### Mission preview state

Mission state will keep:

- selected file
- stable preview object URL
- upload in-progress state
- queue and offline message state

Rules:

- preview is displayed inside a fixed-height container
- previous object URL is revoked before replacing it
- preview reset only happens on actual step change, not on incidental rerenders

## Rendering And Styling

### Answer buttons

Each answer button will support four visual states:

- default
- selected and pending
- correct
- incorrect

The visual hierarchy should be obvious on mobile:

- selected: stronger border and background
- correct: green border, background, and text treatment
- incorrect: red border, background, and text treatment

The correct answer should remain visible after a wrong choice so the player learns the right answer before continuing.

### Mission preview area

The mission screen will use a fixed preview shell with:

- consistent height
- empty placeholder state before file selection
- image preview state after selection
- spinner and loading state during upload

This avoids collapsing and expanding content blocks during image selection and submission.

## Question Bank Update

### Content direction

Tone should stay playful and community-oriented, aimed at families, with occasional slightly more clever wording.

Content rules:

- answers should not all point to the same option letter
- distractors should sound plausible
- questions should remain understandable for mixed ages
- a few prompts may be a bit more nuanced, but not trivia-night hard

### Structure update

Each question will be reviewed and updated so that:

- the correct option is distributed across `א`, `ב`, `ג`, and `ד`
- options are expanded to four choices where that improves balance
- the correct option index and id stay aligned with the visible option order

## Testing Strategy

### Behavioral verification

- verify answer selection is visible before submit completes
- verify correct answers show green
- verify wrong answers show red while the correct answer also shows green
- verify players cannot spam multiple answers during submission
- verify continuing clears previous review state

### Mission verification

- verify selecting a file does not collapse or expand the surrounding layout sharply
- verify preview is stable on repeated file selections
- verify preview cleanup does not leak stale object URLs

### Content verification

- verify correct answer distribution across option ids
- verify every `correctOptionId` matches `correctOptionIndex`
- verify questions stay readable and family-friendly

## Risks And Mitigations

### Risk: review state slows the game too much

Mitigation:

- keep the review step lightweight
- use a single clear continue action
- avoid adding extra modal or dialog layers

### Risk: mission preview still rerenders too aggressively

Mitigation:

- isolate preview state from unrelated session updates
- use a stable container with fixed dimensions
- clean up object URLs explicitly

### Risk: rewritten questions drift too far from the current tone

Mitigation:

- keep the same community and humor voice
- prefer "smart but fair" distractors over trick questions

## Implementation Notes

Implementation should stay incremental:

1. Add failing verification around answer review logic and question-bank consistency.
2. Implement answer review state in `PlayExperience`.
3. Stabilize mission preview rendering and object URL lifecycle.
4. Rewrite and rebalance the default questions.
5. Run build and focused browser verification.
