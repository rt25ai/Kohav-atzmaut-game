"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, Radio, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SoundToggle } from "@/components/shared/sound-toggle";
import { useSound } from "@/components/shared/sound-provider";
import { useLiveJson } from "@/hooks/use-live-json";
import { FLAG_IMAGE, LOGO_IMAGE } from "@/lib/config";
import {
  clearPendingUploadsForPlayer,
  clearStoredPlayerId,
  getStoredPlayerId,
} from "@/lib/utils/local-session";

const titles: Record<string, string> = {
  "/": "כוכבניק - סקר הכי ישראלי שיש",
  "/play": "הסקר החי",
  "/gallery": "קיר הרגעים של הקהילה",
  "/leaderboard": "תוצאות הסקר",
  "/results": "תוצאות הסקר החיות",
  "/summary": "מסך הסיום",
};

export function BrandHeader() {
  const pathname = usePathname();
  const { setGlobalSoundEnabled } = useSound();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentTitle = titles[pathname] ?? "שידור חי";
  const { data } = useLiveJson("/api/public/snapshot", {
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
    },
    tables: ["players", "game_events", "photo_uploads", "admin_settings"],
  });

  useEffect(() => {
    setGlobalSoundEnabled(data.settings.globalSoundEnabled);
  }, [data.settings.globalSoundEnabled, setGlobalSoundEnabled]);

  useEffect(() => {
    setCurrentPlayerId(getStoredPlayerId());
  }, [pathname]);

  const exitToHome = () => {
    if (currentPlayerId) {
      clearPendingUploadsForPlayer(currentPlayerId);
    }

    clearStoredPlayerId();
    setCurrentPlayerId(null);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 py-3 sm:px-5">
      <div
        dir="ltr"
        className="stage-panel mx-auto grid max-w-[92rem] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[30px] px-3 py-2.5 sm:px-5"
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

        <div dir="rtl" className="flex items-center justify-center gap-3 text-center">
          <div className="hidden md:flex broadcast-chip">
            <Radio size={14} />
            <span>{data.activePlayersNow} פעילים עכשיו</span>
          </div>

          <div className="min-w-0">
            <p className="font-display text-[1.02rem] text-white sm:text-[1.12rem]">
              {currentTitle}
            </p>
            <p className="text-[0.72rem] text-[var(--text-dim)] sm:text-xs">
              אירוע קהילתי חי • {data.totalParticipants} משתתפים • אווירת במה חגיגית
            </p>
          </div>

          <div className="hidden md:flex broadcast-chip">
            <Sparkles size={14} />
            <span>תשובות, צילום וגילוי קהילתי</span>
          </div>

          {pathname !== "/" ? (
            <Link
              href="/"
              onClick={exitToHome}
              className="hero-button-secondary inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-medium sm:text-sm"
            >
              <Home size={15} />
              {pathname === "/play" ? "סיום וחזרה לבית" : "חזרה לבית"}
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
    </header>
  );
}
