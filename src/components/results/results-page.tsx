"use client";

import Image from "next/image";
import Link from "next/link";
import { Radio, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { SurveyResultsList } from "@/components/results/survey-results-list";
import { RESULTS_CELEBRATION_OVERLAY } from "@/lib/config";
import type { SurveyResultsSnapshot } from "@/lib/types";
import { getStoredPlayerId } from "@/lib/utils/local-session";

async function fetchResults(playerId: string) {
  const response = await fetch(`/api/game/results?playerId=${playerId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "results");
  }

  const json = (await response.json()) as { results: SurveyResultsSnapshot };
  return json.results;
}

export function ResultsPage() {
  const [results, setResults] = useState<SurveyResultsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  useEffect(() => {
    const playerId = getStoredPlayerId();

    if (!playerId) {
      setLockedMessage("תוצאות הסקר נפתחות רק למי שסיים את המסלול.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const nextResults = await fetchResults(playerId);
        if (!cancelled) {
          setResults(nextResults);
          setLockedMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLockedMessage(
            error instanceof Error
              ? error.message
              : "לא הצלחנו לטעון את תוצאות הסקר כרגע.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="stage-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (!results || lockedMessage) {
    return (
      <div className="stage-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-white">תוצאות הסקר</h1>
        <p className="mt-3 text-[var(--text-soft)]">
          {lockedMessage ?? "צריך לסיים את המשחק כדי לפתוח את התוצאות."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/play" className="hero-button-primary rounded-full px-5 py-3">
            חזרה למשחק
          </Link>
          <Link href="/" className="hero-button-secondary rounded-full px-5 py-3">
            למסך הבית
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="stage-panel relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8">
        <Image
          src={RESULTS_CELEBRATION_OVERLAY}
          alt=""
          fill
          className="object-cover opacity-[0.24] mix-blend-screen"
        />
        <div className="relative z-10">
          <div className="section-kicker">
            <Radio size={15} />
            לוח השידור החי של הקהילה
          </div>
          <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">
            תוצאות הסקר החיות
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
            כאן רואים בכל רגע איך הקהילה בוחרת, מי מוביל בכל שאלה, ואיך הבחירות שלך
            משתלבות בתוך התמונה הגדולה של הערב.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="broadcast-chip">
              <Sparkles size={14} />
              מתעדכן אוטומטית כל כמה שניות
            </div>
            <div className="broadcast-chip">
              הבחירה שלך נשארת מסומנת בכל שאלה
            </div>
          </div>
        </div>
      </section>

      <SurveyResultsList questionResults={results.questionResults} />
    </div>
  );
}
