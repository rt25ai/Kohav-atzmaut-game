# Survey Rework Design

Date: 2026-04-18
Status: Draft for user review

## Goal

Rework the game from a trivia competition into a community survey experience named `כוכבניק - סקר הכי ישראלי שיש`.

Players should answer the same sequence of multiple-choice prompts and complete the same photo missions, but the experience should no longer include correct answers, points, combo logic, rank, or leaderboard pressure. Instead, the reveal should happen only after finishing: players see how the community answered, how their own answers compare, and can later revisit a live results view that continues to update.

## Confirmed Requirements

- The game title becomes `כוכבניק - סקר הכי ישראלי שיש`.
- The current question bank stays in place for this phase.
- The game is no longer trivia.
- The game no longer has scoring.
- The game no longer has correct or incorrect answers.
- Photo missions remain in the middle of the run and still support image upload.
- Answer options should stay short, only a few words where possible.
- Remove the helper copy under every answer that says `לחץ כדי לבחור תשובה`.
- Survey percentages must not be visible before a player finishes the game.
- The summary screen becomes the first place where survey results are revealed.
- After finishing, the player can also access a separate live results screen.
- The live results screen is available only to players who already completed the game.
- The live results screen should show both community-level comparison and the player's own choice per question.
- The numeric input for `כמה אנשים פגשת` should no longer feel blocked by a prefilled `0`.

## Non-Goals

- No question-bank rewrite in this phase.
- No redesign of the photo gallery feature beyond text or navigation adjustments needed by the survey flow.
- No broad admin-tool redesign unless required to remove score-first wording.
- No hard schema cleanup pass that deletes legacy score fields from storage in this phase.

## Experience Summary

The player enters the game from the landing page and plays through the existing sequence of questions and photo missions. Questions now behave like survey prompts: the player picks an option, gets a short confirmation state, and continues. There is no reveal of a "correct" answer and no ranking feedback.

When the player reaches the end, the summary screen becomes a results reveal. It thanks the player, shows how the community answered each question, and marks the player's own choice so they can compare themselves to the broader crowd. From there, the player can open a dedicated live results page that keeps showing updated percentages over time.

Players who try to access the results page before finishing should be blocked with a clear message that results open only after completion.

## Product Thesis

This should feel like a festive communal mirror, not a competition. The fun comes from discovering what most people chose and whether the player matched the crowd, not from winning.

## Content Scope for This Phase

### Keep

- Existing 20 question prompts
- Existing answer bank for those questions
- Existing photo mission sequence
- Existing gallery and extra-photo flow

### Change

- Branding and title text
- Home-page framing from "live trivia game" to "community survey"
- In-game question behavior
- Summary-page purpose and layout
- Separate results route for finished players
- Removal of scoring, ranking, leaderboard-first language, and correct-answer reveal

## Player Flow

1. Player starts from the landing page.
2. Player answers question prompts without seeing correctness or percentages.
3. Player completes photo missions between question groups as before.
4. Player reaches the end and lands on a summary page that reveals survey results for the first time.
5. Player can open a dedicated live results page from the summary page or later from the app navigation.
6. If the player revisits after finishing, they can still view the live results page and compare their saved answers to current community percentages.

## Route and Screen Plan

### Landing Page

- Update the hero and supporting copy to describe a communal survey experience.
- Replace leaderboard-centered framing with survey-results framing.
- Keep start-game entry and participant type selection.
- Replace or relabel the existing public `leaderboard` call-to-action to a survey-results entry point.
- If a player has not completed the run, results access should explain that the reveal unlocks only after finishing.

### Play Screen

- Keep progress and current-step structure.
- Remove all score, combo, rank, speed-bonus, and correctness UI.
- Keep question prompt and answer options.
- Remove helper copy under options.
- After answer selection, show a short saved-state message and continue control instead of correctness feedback.
- Keep skip behavior if already supported, but wording should remain neutral and non-competitive.

### Photo Mission Screen

- Keep image upload, caption, and new-people-met fields.
- Remove score-related badges or reward language.
- Change the numeric field so it starts visually empty instead of forcing the user to overwrite `0`.
- Persist empty input as `0` when submitted.

### Summary Screen

- Replace score/rank summary with a "community results revealed" experience.
- Show each question with percentage bars for all options.
- Mark the player's own choice inside each question block.
- Show whether the player matched the top choice, chose a minority answer, or skipped.
- Keep celebratory ending tone, but without "winner" framing.
- Provide a clear CTA to open the dedicated live results screen.

### Live Results Screen

- Add a new route dedicated to survey results, for example `/results`.
- Gate this route so only completed players can see detailed results.
- For each question, show:
  - option labels
  - vote counts or percentages
  - the player's own selected option
  - comparison language that explains where the player's choice sits relative to others
- Keep this page live-updating using the same real-time/polling patterns already used elsewhere.

## Technical Design

### Data Strategy

The current data model already stores per-player answer selections, which is enough to support a survey. For this phase, we should stop using score-oriented fields in the product flow rather than immediately removing them from persistence.

This minimizes migration risk and lets the app move to survey behavior without forcing a database reset.

### Question Handling

- Continue storing `selectedOptionId` per question answer.
- Stop evaluating answers against `correctOptionId` in the play experience.
- Stop returning correctness-first outcomes to the UI.
- Treat question submission as "saved answer" rather than "graded answer".

### Survey Aggregation

Add a survey-results aggregation layer that, per question:

- counts submitted answers by option
- excludes skipped/null answers from option counts while still tracking skipped state for the current player
- calculates percentages across answered votes
- identifies the top-selected option or options
- returns the current player's own selected option

This aggregation should be reusable by both the summary screen and the live results screen.

### Summary Payload

Extend the summary response to include survey result data instead of only rank/leaderboard data. The summary payload should be strong enough to render the entire first-time reveal screen without extra client-side reconstruction.

### Results Access Control

The results route should derive the current player from local session storage plus session fetch, then allow access only when `player.completed === true`.

If not completed:

- do not render percentages
- show a short locked-state explanation
- offer a route back to gameplay or home as appropriate

### Backward-Compatible Transition

Keep legacy score and leaderboard APIs functional during this phase if other screens still depend on them internally, but remove user-facing reliance on them from the main survey flow. If needed, score data can temporarily continue updating behind the scenes until the full cleanup pass.

The preferred UI behavior is:

- no score shown
- no score language
- no rank shown
- no leaderboard emphasis

## Component and File Impact

The following areas are expected to change:

- `src/components/landing/landing-page.tsx`
- `src/components/play/play-experience.tsx`
- `src/components/summary/summary-page.tsx`
- `src/components/shared/brand-header.tsx`
- `src/lib/content/default-bank.ts`
- `src/lib/types.ts`
- `src/lib/data/helpers.ts`
- `src/lib/data/local-repository.ts`
- `src/lib/data/supabase-repository.ts`
- summary/results API routes

The current question-bank content in `src/lib/content/default-bank.ts` should remain functionally the same for now, even if option wording may be shortened later in a separate pass.

## UX Details

### Answer Review Behavior

After a player selects an answer:

- freeze the choices
- show a short confirmation state such as "הבחירה נשמרה"
- do not reveal percentages
- do not reveal a correct answer
- allow the player to continue

### Personal Comparison Wording

Comparison language should stay light and communal. Examples of the desired style:

- `בחרת כמו רוב המשתתפים`
- `הלכת עם קבוצה קטנה יותר`
- `בחרת תשובה ייחודית יחסית`

The wording should compare the player to the group without sounding judgmental or competitive.

### Numeric Input Fix

For the `newPeopleMet` field:

- the input should render as empty initially
- typing should not require deleting a default `0`
- submission should normalize blank input to `0`

## Testing and Verification

Verify the following after implementation:

- Starting a new game still works.
- The existing questions still appear in the same run structure.
- Questions no longer show correctness, points, combo, rank, or speed bonus.
- The helper text under answer options is gone.
- Photo missions still upload successfully.
- The `כמה אנשים פגשת` field is easy to edit and saves blank as `0`.
- Finishing the run opens a summary screen with survey results.
- The summary screen shows the player's own choice for each question.
- The live results page stays blocked until completion.
- The live results page becomes available after completion.
- Live survey percentages update correctly.
- `npm run build` succeeds.

## Risks and Mitigations

### Risk: Legacy score logic keeps leaking into the UI

Mitigation: remove score-based UI from landing, play, header, summary, and results surfaces first, even if score fields remain in storage temporarily.

### Risk: Results appear before completion

Mitigation: gate the dedicated results route and keep aggregation data out of pre-completion play responses.

### Risk: Summary page becomes too long or noisy

Mitigation: structure each question as a compact results card with clear bars, the player's own marker, and restrained explanatory copy.

### Risk: Existing real-time hooks are tied to leaderboard concepts

Mitigation: reuse transport and polling/subscription patterns, but swap the payloads from leaderboard-first to survey-results-first.

## Implementation Boundary

This phase covers the full product shift from trivia framing to survey framing using the current question bank. It does not yet cover rewriting the questions themselves or redesigning the admin tools into a survey-editor workflow.
