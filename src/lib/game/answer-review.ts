import type { OptionId } from "@/lib/types";

export type AnswerReviewState = "idle" | "correct" | "wrong";
export type AnswerVisualState = "default" | "selected" | "correct" | "incorrect";

type ReviewInput = {
  selectedOptionId: OptionId | null;
  submittedOptionId: OptionId | null;
  correctOptionId: OptionId | null;
  outcomeStatus: "correct" | "wrong" | "skipped";
};

type OptionStateInput = {
  optionId: OptionId;
  selectedOptionId: OptionId | null;
  submittedOptionId: OptionId | null;
  correctOptionId: OptionId | null;
  reviewState: AnswerReviewState;
};

export function getAnswerReviewState(input: ReviewInput) {
  if (input.outcomeStatus === "correct") {
    return {
      reviewState: "correct" as const,
      submittedOptionId: input.submittedOptionId ?? input.selectedOptionId,
      correctOptionId: input.correctOptionId ?? input.submittedOptionId ?? input.selectedOptionId,
    };
  }

  if (input.outcomeStatus === "wrong") {
    return {
      reviewState: "wrong" as const,
      submittedOptionId: input.submittedOptionId ?? input.selectedOptionId,
      correctOptionId: input.correctOptionId,
    };
  }

  return {
    reviewState: "idle" as const,
    submittedOptionId: input.submittedOptionId ?? input.selectedOptionId,
    correctOptionId: input.correctOptionId,
  };
}

export function getOptionVisualState(input: OptionStateInput): AnswerVisualState {
  if (input.reviewState === "correct") {
    return input.optionId === input.submittedOptionId ? "correct" : "default";
  }

  if (input.reviewState === "wrong") {
    if (input.optionId === input.correctOptionId) {
      return "correct";
    }

    if (input.optionId === input.submittedOptionId) {
      return "incorrect";
    }

    return "default";
  }

  return input.optionId === input.selectedOptionId ? "selected" : "default";
}
