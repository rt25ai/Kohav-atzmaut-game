"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, Radio, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { SoundToggle } from "@/components/shared/sound-toggle";
import { useSound } from "@/components/shared/sound-provider";
import { SystemMessageBar } from "@/components/shared/system-message-bar";
import { useLiveJson } from "@/hooks/use-live-json";
import { FLAG_IMAGE, LOGO_IMAGE } from "@/lib/config";
import type { PublicSnapshot } from "@/lib/types";

const titles: Record<string, string> = {
  "/": "כוכבניק - הסקר הכי ישראלי שיש",
  "/play": "הסקר החי",
  "/gallery": "קיר הרגעים של הקהילה",
  "/leaderboard": "תוצאות הסקר",
  "/results": "תוצאות הסקר החיות",
  "/summary": "מסך הסיום",
};

type LivePublicSnapshot = PublicSnapshot & { mode?: string };

export function BrandHeader() {
  const pathname = usePathname();
  const { setGlobalSoundEnabled } = useSound();
  const currentTitle = titles[pathname] ?? "שידור חי";
  const { data, refresh } = useLiveJson<LivePublicSnapshot>("/api/public/snapshot", {
    initialData: {
      activePlayersNow: 0,
      totalParticipants: 0,
      settings: {
        introText: "",
        prizeLabels: { first: "", second: "", third: "" },
        globalSoundEnabled: true,
      },
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
    },
    tables: [
      "players",
      "game_events",
      "photo_uploads",
      "admin_settings",
      "host_announcements",
      "survey_runtime_state",
    ],
  });

  useEffect(() => {
    setGlobalSoundEnabled(data.settings.globalSoundEnabled);
  }, [data.settings.globalSoundEnabled, setGlobalSoundEnabled]);

  useEffect(() => {
    if (!data.nextHostTransitionAt) {
      return;
    }

    const delay = new Date(data.nextHostTransitionAt).getTime() - Date.now();
    if (delay <= 0) {
      void refresh();
      return;
    }

    const timeout = window.setTimeout(() => {
      void refresh();
    }, Math.min(delay + 150, 2_147_483_647));

    return () => window.clearTimeout(timeout);
  }, [data.nextHostTransitionAt, refresh]);

  const activePlayersLabel = `${data.activePlayersNow} פעילים עכשיו`;
  const participantsLabel = `${data.totalParticipants} משתתפים`;

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 py-2 sm:px-5 sm:py-3">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-2">
        <div className="stage-panel rounded-[28px] px-3 py-2.5 sm:px-5 sm:py-2.5">
          <div dir="rtl" className="space-y-2.5 sm:hidden">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
              <div className="relative h-10 w-12 shrink-0 overflow-hidden">
                <Image
                  src={LOGO_IMAGE}
                  alt="לוגו מושב כוכב מיכאל"
                  fill
                  className="object-contain drop-shadow-[0_14px_26px_rgba(74,176,255,0.22)]"
                  sizes="48px"
                />
              </div>

              <div className="min-w-0 text-center">
                <p className="font-display text-[0.92rem] leading-tight text-white">
                  {currentTitle}
                </p>
                <p className="mt-0.5 text-[0.68rem] leading-tight text-[var(--text-dim)]">
                  {activePlayersLabel} | {participantsLabel}
                </p>
              </div>

              <div className="relative h-10 w-12 shrink-0 overflow-hidden">
                <Image
                  src={FLAG_IMAGE}
                  alt="דגל ישראל"
                  fill
                  className="object-contain drop-shadow-[0_14px_26px_rgba(74,176,255,0.22)]"
                  sizes="48px"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="broadcast-chip min-w-0 px-2.5 py-1.5 text-[0.7rem]">
                <Radio size={13} />
                <span>{participantsLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                {pathname !== "/" ? (
                  <Link
                    href="/?return=home"
                    data-home-link
                    className="hero-button-secondary inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.7rem] font-medium"
                  >
                    <Home size={14} />
                    חזרה
                  </Link>
                ) : null}

                <SoundToggle />
              </div>
            </div>
          </div>

          <div
            dir="ltr"
            className="hidden items-center gap-3 sm:grid sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="flex items-center gap-2">
              <div className="relative h-12 w-16 overflow-hidden">
                <Image
                  src={FLAG_IMAGE}
                  alt="דגל ישראל"
                  fill
                  className="object-contain drop-shadow-[0_14px_26px_rgba(74,176,255,0.22)]"
                  sizes="64px"
                />
              </div>
            </div>

            <div
              dir="rtl"
              className="flex min-w-0 items-center justify-center gap-3 text-center"
            >
              <div className="hidden md:flex broadcast-chip">
                <Radio size={14} />
                <span>{activePlayersLabel}</span>
              </div>

              <div className="min-w-0">
                <p className="font-display text-[1.02rem] text-white sm:text-[1.12rem]">
                  {currentTitle}
                </p>
                <p className="text-[0.72rem] text-[var(--text-dim)] sm:text-xs">
                  {activePlayersLabel} | {participantsLabel}
                </p>
              </div>

              <div className="hidden md:flex broadcast-chip">
                <Sparkles size={14} />
                <span>שאלות, צילום ורגעים קהילתיים</span>
              </div>

              {pathname !== "/" ? (
                <Link
                  href="/?return=home"
                  data-home-link
                  className="hero-button-secondary inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-medium sm:text-sm"
                >
                  <Home size={15} />
                  חזרה לבית
                </Link>
              ) : null}

              <SoundToggle />
            </div>

            <div className="flex items-center justify-end">
              <div className="relative h-12 w-16 overflow-hidden">
                <Image
                  src={LOGO_IMAGE}
                  alt="לוגו מושב כוכב מיכאל"
                  fill
                  className="object-contain drop-shadow-[0_14px_26px_rgba(74,176,255,0.22)]"
                  sizes="64px"
                />
              </div>
            </div>
          </div>
        </div>

        {data.activeSystemBanner ? (
          <SystemMessageBar announcement={data.activeSystemBanner} />
        ) : null}
      </div>
    </header>
  );
}
