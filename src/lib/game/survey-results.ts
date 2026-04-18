import type {
  OptionId,
  PlayerAnswerRecord,
  Question,
  SurveyPlayerComparison,
  SurveyQuestionResult,
} from "@/lib/types";

function roundPercentage(value: number) {
  return Math.round(value);
}

function getPlayerComparison(
  playerChoiceOptionId: OptionId | null,
  topOptionIds: OptionId[],
  playerVoteCount: number,
): SurveyPlayerComparison {
  if (!playerChoiceOptionId) {
    return "skipped";
  }

  if (topOptionIds.includes(playerChoiceOptionId)) {
    return "top-choice";
  }

  if (playerVoteCount <= 1) {
    return "unique";
  }

  return "minority";
}

export function buildSurveyQuestionResults({
  questions,
  answers,
  playerId,
}: {
  questions: Question[];
  answers: PlayerAnswerRecord[];
  playerId: string;
}): SurveyQuestionResult[] {
  return questions.map((question) => {
    const questionAnswers = answers.filter(
      (answer) => answer.kind === "question" && answer.contentId === question.id,
    );
    const answered = questionAnswers.filter(
      (answer) => answer.answerOptionId !== null,
    );
    const totalAnswered = answered.length;
    const playerAnswer =
      questionAnswers.find((answer) => answer.playerId === playerId) ?? null;
    const playerChoiceOptionId = playerAnswer?.answerOptionId ?? null;

    const counts = new Map<OptionId, number>();
    question.options.forEach((option) => counts.set(option.id, 0));
    answered.forEach((answer) => {
      const optionId = answer.answerOptionId;
      if (optionId) {
        counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
      }
    });

    const topVoteCount = Math.max(
      0,
      ...question.options.map((option) => counts.get(option.id) ?? 0),
    );
    const topOptionIds = question.options
      .filter(
        (option) =>
          (counts.get(option.id) ?? 0) === topVoteCount && topVoteCount > 0,
      )
      .map((option) => option.id);
    const playerVoteCount = playerChoiceOptionId
      ? counts.get(playerChoiceOptionId) ?? 0
      : 0;

    return {
      questionId: question.id,
      questionTitle: question.title,
      prompt: question.prompt,
      totalAnswered,
      totalResponses: questionAnswers.length,
      skippedCount: questionAnswers.length - totalAnswered,
      playerChoiceOptionId,
      playerComparison: getPlayerComparison(
        playerChoiceOptionId,
        topOptionIds,
        playerVoteCount,
      ),
      topOptionIds,
      options: question.options.map((option) => {
        const voteCount = counts.get(option.id) ?? 0;

        return {
          optionId: option.id,
          label: option.label,
          voteCount,
          percentage:
            totalAnswered === 0
              ? 0
              : roundPercentage((voteCount / totalAnswered) * 100),
          isTopChoice: topOptionIds.includes(option.id),
          isPlayerChoice: playerChoiceOptionId === option.id,
        };
      }),
    };
  });
}
