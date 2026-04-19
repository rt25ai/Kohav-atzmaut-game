import type { SurveyQuestionResult } from "@/lib/types";

import { SummarySingleBarChart } from "@/components/summary/summary-single-bar-chart";

const COMPARISON_COPY: Record<
  SurveyQuestionResult["playerComparison"],
  string
> = {
  "top-choice": "בחרת כמו רוב המשתתפים בשאלה הזו.",
  minority: "בחרת עם קבוצה קטנה יותר של משתתפים.",
  unique: "הלכת כאן על בחירה יחסית ייחודית.",
  skipped: "דילגת על השאלה הזו ולכן אין כאן השוואה אישית.",
};

type SummaryResultsCardProps = {
  result: SurveyQuestionResult;
  index: number;
  total: number;
};

export function SummaryResultsCard({
  result,
  index,
  total,
}: SummaryResultsCardProps) {
  const playerChoice =
    result.options.find((option) => option.isPlayerChoice) ??
    result.options.find(
      (option) => option.optionId === result.playerChoiceOptionId,
    ) ??
    null;

  return (
    <article
      data-summary-result-card
      className="stage-panel rounded-[30px] p-5 sm:p-6"
      aria-label={`תוצאה ${index + 1} מתוך ${total}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p data-summary-results-card-index className="section-kicker">
          {index + 1} / {total}
        </p>
        <p className="text-sm text-[var(--text-dim)]">{result.questionTitle}</p>
      </div>

      <h3 className="mt-4 font-display text-3xl leading-tight text-white sm:text-4xl">
        {result.prompt}
      </h3>

      {playerChoice ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-sm text-[var(--text-dim)]">הבחירה שלך</p>
            <p className="mt-2 text-xl text-white">{playerChoice.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              {COMPARISON_COPY[result.playerComparison]}
            </p>
          </div>

          <SummarySingleBarChart
            answerLabel={playerChoice.label}
            percentage={playerChoice.percentage}
          />
        </div>
      ) : (
        <div
          data-summary-skip-state
          className="mt-5 rounded-[24px] border border-dashed border-white/18 bg-white/5 px-5 py-6 text-sm leading-7 text-[var(--text-soft)]"
        >
          {COMPARISON_COPY.skipped}
        </div>
      )}
    </article>
  );
}
