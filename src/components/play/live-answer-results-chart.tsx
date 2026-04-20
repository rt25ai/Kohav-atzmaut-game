"use client";

import { motion } from "framer-motion";
import { Radio, Sparkles } from "lucide-react";

import type { SurveyQuestionResult } from "@/lib/types";

type LiveAnswerResultsChartProps = {
  questionResult: SurveyQuestionResult;
  variant?: "live" | "summary";
};

export function LiveAnswerResultsChart({
  questionResult,
  variant = "live",
}: LiveAnswerResultsChartProps) {
  const isSummary = variant === "summary";
  const kickerLabel = isSummary ? "תוצאות הקהילה" : "תמונת מצב חיה";
  const noteCopy = isSummary
    ? "אלה האחוזים בקהילה לשאלה הזו. הבחירה שלך מסומנת."
    : "הבחירה נקלטה. אלה האחוזים כרגע, לא התוצאה הסופית.";
  const chipCopy = isSummary ? "תוצאות סופיות" : "מתעדכן בזמן אמת";
  const totalCopy = isSummary
    ? `${questionResult.totalAnswered} ענו בסך הכל`
    : `${questionResult.totalAnswered} ענו עד עכשיו`;

  return (
    <section
      data-live-answer-results
      data-results-variant={variant}
      className="mt-6 rounded-[30px] border border-[#9de0ff]/18 bg-[linear-gradient(180deg,rgba(7,29,52,0.94),rgba(5,19,35,0.92))] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-kicker">
            <Radio size={14} />
            {kickerLabel}
          </div>
          <p
            data-live-answer-results-note
            className="mt-3 text-sm leading-7 text-[#d7f4ff]"
          >
            {noteCopy}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`broadcast-chip ${isSummary ? "" : "on-air-chip"}`}>
            {isSummary ? null : (
              <span className="on-air-dot" aria-hidden="true" />
            )}
            <Sparkles size={14} />
            {chipCopy}
          </span>
          <span className="broadcast-chip">{totalCopy}</span>
        </div>
      </div>

      <div
        className="live-results-grid mt-5 gap-2 sm:gap-4"
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
              className={`flex flex-col rounded-[18px] border px-2 py-3 text-center sm:rounded-[24px] sm:px-4 sm:py-4 ${
                option.isPlayerChoice
                  ? "border-[#9de0ff]/55 bg-[linear-gradient(180deg,rgba(16,75,123,0.54),rgba(10,42,70,0.56))]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)] sm:text-xs sm:tracking-[0.24em]">
                {option.optionId}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[0.78rem] leading-snug text-white sm:mt-2 sm:line-clamp-none sm:text-sm sm:leading-6">
                {option.label}
              </p>

              <div className="mt-3 flex h-24 items-end justify-center rounded-[14px] border border-white/8 bg-[#071427]/78 p-2 sm:mt-4 sm:h-40 sm:rounded-[20px] sm:p-3">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight}%` }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className={`w-full rounded-[10px] sm:rounded-[16px] ${
                    option.isPlayerChoice
                      ? "bg-[linear-gradient(180deg,#ffe08a_0%,#76d6ff_18%,#1e93e8_100%)] shadow-[0_0_18px_rgba(122,215,255,0.32)]"
                      : option.isTopChoice
                        ? "bg-[linear-gradient(180deg,#ffd782_0%,#4ab0ff_100%)]"
                        : "bg-[linear-gradient(180deg,#8edfff_0%,#237fd6_100%)]"
                  }`}
                />
              </div>

              <p className="mt-2 font-display text-xl text-white sm:mt-4 sm:text-3xl">
                {option.percentage}%
              </p>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 text-[10px] sm:mt-2 sm:gap-2 sm:text-xs">
                {option.isPlayerChoice ? (
                  <span className="rounded-full bg-[#67cbff] px-2 py-0.5 text-[#031223] sm:px-3 sm:py-1">
                    שלך
                  </span>
                ) : null}
                {option.isTopChoice ? (
                  <span className="rounded-full bg-[rgba(255,217,135,0.18)] px-2 py-0.5 text-[#ffe29b] sm:px-3 sm:py-1">
                    מוביל
                  </span>
                ) : null}
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[var(--text-soft)] sm:px-3 sm:py-1">
                  {option.voteCount}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
