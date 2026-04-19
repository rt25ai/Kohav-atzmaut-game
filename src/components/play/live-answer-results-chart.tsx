"use client";

import { motion } from "framer-motion";
import { Radio, Sparkles } from "lucide-react";

import type { SurveyQuestionResult } from "@/lib/types";

type LiveAnswerResultsChartProps = {
  questionResult: SurveyQuestionResult;
};

export function LiveAnswerResultsChart({
  questionResult,
}: LiveAnswerResultsChartProps) {
  return (
    <section
      data-live-answer-results
      className="mt-6 rounded-[30px] border border-[#9de0ff]/18 bg-[linear-gradient(180deg,rgba(7,29,52,0.94),rgba(5,19,35,0.92))] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-kicker">
            <Radio size={14} />
            תמונת מצב חיה
          </div>
          <p
            data-live-answer-results-note
            className="mt-3 text-sm leading-7 text-[#d7f4ff]"
          >
            הבחירה נקלטה. אלה האחוזים כרגע, לא התוצאה הסופית.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="broadcast-chip">
            <Sparkles size={14} />
            מתעדכן בזמן אמת
          </span>
          <span className="broadcast-chip">
            {questionResult.totalAnswered} ענו עד עכשיו
          </span>
        </div>
      </div>

      <div
        className="live-results-grid mt-5 gap-3 sm:gap-4"
        style={
          {
            ["--live-cols" as string]: String(questionResult.options.length),
          } as React.CSSProperties
        }
      >
        {questionResult.options.map((option, index) => {
          const barHeight = Math.max(option.percentage, option.isPlayerChoice ? 18 : 12);

          return (
            <article
              key={`${questionResult.questionId}-${option.optionId}`}
              data-live-results-option={option.optionId}
              data-player-choice={option.isPlayerChoice}
              className={`rounded-[24px] border px-3 py-4 text-center sm:px-4 ${
                option.isPlayerChoice
                  ? "border-[#9de0ff]/55 bg-[linear-gradient(180deg,rgba(16,75,123,0.54),rgba(10,42,70,0.56))]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">
                {option.optionId}
              </p>
              <p className="mt-2 text-sm leading-6 text-white">{option.label}</p>

              <div className="mt-4 flex h-40 items-end justify-center rounded-[20px] border border-white/8 bg-[#071427]/78 p-3">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className={`w-full rounded-[16px] ${
                    option.isPlayerChoice
                      ? "bg-[linear-gradient(180deg,#ffe08a_0%,#76d6ff_18%,#1e93e8_100%)] shadow-[0_0_18px_rgba(122,215,255,0.32)]"
                      : option.isTopChoice
                        ? "bg-[linear-gradient(180deg,#ffd782_0%,#4ab0ff_100%)]"
                        : "bg-[linear-gradient(180deg,#8edfff_0%,#237fd6_100%)]"
                  }`}
                />
              </div>

              <p className="mt-4 font-display text-3xl text-white">
                {option.percentage}%
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                {option.isPlayerChoice ? (
                  <span className="rounded-full bg-[#67cbff] px-3 py-1 text-[#031223]">
                    הבחירה שלך
                  </span>
                ) : null}
                {option.isTopChoice ? (
                  <span className="rounded-full bg-[rgba(255,217,135,0.18)] px-3 py-1 text-[#ffe29b]">
                    מוביל כרגע
                  </span>
                ) : null}
                <span className="rounded-full bg-white/8 px-3 py-1 text-[var(--text-soft)]">
                  {option.voteCount} בחרו
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
