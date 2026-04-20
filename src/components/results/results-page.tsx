"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Radio, Sparkles, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FinalSurveyResultsShowcase } from "@/components/results/final-survey-results-showcase";
import { SurveyResultsList } from "@/components/results/survey-results-list";
import { FestiveBurst } from "@/components/shared/festive-burst";
import { useLiveJson } from "@/hooks/use-live-json";
import { RESULTS_CELEBRATION_OVERLAY } from "@/lib/config";
import {
  getFestiveCue,
  type FestiveCue,
} from "@/lib/game/festive-feedback";
import type {
  FinalSurveyResultsSnapshot,
  PublicSnapshot,
  SurveyPhase,
  SurveyResultsSnapshot,
} from "@/lib/types";
import { getStoredPlayerId } from "@/lib/utils/local-session";

type LivePublicSnapshot = PublicSnapshot & { mode?: string };

type ResultsResponse = {
  results: SurveyResultsSnapshot | null;
  surveyPhase: SurveyPhase;
  finalSurveySnapshot: FinalSurveyResultsSnapshot | null;
};

const EMPTY_PUBLIC_SNAPSHOT: LivePublicSnapshot = {
  settings: {
    introText: "",
    prizeLabels: { first: "", second: "", third: "" },
    globalSoundEnabled: true,
  },
  totalParticipants: 0,
  activePlayersNow: 0,
  leaderboard: [],
  latestPhotos: [],
  recentEvents: [],
  activeHostAnnouncement: null,
  activeSystemBanner: null,
  nextHostTransitionAt: null,
  surveyRuntime: {
    phase: "live",
    closedAt: null,
    finalizedAt: null,
    finalResultsSnapshot: null,
    finalBannerMessage: null,
    gracePlayers: [],
  },
  surveyPhase: "live",
  finalSurveySnapshot: null,
};

function formatFinalizedAt(iso: string | null) {
  if (!iso) {
    return null;
  }

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ResultsPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerResults, setPlayerResults] = useState<SurveyResultsSnapshot | null>(null);
  const [loadingPlayerResults, setLoadingPlayerResults] = useState(true);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [finalCue, setFinalCue] = useState<FestiveCue | null>(null);
  const didShowFinalCueRef = useRef(false);
  const publicLive = useLiveJson<LivePublicSnapshot>("/api/public/snapshot", {
    initialData: EMPTY_PUBLIC_SNAPSHOT,
    tables: [
      "player_answers",
      "survey_runtime_state",
    ],
  });

  useEffect(() => {
    setPlayerId(getStoredPlayerId());
  }, []);

  useEffect(() => {
    if (
      publicLive.data.surveyPhase === "finalized" &&
      publicLive.data.finalSurveySnapshot &&
      !didShowFinalCueRef.current
    ) {
      didShowFinalCueRef.current = true;
      setFinalCue(getFestiveCue("summary-finished", 0));
    }
  }, [publicLive.data.finalSurveySnapshot, publicLive.data.surveyPhase]);

  useEffect(() => {
    if (!playerId) {
      setLoadingPlayerResults(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/game/results?playerId=${playerId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "results");
        }

        const json = (await response.json()) as ResultsResponse;
        if (!cancelled) {
          setPlayerResults(json.results);
          setLockedMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPlayerResults(null);
          setLockedMessage(
            error instanceof Error
              ? error.message
              : "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D8\u05E2\u05D5\u05DF \u05D0\u05EA \u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05DB\u05E8\u05D2\u05E2.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlayerResults(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [playerId]);

  const finalSnapshot = publicLive.data.finalSurveySnapshot;
  const finalizedAtLabel = formatFinalizedAt(
    finalSnapshot?.finalizedAt ?? publicLive.data.surveyRuntime.finalizedAt,
  );

  if (publicLive.loading && loadingPlayerResults && !finalSnapshot) {
    return <div className="stage-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (finalSnapshot) {
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
              {"\u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05D5\u05E4\u05D9\u05D5\u05EA \u05E4\u05D5\u05E8\u05E1\u05DE\u05D5"}
            </div>
            <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">
              {"\u05DB\u05DA \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4 \u05D1\u05D7\u05E8\u05D4 \u05D4\u05E2\u05E8\u05D1"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
              {"\u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D5\u05D4\u05E8\u05D2\u05E2\u05D9\u05DD \u05E9\u05E0\u05E9\u05DE\u05E8\u05D5 \u05D1\u05DE\u05D4\u05DC\u05DA \u05D4\u05D7\u05D2, \u05D0\u05DC\u05D5 \u05D4\u05D0\u05D7\u05D5\u05D6\u05D9\u05DD \u05D4\u05E8\u05E9\u05DE\u05D9\u05D9\u05DD \u05E9\u05DC \u05D4\u05E1\u05E7\u05E8."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="broadcast-chip">
                <Users size={14} />
                {finalSnapshot.totalParticipants}{" "}
                {"\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD"}
              </div>
              {finalizedAtLabel ? (
                <div className="broadcast-chip">
                  <Sparkles size={14} />
                  {"\u05E0\u05E0\u05E2\u05DC \u05D1-"}{finalizedAtLabel}
                </div>
              ) : null}
              {playerResults ? (
                <div className="broadcast-chip">
                  {"\u05D4\u05D1\u05D7\u05D9\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA \u05DE\u05E1\u05D5\u05DE\u05E0\u05D5\u05EA \u05D1\u05DB\u05D7\u05D5\u05DC"}
                </div>
              ) : null}
            </div>

            <div className="min-h-[12rem] sm:min-h-[14rem]">
              <FestiveBurst cue={finalCue} scopeKey="final-results" />
            </div>
          </div>
        </section>

        <section className="stage-panel-soft rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-wrap gap-3">
            {playerId ? (
              <Link href="/summary" className="hero-button-primary rounded-full px-5 py-3">
                {"\u05DC\u05DE\u05E1\u05DA \u05D4\u05E1\u05D9\u05D5\u05DD \u05E9\u05DC\u05D9"}
              </Link>
            ) : null}
            <Link href="/gallery" className="hero-button-secondary rounded-full px-5 py-3">
              <span className="inline-flex items-center gap-2">
                <Camera size={16} />
                {"\u05DC\u05D2\u05DC\u05E8\u05D9\u05D4 \u05D4\u05D7\u05D9\u05D4"}
              </span>
            </Link>
            <Link href="/" className="hero-button-secondary rounded-full px-5 py-3">
              {"\u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA"}
            </Link>
          </div>
        </section>

        <FinalSurveyResultsShowcase
          questionResults={finalSnapshot.questionResults}
          playerQuestionResults={playerResults?.questionResults}
        />
      </div>
    );
  }

  if (loadingPlayerResults) {
    return <div className="stage-panel min-h-[50vh] rounded-[34px]" />;
  }

  if (!playerResults || lockedMessage) {
    return (
      <div className="stage-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-white">
          {"\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05E7\u05E8"}
        </h1>
        <p className="mt-3 text-[var(--text-soft)]">
          {lockedMessage ??
            "\u05E6\u05E8\u05D9\u05DA \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E9\u05D7\u05E7 \u05DB\u05D3\u05D9 \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D0\u05EA \u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/play" className="hero-button-primary rounded-full px-5 py-3">
            {"\u05D7\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E9\u05D7\u05E7"}
          </Link>
          <Link href="/" className="hero-button-secondary rounded-full px-5 py-3">
            {"\u05DC\u05DE\u05E1\u05DA \u05D4\u05D1\u05D9\u05EA"}
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
            {"\u05DC\u05D5\u05D7 \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05D7\u05D9 \u05E9\u05DC \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4"}
          </div>
          <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">
            {"\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05E7\u05E8 \u05D4\u05D7\u05D9\u05D5\u05EA"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
            {"\u05DB\u05D0\u05DF \u05E8\u05D5\u05D0\u05D9\u05DD \u05D1\u05DB\u05DC \u05E8\u05D2\u05E2 \u05D0\u05D9\u05DA \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4 \u05D1\u05D5\u05D7\u05E8\u05EA, \u05DE\u05D9 \u05DE\u05D5\u05D1\u05D9\u05DC \u05D1\u05DB\u05DC \u05E9\u05D0\u05DC\u05D4, \u05D5\u05D0\u05D9\u05DA \u05D4\u05D1\u05D7\u05D9\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA \u05DE\u05E9\u05EA\u05DC\u05D1\u05D5\u05EA \u05D1\u05EA\u05D5\u05DA \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D4\u05D2\u05D3\u05D5\u05DC\u05D4 \u05E9\u05DC \u05D4\u05E2\u05E8\u05D1."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="broadcast-chip">
              <Sparkles size={14} />
              {"\u05DE\u05EA\u05E2\u05D3\u05DB\u05DF \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DB\u05DC \u05DB\u05DE\u05D4 \u05E9\u05E0\u05D9\u05D5\u05EA"}
            </div>
            <div className="broadcast-chip">
              {"\u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05E9\u05DC\u05DA \u05E0\u05E9\u05D0\u05E8\u05EA \u05DE\u05E1\u05D5\u05DE\u05E0\u05EA \u05D1\u05DB\u05DC \u05E9\u05D0\u05DC\u05D4"}
            </div>
          </div>
        </div>
      </section>

      <SurveyResultsList questionResults={playerResults.questionResults} />
    </div>
  );
}
