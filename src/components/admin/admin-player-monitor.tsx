"use client";

import { AdminRailHint } from "@/components/admin/admin-rail-hint";
import type {
  AdminPlayerMonitorEntry,
  AdminPlayerMonitorStatus,
} from "@/lib/types";

type AdminPlayerMonitorProps = {
  players: AdminPlayerMonitorEntry[];
};

function getStatusLabel(status: AdminPlayerMonitorStatus) {
  switch (status) {
    case "active":
      return "פעיל";
    case "finishing-current-step":
      return "מסיים מסך נוכחי";
    case "completed":
      return "סיים";
    case "idle":
      return "ממתין";
    default:
      return status;
  }
}

function getStatusTone(status: AdminPlayerMonitorStatus) {
  switch (status) {
    case "active":
      return "bg-[#e9f7ef] text-[#1c7c45]";
    case "finishing-current-step":
      return "bg-[#fff4d8] text-[#946200]";
    case "completed":
      return "bg-[#edf6ff] text-[#0f61d8]";
    case "idle":
      return "bg-[#eef2f7] text-[#54708f]";
    default:
      return "bg-[#eef2f7] text-[#54708f]";
  }
}

function formatLastSeen(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function AdminPlayerMonitor({ players }: AdminPlayerMonitorProps) {
  return (
    <section
      className="glass-panel min-w-0 rounded-[34px] p-6"
      data-admin-player-monitor-section
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.95rem] text-[#5d7ca3]">משתתפים</p>
          <h2 className="font-display text-2xl text-[#0f254a]">ניטור משתתפים</h2>
          <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
            סטטוס חי, איפה כל משתתף נמצא וכמה כבר ענה או העלה.
          </p>
        </div>
        <div className="self-start rounded-full bg-[#edf6ff] px-4 py-2 text-base text-[#0f61d8] sm:self-auto sm:text-sm">
          {players.length} משתתפים
        </div>
      </div>

      {players.length > 1 ? <AdminRailHint /> : null}

      <div
        className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 md:block md:space-y-3"
        data-admin-player-monitor-rail
      >
        {players.map((player) => (
          <article
            key={player.playerId}
            data-admin-player-monitor-row
            className="min-w-0 shrink-0 basis-[85vw] snap-start rounded-[26px] bg-white/60 p-4 md:basis-auto"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#143764] sm:text-base">
                    {player.name}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${getStatusTone(player.status)}`}
                  >
                    {getStatusLabel(player.status)}
                  </span>
                </div>
                <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
                  נמצא עכשיו ב-{player.currentStepLabel}
                </p>
              </div>
              <p className="text-[0.9rem] leading-6 text-[#6484aa] sm:text-xs">
                נראה לאחרונה: {formatLastSeen(player.lastSeenAt)}
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-[18px] bg-[#edf6ff] px-3 py-3 text-base text-[#143764] sm:text-sm">
                {player.answeredQuestions} שאלות נענו
              </div>
              <div className="rounded-[18px] bg-[#edf6ff] px-3 py-3 text-base text-[#143764] sm:text-sm">
                {player.uploadedPhotos} תמונות בגלריה
              </div>
              <div className="rounded-[18px] bg-[#edf6ff] px-3 py-3 text-base text-[#143764] sm:text-sm">
                שלב #{player.currentStepIndex + 1}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
