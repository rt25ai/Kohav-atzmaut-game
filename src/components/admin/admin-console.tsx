"use client";

import Image from "next/image";
import {
  Download,
  Eye,
  EyeOff,
  FileDown,
  LoaderCircle,
  QrCode,
  RotateCcw,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Lightbox } from "@/components/shared/lightbox";
import { useLiveJson } from "@/hooks/use-live-json";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import type {
  AdminSettingsPatch,
  AdminSnapshot,
  PhotoUploadRecord,
  PrizeLabels,
} from "@/lib/types";
import { formatPoints } from "@/lib/utils/format";

type AdminConsoleProps = {
  initialAuthorized: boolean;
  initialSnapshot: AdminSnapshot | null;
};

const EMPTY_ADMIN_SNAPSHOT: AdminSnapshot = {
  settings: {
    introText: "",
    prizeLabels: {
      first: "",
      second: "",
      third: "",
    },
    globalSoundEnabled: true,
  },
  players: [],
  activePlayers: [],
  leaderboard: [],
  photos: [],
  totalParticipants: 0,
};

async function fetchSnapshot() {
  const response = await fetch("/api/admin/snapshot", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("snapshot");
  }

  return (await response.json()) as { snapshot: AdminSnapshot };
}

export function AdminConsole({
  initialAuthorized,
  initialSnapshot,
}: AdminConsoleProps) {
  const [authorized, setAuthorized] = useState(initialAuthorized);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUploadRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const live = useLiveJson<{ snapshot: AdminSnapshot }>("/api/admin/snapshot", {
    initialData: { snapshot: initialSnapshot ?? EMPTY_ADMIN_SNAPSHOT },
    tables: ["players", "photo_uploads", "admin_settings", "game_events"],
    disabled: !authorized,
  });
  const snapshot = authorized ? live.data.snapshot : null;

  useEffect(() => {
    setPublicUrl(window.location.origin);
    void QRCode.toDataURL(window.location.origin, {
      margin: 1,
      width: 280,
      color: {
        dark: "#0f61d8",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, []);

  const login = async () => {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setBusy(false);
      setError("הסיסמה לא נכונה");
      return;
    }

    const json = await fetchSnapshot();
    live.setData(json);
    setAuthorized(true);
    setBusy(false);
  };

  const updateSettings = async (partial: AdminSettingsPatch) => {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });

    await live.refresh();
  };

  const playerAction = async (payload: Record<string, unknown>) => {
    await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await live.refresh();
  };

  const photoAction = async (
    photoId: string,
    action: "hide" | "delete" | "restore",
  ) => {
    await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId, action }),
    });

    await live.refresh();
  };

  if (!authorized || !snapshot) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass-panel rounded-[34px] p-8">
          <p className="text-sm text-[#6182a8]">אזור ניהול סודי</p>
          <h1 className="mt-2 font-display text-3xl text-[#0f254a]">
            כניסה לחדר הבקרה
          </h1>
          <p className="mt-3 text-[#58769d]">
            רק לצוות האירוע. לאחר ההתחברות תישמר עוגיית ניהול מאובטחת בדפדפן.
          </p>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            name="adminPassword"
            autoComplete="current-password"
            placeholder="סיסמת ניהול..."
            className="glass-panel mt-6 h-14 w-full rounded-[24px] px-4 text-right"
          />
          {error ? <p className="mt-3 text-sm text-[#9e3c3c]">{error}</p> : null}
          <button
            type="button"
            onClick={login}
            disabled={busy}
            className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[24px] bg-[#0f61d8] text-white"
          >
            {busy ? <LoaderCircle className="animate-spin" size={18} /> : null}
            כניסה
          </button>
        </div>
      </div>
    );
  }

  const selectedPhotoItems = selectedPhoto
    ? [buildPhotoLightboxItem(selectedPhoto)]
    : [];

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#5d7ca3]">חדר הבקרה של הערב</p>
            <h1 className="font-display text-3xl text-[#0f254a]">ניהול המשחק</h1>
            <p className="mt-2 text-sm text-[#5d7ca3]">
              מתעדכן בלייב בלי צורך בריענון ידני
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.assign("/api/admin/export");
              }}
              className="rounded-full bg-[#0f61d8] px-4 py-2 text-sm text-white"
            >
              ייצוא CSV
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/api/admin/photos-zip");
              }}
              className="rounded-full bg-[#153968] px-4 py-2 text-sm text-white"
            >
              הורדת ZIP תמונות
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setAuthorized(false);
                live.setData({ snapshot: EMPTY_ADMIN_SNAPSHOT });
              }}
              className="rounded-full border border-[#cfe4ff] px-4 py-2 text-sm text-[#43638b]"
            >
              התנתקות
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "משתתפים", value: snapshot.totalParticipants },
          { label: "פעילים עכשיו", value: snapshot.activePlayers.length },
          { label: "תמונות", value: snapshot.photos.length },
          { label: "מקום ראשון", value: snapshot.leaderboard[0]?.name ?? "—" },
        ].map((item) => (
          <div key={item.label} className="glass-panel rounded-[28px] p-5">
            <p className="text-sm text-[#5d7ca3]">{item.label}</p>
            <p className="mt-2 font-display text-3xl text-[#0f254a]">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="glass-panel rounded-[34px] p-6">
          <p className="text-sm text-[#5d7ca3]">הגדרות חיות</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[#5c7ca2]">טקסט פתיחה</span>
              <textarea
                defaultValue={snapshot.settings.introText}
                name="introText"
                autoComplete="off"
                rows={4}
                className="glass-panel w-full rounded-[24px] px-4 py-4 text-right"
                onBlur={(event) => {
                  void updateSettings({ introText: event.target.value });
                }}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              {(["first", "second", "third"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm text-[#5c7ca2]">
                    פרס {key === "first" ? "1" : key === "second" ? "2" : "3"}
                  </span>
                  <input
                    defaultValue={snapshot.settings.prizeLabels[key]}
                    name={`prize-${key}`}
                    autoComplete="off"
                    className="glass-panel h-12 w-full rounded-[20px] px-4 text-right"
                    onBlur={(event) => {
                      void updateSettings({
                        prizeLabels: {
                          [key]: event.target.value,
                        } as Partial<PrizeLabels>,
                      });
                    }}
                  />
                </label>
              ))}
            </div>

            <label className="flex items-center justify-between rounded-[24px] bg-white/55 px-4 py-4">
              <span className="text-[#143764]">צליל גלובלי</span>
              <input
                type="checkbox"
                checked={snapshot.settings.globalSoundEnabled}
                onChange={(event) => {
                  void updateSettings({
                    globalSoundEnabled: event.target.checked,
                  });
                }}
              />
            </label>
          </div>
        </div>

        <div className="glass-panel rounded-[34px] p-6">
          <div className="flex items-center gap-2 text-[#0f61d8]">
            <QrCode size={20} />
            <p className="font-display text-xl">QR לכניסה למשחק</p>
          </div>
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="QR"
              width={280}
              height={280}
              className="mx-auto mt-6 rounded-[28px] bg-white p-4"
            />
          ) : null}
          <div className="mt-4 flex gap-3">
            <a
              href={qrDataUrl}
              download="kochav-michael-qr.png"
              className="inline-flex items-center gap-2 rounded-full bg-[#0f61d8] px-4 py-2 text-sm text-white"
            >
              <Download size={16} />
              הורדת QR
            </a>
            <button
              type="button"
              onClick={() => {
                window.open(publicUrl, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] px-4 py-2 text-sm text-[#43638b]"
            >
              <FileDown size={16} />
              פתיחת המשחק
            </button>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[34px] p-6">
        <h2 className="font-display text-2xl text-[#0f254a]">שחקנים ולוח מלא</h2>
        <div className="mt-5 space-y-3">
          {snapshot.leaderboard.map((entry) => (
            <div key={entry.playerId} className="rounded-[24px] bg-white/55 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[#143764]">
                    מקום {entry.rank} • {entry.name}
                  </p>
                  <p className="text-sm text-[#6484aa]">
                    {formatPoints(entry.totalScore)} • {entry.correctAnswers} נכונות •{" "}
                    {entry.photoMissionsCompleted} משימות
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void playerAction({
                        action: "adjust",
                        playerId: entry.playerId,
                        delta: 100,
                      })
                    }
                    className="rounded-full border border-[#cfe4ff] px-3 py-2 text-sm text-[#0f61d8]"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void playerAction({
                        action: "adjust",
                        playerId: entry.playerId,
                        delta: -100,
                      })
                    }
                    className="rounded-full border border-[#cfe4ff] px-3 py-2 text-sm text-[#43638b]"
                  >
                    -100
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void playerAction({
                        action: "reset",
                        playerId: entry.playerId,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-[#edf6ff] px-3 py-2 text-sm text-[#0f61d8]"
                  >
                    <RotateCcw size={14} />
                    איפוס
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[34px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[#0f254a]">ניהול תמונות</h2>
            <p className="mt-2 text-sm text-[#5d7ca3]">
              פריסה קומפקטית כדי לראות כמה תמונות ביחד. לחיצה על תמונה תפתח אותה
              להגדלה.
            </p>
          </div>
          <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-sm text-[#0f61d8]">
            {snapshot.photos.length} תמונות במאגר
          </div>
        </div>

        <div className="admin-photo-grid mt-5">
          {snapshot.photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-[22px] bg-white/55">
              <button
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className="relative block aspect-square w-full"
              >
                <Image
                  src={photo.thumbnailUrl || photo.photoUrl}
                  alt={photo.missionTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </button>
              <div className="space-y-2 p-3">
                <p className="line-clamp-1 text-sm font-medium text-[#143764]">
                  {photo.missionTitle}
                </p>
                <p className="line-clamp-1 text-xs text-[#6484aa]">{photo.playerName}</p>
                {photo.caption ? (
                  <p className="line-clamp-2 text-xs text-[#55749c]">{photo.caption}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void photoAction(photo.id, photo.hidden ? "restore" : "hide")
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] px-3 py-1.5 text-xs text-[#43638b]"
                  >
                    {photo.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    {photo.hidden ? "החזרה" : "הסתרה"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void photoAction(photo.id, "delete")}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ffd7d7] px-3 py-1.5 text-xs text-[#a44848]"
                  >
                    <Trash2 size={14} />
                    מחיקה
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Lightbox
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        items={selectedPhotoItems}
      />
    </div>
  );
}
