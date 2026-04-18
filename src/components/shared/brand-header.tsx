"use client";

import Image from "next/image";
import Link from "next/link";
import { Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useLiveJson } from "@/hooks/use-live-json";
import { FLAG_IMAGE, LOGO_IMAGE } from "@/lib/config";
import {
  clearPendingUploadsForPlayer,
  clearStoredPlayerId,
  getStoredPlayerId,
} from "@/lib/utils/local-session";
import { SoundToggle } from "@/components/shared/sound-toggle";
import { useSound } from "@/components/shared/sound-provider";

const titles: Record<string, string> = {
  "/": "כוכבניק - סקר הכי ישראלי שיש",
  "/play": "הסקר החי",
  "/gallery": "גלריה קהילתית",
  "/leaderboard": "תוצאות הסקר",
  "/results": "תוצאות הסקר החיות",
  "/summary": "מסך הסיום",
};

export function BrandHeader() {
  const pathname = usePathname();
  const { setGlobalSoundEnabled } = useSound();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentTitle = titles[pathname] ?? "חדר הבקרה";
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
        className="glass-panel mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[26px] px-3 py-2 sm:px-5"
      >
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-16 overflow-hidden">
            <Image
              src={FLAG_IMAGE}
              alt="דגל ישראל"
              fill
              className="object-contain drop-shadow-[0_10px_22px_rgba(15,60,121,0.18)]"
              sizes="64px"
            />
          </div>
        </div>

        <div dir="rtl" className="flex items-center justify-center gap-3 text-center">
          <div className="min-w-0">
            <p className="font-display text-[0.95rem] text-[#0c2f61] sm:text-[1.05rem]">
              {currentTitle}
            </p>
            <p className="text-[0.72rem] text-[#3c5f8f] sm:text-xs">
              {data.activePlayersNow} פעילים עכשיו • {data.totalParticipants} משתתפים
            </p>
          </div>

          {pathname !== "/" ? (
            <Link
              href="/"
              onClick={exitToHome}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 text-xs font-medium text-[#113766] shadow-[0_10px_24px_rgba(15,60,121,0.08)] sm:text-sm"
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
              className="object-contain drop-shadow-[0_10px_22px_rgba(15,60,121,0.18)]"
              sizes="64px"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
