"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SurveyResultsList } from "@/components/results/survey-results-list";
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
      setLockedMessage("תוצאות הסקר נפתחות רק למי שסיים את המשחק.");
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
    return <div className="glass-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (!results || lockedMessage) {
    return (
      <div className="glass-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-[#0f254a]">תוצאות הסקר</h1>
        <p className="mt-3 text-[#5d7da3]">
          {lockedMessage ?? "צריך לסיים את המשחק כדי לראות את התוצאות."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/play"
            className="rounded-full bg-[#0f61d8] px-5 py-3 text-white"
          >
            חזרה למשחק
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[#cfe4ff] px-5 py-3 text-[#365682]"
          >
            למסך הבית
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <p className="text-sm text-[#5d7da3]">כוכבניק - סקר הכי ישראלי שיש</p>
        <h1 className="mt-2 font-display text-4xl text-[#0f254a]">
          תוצאות הסקר החיות
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d7da3]">
          כאן רואים בכל רגע איך הקהילה בחרה, ואיפה הבחירה שלך עומדת ביחס לכולם.
        </p>
      </section>

      <SurveyResultsList questionResults={results.questionResults} />
    </div>
  );
}
