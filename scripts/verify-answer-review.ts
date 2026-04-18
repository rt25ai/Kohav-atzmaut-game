import assert from "node:assert/strict";

import {
  getAnswerReviewState,
  getOptionVisualState,
} from "../src/lib/game/answer-review";

const wrongReview = getAnswerReviewState({
  selectedOptionId: "b",
  submittedOptionId: "b",
  correctOptionId: "d",
  outcomeStatus: "wrong",
});

assert.equal(wrongReview.reviewState, "wrong");
assert.equal(wrongReview.correctOptionId, "d");

assert.equal(
  getOptionVisualState({
    optionId: "b",
    selectedOptionId: "b",
    submittedOptionId: "b",
    correctOptionId: "d",
    reviewState: wrongReview.reviewState,
  }),
  "incorrect",
);

assert.equal(
  getOptionVisualState({
    optionId: "d",
    selectedOptionId: "b",
    submittedOptionId: "b",
    correctOptionId: "d",
    reviewState: wrongReview.reviewState,
  }),
  "correct",
);

const pendingState = getOptionVisualState({
  optionId: "c",
  selectedOptionId: "c",
  submittedOptionId: null,
  correctOptionId: null,
  reviewState: "idle",
});

assert.equal(pendingState, "selected");

const correctReview = getAnswerReviewState({
  selectedOptionId: "a",
  submittedOptionId: "a",
  correctOptionId: "a",
  outcomeStatus: "correct",
});

assert.equal(correctReview.reviewState, "correct");

assert.equal(
  getOptionVisualState({
    optionId: "a",
    selectedOptionId: "a",
    submittedOptionId: "a",
    correctOptionId: "a",
    reviewState: correctReview.reviewState,
  }),
  "correct",
);

assert.equal(
  getOptionVisualState({
    optionId: "b",
    selectedOptionId: "a",
    submittedOptionId: "a",
    correctOptionId: "a",
    reviewState: correctReview.reviewState,
  }),
  "default",
);

console.log("verify-answer-review: PASS");
