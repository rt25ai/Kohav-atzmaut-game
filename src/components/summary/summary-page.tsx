"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SurveyResultsList } from "@/components/results/survey-results-list";
import { useSound } from "@/components/shared/sound-provider";
import type { SummarySnapshot } from "@/lib/types";
import { getStoredPlayerId } from "@/lib/utils/local-session";

export function SummaryPage() {
  const { play, setGlobalSoundEnabled } = useSound();
  const [summary, setSummary] = useState<SummarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const playerId = getStoredPlayerId();
    if (!playerId) {
      setLoading(false);
      return;
    }

    void fetch(`/api/game/summary?playerId=${playerId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("summary");
        }

        const json = (await response.json()) as { summary: SummarySnapshot };
        setSummary(json.summary);
        setGlobalSoundEnabled(json.summary.settings.globalSoundEnabled);
        play("celebration");
      })
      .finally(() => setLoading(false));
  }, [play, setGlobalSoundEnabled]);

  if (loading) {
    return <div className="glass-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (!summary) {
    return (
      <div className="glass-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-[#0f254a]">אין עדיין סיכום להצגה</h1>
        <p className="mt-3 text-[#5d7da3]">
          כדי להגיע לכאן צריך להתחיל ולסיים משחק.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[38px] border border-white/55 bg-[linear-gradient(135deg,rgba(11,58,121,0.88),rgba(78,169,255,0.62))] px-6 py-10 text-white shadow-[0_34px_110px_rgba(9,41,87,0.18)] sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.32),transparent_22%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.22),transparent_18%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.28),transparent_24%)]" />
        <div className="relative z-10">
          <p className="text-sm text-white/80">כוכבניק - סקר הכי ישראלי שיש</p>
          <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
            כך הקהילה בחרה
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/90">
            סיימת את המסלול. עכשיו אפשר לראות איך הקהילה ענתה על כל שאלה,
            ואיפה הבחירות שלך עומדות ביחס לכולם.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass-panel rounded-[30px] p-6">
          <p className="text-sm text-[#5c7ca2]">שאלות שהשלמת</p>
          <p className="mt-2 font-display text-3xl text-[#0f254a]">
            {summary.survey.questionResults.length}
          </p>
        </div>
        <div className="glass-panel rounded-[30px] p-6">
          <p className="text-sm text-[#5c7ca2]">משימות צילום</p>
          <p className="mt-2 font-display text-3xl text-[#0f254a]">
            {summary.player.photoMissionsCompleted}
          </p>
        </div>
        <div className="glass-panel rounded-[30px] p-6">
          <p className="text-sm text-[#5c7ca2]">אנשים חדשים שפגשת</p>
          <p className="mt-2 font-display text-3xl text-[#0f254a]">
            {summary.player.newPeopleMet}
          </p>
        </div>
      </section>

      <SurveyResultsList questionResults={summary.survey.questionResults} />

      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/results"
            className="rounded-full bg-[#0f61d8] px-5 py-3 text-white"
          >
            לצפייה בתוצאות החיות
          </Link>
          <Link
            href="/gallery"
            className="rounded-full border border-[#cfe4ff] px-5 py-3 text-[#365682]"
          >
            לצפייה בגלריה
          </Link>
        </div>
      </section>
    </div>
  );
}
