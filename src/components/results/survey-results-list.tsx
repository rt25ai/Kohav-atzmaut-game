"use client";

import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";

import type { SurveyQuestionResult } from "@/lib/types";

const COMPARISON_LABELS = {
  "top-choice": "בחרת כמו רוב המשתתפים",
  minority: "הלכת עם קבוצה קטנה יותר",
  unique: "בחרת תשובה ייחודית יחסית",
  skipped: "דילגת על השאלה הזו",
} as const;

function getInsightLabel(question: SurveyQuestionResult) {
  const sorted = [...question.options].sort(
    (left, right) => right.percentage - left.percentage,
  );
  const leader = sorted[0];
  const runnerUp = sorted[1];

  if (!leader) {
    return "הסקר עדיין מתחמם";
  }

  if (!runnerUp || leader.percentage - runnerUp.percentage >= 22) {
    return "בחירה מובילה בפער ברור";
  }

  if (Math.abs(leader.percentage - runnerUp.percentage) <= 6) {
    return "הקהילה כמעט חצויה";
  }

  if (question.skippedCount > 0) {
    return "יש גם מי שבחרו לדלג";
  }

  return "יש כאן נטייה ברורה אבל לא מוחלטת";
}

export function SurveyResultsList({
  questionResults,
}: {
  questionResults: SurveyQuestionResult[];
}) {
  return (
    <div data-survey-results-list className="space-y-5">
      {questionResults.map((question, index) => (
        <section
          key={question.questionId}
          className="stage-panel relative overflow-hidden rounded-[32px] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="section-kicker">
                <Sparkles size={14} />
                שאלה {index + 1}
              </div>
              <h2 className="mt-4 font-display text-2xl leading-tight text-white sm:text-3xl">
                {question.prompt}
              </h2>
            </div>
            <div className="space-y-2">
              <div className="broadcast-chip">{COMPARISON_LABELS[question.playerComparison]}</div>
              <div className="broadcast-chip">
                <Users size={14} />
                {question.totalResponses} משתתפים בדקו את השאלה
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-soft)]">
            {getInsightLabel(question)}
          </div>

          <div className="mt-5 space-y-3">
            {question.options.map((option, optionIndex) => (
              <motion.div
                key={option.optionId}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: optionIndex * 0.04, duration: 0.35 }}
                className={`rounded-[26px] border px-4 py-4 ${
                  option.isPlayerChoice
                    ? "border-[#9de0ff]/55 bg-[linear-gradient(180deg,rgba(16,75,123,0.54),rgba(10,42,70,0.56))]"
                    : "border-white/8 bg-white/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-lg font-medium text-white">{option.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {option.isPlayerChoice ? (
                        <span className="rounded-full bg-[#67cbff] px-3 py-1 text-[#031223]">
                          הבחירה שלך
                        </span>
                      ) : null}
                      {option.isTopChoice ? (
                        <span className="rounded-full bg-[rgba(255,217,135,0.18)] px-3 py-1 text-[#ffe29b]">
                          הבחירה המובילה
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/8 px-3 py-1 text-[var(--text-soft)]">
                        {option.voteCount} בחרו
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-3xl text-white">{option.percentage}%</p>
                    <p className="text-xs text-[var(--text-dim)]">פיזור הקהילה כרגע</p>
                  </div>
                </div>

                <div className="mt-4 result-track h-4">
                  <motion.div
                    className="result-fill h-full rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.max(option.percentage, 4)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: optionIndex * 0.06 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
