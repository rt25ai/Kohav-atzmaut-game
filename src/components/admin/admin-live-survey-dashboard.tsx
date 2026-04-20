"use client";

import type { LiveSurveyOverview, SurveyPhase } from "@/lib/types";

type AdminLiveSurveyDashboardProps = {
  overview: LiveSurveyOverview;
  surveyPhase: SurveyPhase;
};

export function AdminLiveSurveyDashboard({
  overview,
  surveyPhase,
}: AdminLiveSurveyDashboardProps) {
  return (
    <section
      className="admin-panel min-w-0 rounded-[34px] p-6"
      data-admin-live-survey-dashboard
      data-admin-results-section
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.95rem] text-[#5d7ca3]">מעקב תוצאות</p>
          <h2 className="font-display text-2xl text-[#0f254a]">דשבורד סקר חי</h2>
          <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
            אחוזים בזמן אמת לכל שאלה, כולל מוביל, כמות מענה ודילוגים.
          </p>
        </div>
        <div className="self-start rounded-full bg-[#edf6ff] px-4 py-2 text-base text-[#0f61d8] sm:self-auto sm:text-sm">
          {overview.answeredQuestionCount} מתוך {overview.questionCount} שאלות כבר קיבלו מענה
        </div>
      </div>

      <p className="mt-3 text-xs text-[#5d7ca3] sm:hidden">
        ← החליקו ימינה ושמאלה לעבור בין השאלות
      </p>
      <div
        className="admin-h-rail mt-5"
        data-admin-results-rail
      >
        {overview.questions.map((question) => (
          <article
            key={question.questionId}
            data-admin-live-question-card
            className="admin-card admin-h-rail-item rounded-[28px] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] text-[#5d7ca3] sm:text-sm">
                  {question.questionTitle}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-8 text-[#143764]">
                  {question.prompt}
                </h3>
              </div>
              {surveyPhase !== "live" ? (
                <span className="rounded-full bg-[#143764] px-3 py-1 text-xs text-white">
                  סופי
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#5d7ca3]">
              <span className="rounded-full bg-[#edf6ff] px-3 py-1">
                {question.totalAnswered} ענו
              </span>
              <span className="rounded-full bg-[#edf6ff] px-3 py-1">
                {question.skippedCount} דילגו
              </span>
              <span className="rounded-full bg-[#edf6ff] px-3 py-1">
                {question.totalResponses} תגובות
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {question.options.map((option) => (
                <div key={`${question.questionId}-${option.optionId}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[0.98rem] sm:text-sm">
                    <span className="font-medium text-[#143764]">{option.label}</span>
                    <span className="text-[#5d7ca3]">
                      {option.percentage}% | {option.voteCount} קולות
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#dfeaf9]">
                    <div
                      className={`h-full rounded-full ${
                        option.isTopChoice ? "bg-[#0f61d8]" : "bg-[#88b5f2]"
                      }`}
                      style={{ width: `${Math.max(option.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
