"use client";

import type {
  LiveSurveyQuestionOverview,
  OptionId,
  SurveyQuestionResult,
} from "@/lib/types";

type FinalSurveyResultsShowcaseProps = {
  questionResults: LiveSurveyQuestionOverview[];
  playerQuestionResults?: SurveyQuestionResult[];
};

function buildPlayerChoicesMap(playerQuestionResults: SurveyQuestionResult[] | undefined) {
  return new Map(
    (playerQuestionResults ?? [])
      .filter((question) => question.playerChoiceOptionId)
      .map((question) => [question.questionId, question.playerChoiceOptionId as OptionId]),
  );
}

export function FinalSurveyResultsShowcase({
  questionResults,
  playerQuestionResults,
}: FinalSurveyResultsShowcaseProps) {
  const playerChoices = buildPlayerChoicesMap(playerQuestionResults);

  return (
    <div data-final-results-showcase className="space-y-5">
      {questionResults.map((question, index) => {
        const playerChoice = playerChoices.get(question.questionId) ?? null;

        return (
          <section
            key={question.questionId}
            data-final-result-card
            className="stage-panel relative overflow-hidden rounded-[32px] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="section-kicker">
                  {"\u05E9\u05D0\u05DC\u05D4 "}{index + 1}
                </div>
                <h2 className="mt-4 font-display text-2xl leading-tight text-white sm:text-3xl">
                  {question.prompt}
                </h2>
              </div>
              <div className="space-y-2">
                <div className="broadcast-chip">
                  {"\u05EA\u05D5\u05E6\u05D0\u05D4 \u05E1\u05D5\u05E4\u05D9\u05EA"}
                </div>
                <div className="broadcast-chip">
                  {question.totalResponses}{" "}
                  {"\u05EA\u05D2\u05D5\u05D1\u05D5\u05EA"}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {question.options.map((option) => {
                const isPlayerChoice = playerChoice === option.optionId;

                return (
                  <div
                    key={`${question.questionId}-${option.optionId}`}
                    className={`rounded-[26px] border px-4 py-4 ${
                      isPlayerChoice
                        ? "border-[#9de0ff]/55 bg-[linear-gradient(180deg,rgba(16,75,123,0.54),rgba(10,42,70,0.56))]"
                        : "border-white/8 bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="max-w-2xl">
                        <p className="text-lg font-medium text-white">{option.label}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {isPlayerChoice ? (
                            <span className="rounded-full bg-[#67cbff] px-3 py-1 text-[#031223]">
                              {"\u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05E9\u05DC\u05DA"}
                            </span>
                          ) : null}
                          {option.isTopChoice ? (
                            <span className="rounded-full bg-[rgba(255,217,135,0.18)] px-3 py-1 text-[#ffe29b]">
                              {"\u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC\u05D4"}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white/8 px-3 py-1 text-[var(--text-soft)]">
                            {option.voteCount}{" "}
                            {"\u05D1\u05D7\u05E8\u05D5"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-display text-3xl text-white">
                          {option.percentage}%
                        </p>
                        <p className="text-xs text-[var(--text-dim)]">
                          {"\u05D0\u05D7\u05D5\u05D6 \u05DE\u05EA\u05D5\u05DA \u05DB\u05DC\u05DC \u05D4\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 result-track h-4">
                      <div
                        className="result-fill h-full rounded-full"
                        style={{ width: `${Math.max(option.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
