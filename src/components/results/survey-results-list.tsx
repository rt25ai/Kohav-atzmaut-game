"use client";

import type { SurveyQuestionResult } from "@/lib/types";

const COMPARISON_LABELS = {
  "top-choice": "בחרת כמו רוב המשתתפים",
  minority: "הלכת עם קבוצה קטנה יותר",
  unique: "בחרת תשובה ייחודית יחסית",
  skipped: "דילגת על השאלה הזו",
} as const;

export function SurveyResultsList({
  questionResults,
}: {
  questionResults: SurveyQuestionResult[];
}) {
  return (
    <div className="space-y-4">
      {questionResults.map((question, index) => (
        <section key={question.questionId} className="glass-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#5d7da3]">שאלה {index + 1}</p>
              <h2 className="mt-2 text-xl text-[#0f254a]">{question.prompt}</h2>
            </div>
            <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-sm text-[#0f61d8]">
              {COMPARISON_LABELS[question.playerComparison]}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {question.options.map((option) => (
              <div
                key={option.optionId}
                className={`rounded-[24px] px-4 py-4 ${
                  option.isPlayerChoice
                    ? "bg-[#eaf4ff] ring-1 ring-[#9dcfff]"
                    : "bg-white/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[#143764]">{option.label}</span>
                  <span className="text-sm font-semibold text-[#0f61d8]">
                    {option.percentage}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dcecff]">
                  <div
                    className={`h-full rounded-full ${
                      option.isTopChoice ? "bg-[#0f61d8]" : "bg-[#8abcf6]"
                    }`}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {option.isPlayerChoice ? (
                    <span className="rounded-full bg-[#0f61d8] px-3 py-1 text-white">
                      הבחירה שלך
                    </span>
                  ) : null}
                  {option.isTopChoice ? (
                    <span className="rounded-full bg-[#edf6ff] px-3 py-1 text-[#0f61d8]">
                      הבחירה המובילה
                    </span>
                  ) : null}
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[#4a678f]">
                    {option.voteCount} בחרו
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
