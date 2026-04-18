"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { useLiveJson } from "@/hooks/use-live-json";
import type { LeaderboardEntry, PrizeLabels } from "@/lib/types";
import { formatPoints } from "@/lib/utils/format";
import { getStoredPlayerId } from "@/lib/utils/local-session";

type LeaderboardPageProps = {
  initialLeaderboard: LeaderboardEntry[];
  prizeLabels: PrizeLabels;
};

const medalClasses = [
  "from-[#ffd86b] to-[#f3b741]",
  "from-[#d9e1ef] to-[#aab8ce]",
  "from-[#ebc29f] to-[#c48450]",
];

export function LeaderboardPage({
  initialLeaderboard,
  prizeLabels,
}: LeaderboardPageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const currentPlayerId = getStoredPlayerId();
  const { data } = useLiveJson("/api/public/leaderboard", {
    initialData: { leaderboard: initialLeaderboard },
    tables: ["players"],
  });

  const filtered = useMemo(() => {
    const value = deferredQuery.trim();
    if (!value) {
      return data.leaderboard;
    }

    return data.leaderboard.filter((entry) => entry.name.includes(value));
  }, [data.leaderboard, deferredQuery]);

  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#5d7da3]">הקרב על הפסגה בזמן אמת</p>
            <h1 className="font-display text-3xl text-[#0f254a]">לוח התוצאות</h1>
          </div>
          <label className="glass-panel flex h-12 w-full max-w-sm items-center gap-3 rounded-full px-4">
            <Search size={18} className="text-[#6383a9]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              name="leaderboardSearch"
              autoComplete="off"
              placeholder="חיפוש לפי שם…"
              className="w-full bg-transparent text-right placeholder:text-[#7d9abf]"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {topThree.map((entry, index) => (
          <motion.article
            key={entry.playerId}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[34px] bg-gradient-to-br ${medalClasses[index]} p-[1px]`}
          >
            <div className="glass-panel h-full rounded-[33px] p-6 text-center">
              <p className="text-sm text-[#5a7393]">מקום {entry.rank}</p>
              <h2 className="mt-2 font-display text-2xl text-[#0f254a]">{entry.name}</h2>
              <p className="mt-3 text-3xl text-[#0f61d8]">{formatPoints(entry.totalScore)}</p>
              <p className="mt-3 text-sm text-[#56759b]">
                {index === 0 ? prizeLabels.first : index === 1 ? prizeLabels.second : prizeLabels.third}
              </p>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="glass-panel rounded-[34px] p-4 sm:p-6">
        <div className="space-y-3">
          {rest.map((entry) => (
            <div
              key={entry.playerId}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-4 py-4 ${
                entry.playerId === currentPlayerId ? "bg-[#deefff]" : "bg-white/55"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-10 text-center font-display text-xl text-[#0f61d8]">
                  {entry.rank}
                </span>
                <div>
                  <p className="font-medium text-[#143764]">{entry.name}</p>
                  <p className="text-xs text-[#6282a8]">
                    {entry.correctAnswers} נכונות • {entry.photoMissionsCompleted} משימות
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-medium text-[#0f254a]">{formatPoints(entry.totalScore)}</p>
                <p className="text-xs text-[#6282a8]">{entry.isActive ? "פעיל עכשיו" : "לא פעיל כרגע"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
