"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { SurveyResultsList } from "@/components/results/survey-results-list";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useSound } from "@/components/shared/sound-provider";
import { RESULTS_CELEBRATION_OVERLAY } from "@/lib/config";
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
    return <div className="stage-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (!summary) {
    return (
      <div className="stage-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-white">אין עדיין סיכום להצגה</h1>
        <p className="mt-3 text-[var(--text-soft)]">
          כדי להגיע לכאן צריך להתחיל ולסיים משחק.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="stage-panel relative overflow-hidden rounded-[38px] px-6 py-10 sm:px-10">
        <Image
          src={RESULTS_CELEBRATION_OVERLAY}
          alt=""
          fill
          className="object-cover opacity-[0.3] mix-blend-screen"
        />
        <div className="relative z-10">
          <div className="section-kicker">
            <Sparkles size={15} />
            רגע ה־reveal הגדול
          </div>
          <h1 className="mt-4 font-display text-4xl leading-none text-white sm:text-6xl">
            כך הקהילה בחרה
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
            סיימת את המסלול. עכשיו נפתחת התמונה המלאה: איפה הקהילה הייתה כמעט
            מאוחדת, איפה היא התחלקה, ואיפה הבחירה שלך בלטה מול כולם.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="metric-plate px-6 py-6">
          <p className="text-sm text-[var(--text-dim)]">שאלות שהשלמת</p>
          <p className="mt-3 font-display text-4xl text-white">
            <AnimatedCounter value={summary.survey.questionResults.length} />
          </p>
        </div>
        <div className="metric-plate px-6 py-6">
          <p className="text-sm text-[var(--text-dim)]">משימות צילום</p>
          <p className="mt-3 font-display text-4xl text-white">
            <AnimatedCounter value={summary.player.photoMissionsCompleted} />
          </p>
        </div>
        <div className="metric-plate px-6 py-6">
          <p className="text-sm text-[var(--text-dim)]">אנשים חדשים שפגשת</p>
          <p className="mt-3 font-display text-4xl text-white">
            <AnimatedCounter value={summary.player.newPeopleMet} />
          </p>
        </div>
      </section>

      <section className="stage-panel-soft rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--text-dim)]">מסך סיום קהילתי</p>
            <h2 className="mt-2 font-display text-3xl text-white">
              איפה את או אתה בתוך התמונה הגדולה?
            </h2>
          </div>
          <div className="broadcast-chip">
            <Users size={14} />
            כל שאלה נצבעת לפי בחירת הקהילה
          </div>
        </div>
      </section>

      <SurveyResultsList questionResults={summary.survey.questionResults} />

      <section className="stage-panel-soft rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/results" className="hero-button-primary rounded-full px-5 py-3">
            לצפייה בתוצאות החיות
          </Link>
          <Link href="/gallery" className="hero-button-secondary rounded-full px-5 py-3">
            <span className="inline-flex items-center gap-2">
              <Camera size={16} />
              לצפייה בגלריה
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
