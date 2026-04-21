"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Home, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { SummaryExtraPhotoForm } from "@/components/summary/summary-extra-photo-form";
import { SummaryResultsSheet } from "@/components/summary/summary-results-sheet";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { FestiveBurst } from "@/components/shared/festive-burst";
import { useSound } from "@/components/shared/sound-provider";
import { RESULTS_CELEBRATION_OVERLAY } from "@/lib/config";
import { getFestiveCue, type FestiveCue } from "@/lib/game/festive-feedback";
import type { SummarySnapshot } from "@/lib/types";
import {
  clearStoredActiveGame,
  getStoredPlayerId,
} from "@/lib/utils/local-session";

export function SummaryPage() {
  const router = useRouter();
  const { play, setGlobalSoundEnabled } = useSound();
  const [summary, setSummary] = useState<SummarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryCue, setSummaryCue] = useState<FestiveCue | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }

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
        setSummaryCue(getFestiveCue("summary-finished", 0));
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
        <h1 className="font-display text-3xl text-white">
          אין עדיין סיכום להצגה
        </h1>
        <p className="mt-3 text-[var(--text-soft)]">
          כדי להגיע לכאן צריך להתחיל ולסיים משחק.
        </p>
      </div>
    );
  }

  const hasQuestionResults = summary.survey.questionResults.length > 0;

  const restartGame = () => {
    clearStoredActiveGame(summary.player.id);
    setResultsOpen(false);
    startTransition(() => {
      router.push("/");
    });
  };

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
            רגע הסיום החגיגי
          </div>
          <h1 className="mt-4 font-display text-4xl leading-none text-white sm:text-6xl">
            סיימתם את המשחק
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
            כאן רואים את תמונת הערב שלכם: כמה שאלות השלמתם, כמה משימות צילום
            עשיתם, ואיך הבחירות שלכם השתלבו עם שאר המשתתפים.
          </p>
          <div className="min-h-[12rem] sm:min-h-[14rem]">
            <FestiveBurst cue={summaryCue} scopeKey="summary-finished" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="metric-plate px-6 py-6">
          <p className="text-sm text-[var(--text-dim)]">שאלות שהשלמתם</p>
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
          <p className="text-sm text-[var(--text-dim)]">אנשים חדשים שפגשתם</p>
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
              מה תרצו לעשות עכשיו?
            </h2>
          </div>
          {hasQuestionResults ? (
            <div className="broadcast-chip">
              <Users size={14} />
              אפשר לפתוח תוצאות אישיות ולדפדף שאלה-שאלה
            </div>
          ) : null}
        </div>
      </section>

      <section className="stage-panel-soft rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          {hasQuestionResults ? (
            <button
              data-summary-open-results
              type="button"
              onClick={() => setResultsOpen(true)}
              className="hero-button-primary rounded-full px-5 py-3"
            >
              הצגת התוצאות
            </button>
          ) : null}
          <Link href="/?return=home" className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3">
            <Home size={16} />
            דף הבית
          </Link>
          <button
            data-summary-new-game
            type="button"
            onClick={restartGame}
            className="hero-button-secondary rounded-full px-5 py-3"
          >
            משחק חדש
          </button>
          <Link href="/gallery" className="hero-button-secondary rounded-full px-5 py-3">
            <span className="inline-flex items-center gap-2">
              <Camera size={16} />
              לצפייה בגלריה
            </span>
          </Link>
        </div>
      </section>

      <SummaryResultsSheet
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        questionResults={summary.survey.questionResults}
      />

      <SummaryExtraPhotoForm />
    </div>
  );
}
