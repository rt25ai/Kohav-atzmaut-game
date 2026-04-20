"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  FileDown,
  LoaderCircle,
  QrCode,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { AdminLiveSurveyDashboard } from "@/components/admin/admin-live-survey-dashboard";
import { AdminPlayerMonitor } from "@/components/admin/admin-player-monitor";
import { Lightbox } from "@/components/shared/lightbox";
import { useLiveJson } from "@/hooks/use-live-json";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import type {
  AdminSettingsPatch,
  AdminSnapshot,
  HostAnnouncementEndsMode,
  HostAnnouncementView,
  PhotoUploadRecord,
} from "@/lib/types";

type AdminConsoleProps = {
  initialAuthorized: boolean;
  initialSnapshot: AdminSnapshot | null;
};

type SurveyRuntimeAction = "publish-final-results" | "reopen-live-survey";

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
  activeHostAnnouncement: null,
  hostAnnouncements: [],
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
  finalizedAt: null,
  finalSurveySnapshot: null,
  liveSurveyOverview: {
    questionCount: 0,
    answeredQuestionCount: 0,
    totalParticipants: 0,
    questions: [],
  },
  playersFinishingCurrentStep: 0,
  playerMonitor: [],
};

async function fetchSnapshot() {
  const response = await fetch("/api/admin/snapshot", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("snapshot");
  }

  return (await response.json()) as { snapshot: AdminSnapshot };
}

function toLocalDateTimeValue(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromLocalDateTimeValue(value: string) {
  return new Date(value).toISOString();
}

function formatLocalDateTime(iso: string | null) {
  if (!iso) {
    return "";
  }

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function getHostStatusLabel(status: HostAnnouncementView["status"]) {
  switch (status) {
    case "active":
      return "פעילה עכשיו";
    case "scheduled":
      return "מתוזמנת";
    case "ended":
      return "הסתיימה";
    case "cancelled":
      return "בוטלה";
    default:
      return status;
  }
}

function getHostEndLabel(announcement: HostAnnouncementView) {
  if (announcement.status === "cancelled") {
    return "בוטלה לפני ההפעלה";
  }

  if (announcement.endsMode === "until_next") {
    return announcement.effectiveEndAt
      ? `עד ההודעה הבאה (${formatLocalDateTime(announcement.effectiveEndAt)})`
      : "עד ההודעה הבאה";
  }

  return announcement.effectiveEndAt
    ? `עד ${formatLocalDateTime(announcement.effectiveEndAt)}`
    : "עד זמן הסיום";
}

function getSurveyPhaseLabel(phase: AdminSnapshot["surveyPhase"]) {
  switch (phase) {
    case "live":
      return "פתוח למענה";
    case "closing":
      return "נסגר ומסיימים מסך נוכחי";
    case "finalized":
      return "תוצאות סופיות פורסמו";
    default:
      return phase;
  }
}

function getSurveyPhaseTone(phase: AdminSnapshot["surveyPhase"]) {
  switch (phase) {
    case "live":
      return "bg-[#e9f7ef] text-[#1c7c45]";
    case "closing":
      return "bg-[#fff4d8] text-[#946200]";
    case "finalized":
      return "bg-[#edf6ff] text-[#0f61d8]";
    default:
      return "bg-[#eef2f7] text-[#54708f]";
  }
}

function getSurveyActionSuccessMessage(action: SurveyRuntimeAction) {
  return action === "publish-final-results"
    ? "התוצאות הסופיות פורסמו והסקר נסגר למענה חדש"
    : "הסקר חזר למצב חי ונפתח שוב למענה חדש";
}

function getSurveyActionErrorMessage(action: SurveyRuntimeAction) {
  return action === "publish-final-results"
    ? "לא הצלחנו לפרסם את התוצאות הסופיות"
    : "לא הצלחנו להחזיר את הסקר למצב חי";
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
  const [hostMessage, setHostMessage] = useState("");
  const [hostPublishMode, setHostPublishMode] = useState<"now" | "schedule">("now");
  const [hostScheduledFor, setHostScheduledFor] = useState("");
  const [hostEndsMode, setHostEndsMode] =
    useState<HostAnnouncementEndsMode>("until_next");
  const [hostEndsAt, setHostEndsAt] = useState("");
  const [hostBusy, setHostBusy] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostSuccess, setHostSuccess] = useState<string | null>(null);
  const [surveyBusy, setSurveyBusy] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [surveySuccess, setSurveySuccess] = useState<string | null>(null);
  const [surveyConfirmAction, setSurveyConfirmAction] =
    useState<SurveyRuntimeAction | null>(null);
  const [photoQuery, setPhotoQuery] = useState("");
  const live = useLiveJson<{ snapshot: AdminSnapshot }>("/api/admin/snapshot", {
    initialData: { snapshot: initialSnapshot ?? EMPTY_ADMIN_SNAPSHOT },
    tables: [
      "players",
      "player_answers",
      "photo_uploads",
      "admin_settings",
      "game_events",
      "host_announcements",
      "survey_runtime_state",
    ],
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

  const runSurveyAction = async (action: SurveyRuntimeAction) => {
    setSurveyBusy(true);
    setSurveyError(null);
    setSurveySuccess(null);

    try {
      const response = await fetch("/api/admin/survey-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(json?.error || getSurveyActionErrorMessage(action));
      }

      await live.refresh();
      setSurveySuccess(getSurveyActionSuccessMessage(action));
      setSurveyConfirmAction(null);
    } catch (caughtError) {
      setSurveyError(
        caughtError instanceof Error
          ? caughtError.message
          : getSurveyActionErrorMessage(action),
      );
    } finally {
      setSurveyBusy(false);
    }
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

  const hostAction = async (payload: Record<string, unknown>) => {
    setHostBusy(true);
    setHostError(null);
    setHostSuccess(null);

    try {
      const response = await fetch("/api/admin/host-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(json?.error || "לא הצלחנו לשמור את הודעת המנחה");
      }

      await live.refresh();
      setHostSuccess("עודכן בהצלחה");
      return true;
    } catch (caughtError) {
      setHostError(
        caughtError instanceof Error
          ? caughtError.message
          : "לא הצלחנו לשמור את הודעת המנחה",
      );
      return false;
    } finally {
      setHostBusy(false);
    }
  };

  const createHostAnnouncement = async () => {
    const trimmedMessage = hostMessage.trim();
    if (!trimmedMessage) {
      setHostError("צריך לכתוב הודעה לפני ששולחים");
      return;
    }

    if (hostPublishMode === "schedule" && !hostScheduledFor) {
      setHostError("צריך לבחור שעת הפעלה מדויקת");
      return;
    }

    if (hostEndsMode === "at_time" && !hostEndsAt) {
      setHostError("צריך לבחור שעת סיום");
      return;
    }

    const scheduledFor =
      hostPublishMode === "schedule" ? fromLocalDateTimeValue(hostScheduledFor) : null;
    const endsAt = hostEndsMode === "at_time" ? fromLocalDateTimeValue(hostEndsAt) : null;

    const ok = await hostAction({
      action: "create",
      message: trimmedMessage,
      scheduledFor,
      endsMode: hostEndsMode,
      endsAt,
    });

    if (!ok) {
      return;
    }

    setHostMessage("");
    setHostPublishMode("now");
    setHostScheduledFor("");
    setHostEndsMode("until_next");
    setHostEndsAt("");
  };

  if (!authorized || !snapshot) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="admin-panel rounded-[34px] p-8">
          <p className="text-sm text-[#5d7ca3]">אזור ניהול סודי</p>
          <h1 className="mt-2 font-display text-3xl text-[#0f254a]">
            כניסה לחדר הבקרה
          </h1>
          <p className="mt-3 text-[#3d5b82]">
            רק לצוות האירוע. לאחר ההתחברות תישמר עוגיית ניהול מאובטחת בדפדפן.
          </p>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            name="adminPassword"
            autoComplete="current-password"
            placeholder="סיסמת ניהול..."
            className="admin-input mt-6 h-14 w-full rounded-[24px] px-4 text-right"
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
  const activeHostAnnouncement = snapshot.activeHostAnnouncement;
  const scheduledHostAnnouncements = snapshot.hostAnnouncements.filter(
    (announcement) => announcement.status === "scheduled",
  );
  const previousHostAnnouncements = snapshot.hostAnnouncements
    .filter(
      (announcement) =>
        announcement.status === "ended" || announcement.status === "cancelled",
      )
    .slice(0, 8);
  const surveyIsLive = snapshot.surveyPhase === "live";
  const surveyCanReopen = snapshot.surveyPhase !== "live";
  const surveyConfirmTitle =
    surveyConfirmAction === "publish-final-results"
      ? "לסיים את הסקר ולהציג תוצאות סופיות?"
      : surveyConfirmAction === "reopen-live-survey"
        ? "להחזיר את הסקר למצב חי?"
        : "";
  const surveyConfirmBody =
    surveyConfirmAction === "publish-final-results"
      ? "הפעולה תעצור מענה חדש, תקפיא את תוצאות הלייב ותציג לכולם את התוצאה הרשמית. אפשר יהיה לבטל אחר כך ולהחזיר למצב חי."
      : surveyConfirmAction === "reopen-live-survey"
        ? "הפעולה תחזיר את הסקר למצב חי, תפתח שוב מענה חדש ותסיר את נעילת התוצאות הסופיות."
        : "";
  const surveyConfirmLabel =
    surveyConfirmAction === "publish-final-results"
      ? "כן, לסיים ולהציג תוצאות"
      : surveyConfirmAction === "reopen-live-survey"
        ? "כן, להחזיר למצב חי"
        : "";
  const filteredPhotos = useMemo(() => {
    const value = photoQuery.trim().toLocaleLowerCase("he");
    if (!value) {
      return snapshot.photos;
    }
    return snapshot.photos.filter((photo) =>
      (photo.playerName ?? "").toLocaleLowerCase("he").includes(value),
    );
  }, [photoQuery, snapshot.photos]);

  return (
    <div className="flex flex-col gap-6">
      <section className="admin-panel order-1 rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.95rem] text-[#5d7ca3]">חדר הבקרה של הערב</p>
            <h1 className="mt-1 font-display text-[2rem] text-[#0f254a] sm:text-3xl">
              ניהול המשחק
            </h1>
            <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
              מתעדכן בלייב בלי צורך בריענון ידני
            </p>
          </div>
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                window.location.assign("/api/admin/export");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0f61d8] px-4 text-base text-white sm:w-auto sm:text-sm"
            >
              ייצוא CSV
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/api/admin/photos-zip");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#153968] px-4 text-base text-white sm:w-auto sm:text-sm"
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
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#cfe4ff] px-4 text-base text-[#43638b] sm:w-auto sm:text-sm"
            >
              התנתקות
            </button>
          </div>
        </div>
      </section>

      <section className="order-2 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: "\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD", value: snapshot.totalParticipants },
          { label: "\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05E2\u05DB\u05E9\u05D9\u05D5", value: snapshot.activePlayers.length },
          {
            label: "\u05E9\u05D0\u05DC\u05D5\u05EA \u05E2\u05DD \u05DE\u05E2\u05E0\u05D4",
            value: snapshot.liveSurveyOverview.answeredQuestionCount,
          },
          {
            label: "\u05DE\u05E1\u05D9\u05D9\u05DE\u05D9\u05DD \u05DE\u05E1\u05DA \u05E0\u05D5\u05DB\u05D7\u05D9",
            value: snapshot.playersFinishingCurrentStep,
          },
        ].map((item) => (
          <div key={item.label} className="admin-panel rounded-[28px] p-5">
            <p className="text-[0.92rem] leading-6 text-[#5d7ca3] sm:text-sm">
              {item.label}
            </p>
            <p className="mt-2 font-display text-[2rem] text-[#0f254a] sm:text-3xl">
              {item.value}
            </p>
          </div>
        ))}
      </section>
      <section
        className="admin-panel order-5 rounded-[34px] p-5 sm:p-6"
        data-admin-survey-control-section
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1" data-admin-survey-copy>
            <p className="text-[0.95rem] text-[#5d7ca3]">
              {"\u05E1\u05E7\u05E8 \u05D7\u05D9"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl text-[#0f254a]">
                {"\u05E9\u05DC\u05D9\u05D8\u05D4 \u05E2\u05DC \u05E1\u05D2\u05D9\u05E8\u05EA \u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA"}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs ${getSurveyPhaseTone(snapshot.surveyPhase)}`}
              >
              
                {getSurveyPhaseLabel(snapshot.surveyPhase)}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
              {"\u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC \u05E4\u05E8\u05E1\u05D5\u05DD \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05E1\u05D5\u05E4\u05D9\u05D5\u05EA \u05DE\u05E7\u05E4\u05D9\u05D0\u05D4 \u05D0\u05EA \u05D4\u05D0\u05D7\u05D5\u05D6\u05D9\u05DD \u05D4\u05E8\u05E9\u05DE\u05D9\u05D9\u05DD, \u05D7\u05D5\u05E1\u05DE\u05EA \u05DE\u05E2\u05E0\u05D4 \u05D7\u05D3\u05E9,"}
              {"\u05D5\u05DE\u05E9\u05D0\u05D9\u05E8\u05D4 \u05E8\u05E7 \u05DC\u05DE\u05D9 \u05E9\u05DB\u05D1\u05E8 \u05D1\u05EA\u05D5\u05DA \u05DE\u05E1\u05DA \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05D5\u05EA\u05D5."}
            </p>
            <p className="mt-2 max-w-3xl text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
              {surveyIsLive
                ? "לפני הסגירה תופיע בקשת אישור, כדי שלא תהיה לחיצה בטעות."
                : "אפשר לשחרר מכאן את הסיום ולהחזיר את הסקר למצב חי בכל רגע."}
            </p>
            {snapshot.finalizedAt ? (
              <p className="mt-2 text-[0.95rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
                {"\u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05E0\u05E0\u05E2\u05DC\u05D5 \u05D1-"}{formatLocalDateTime(snapshot.finalizedAt)}
              </p>
            ) : null}
          </div>
          <div className="grid w-full gap-3 sm:w-auto">
            <button
              type="button"
              data-admin-publish-final-results
              disabled={!surveyIsLive || surveyBusy}
              onClick={() => setSurveyConfirmAction("publish-final-results")}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f28c28] px-5 text-base font-medium text-white shadow-[0_18px_40px_rgba(242,140,40,0.28)] transition hover:bg-[#de7b18] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
            >
              {surveyBusy && surveyConfirmAction === "publish-final-results"
                ? "מפרסמים..."
                : "הצגת תוצאות סופיות וסגירת הסקר"}
            </button>
            {surveyCanReopen ? (
              <button
                type="button"
                data-admin-reopen-live-results
                disabled={surveyBusy}
                onClick={() => setSurveyConfirmAction("reopen-live-survey")}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#11875d] px-5 text-base font-medium text-white shadow-[0_18px_40px_rgba(17,135,93,0.22)] transition hover:bg-[#0d714d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
              >
                <RotateCcw size={16} />
                {surveyBusy && surveyConfirmAction === "reopen-live-survey"
                  ? "מחזירים ללייב..."
                  : "החזר למצב חי"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 min-h-[1.5rem] text-sm">
          {surveyError ? <p className="text-[#a44848]">{surveyError}</p> : null}
          {!surveyError && surveySuccess ? (
            <p className="text-[#0f61d8]">{surveySuccess}</p>
          ) : null}
        </div>
      </section>
      <section
        className="admin-panel order-4 rounded-[34px] p-5 sm:p-6"
        data-admin-tools-section
      >
        <p className="text-[0.95rem] text-[#5d7ca3]">כלים מהירים</p>
        <h2 className="mt-2 font-display text-2xl text-[#0f254a]">
          שליטה קומפקטית למסך קטן
        </h2>
        <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
          השארנו כאן רק פעולות שבאמת שימושיות בזמן אמת בטלפון: צליל גלובלי
          וקיצורי דרך לפעולות חיות.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-[24px] bg-[#f3f8ff] px-4 py-4">
            <div className="min-w-0">
              <span className="block text-base font-medium text-[#143764]">
                צליל גלובלי
              </span>
              <span className="mt-1 block text-[0.92rem] leading-6 text-[#5d7ca3] sm:text-sm">
                שליטה מיידית על סאונד המשתתפים
              </span>
            </div>
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

          <div className="rounded-[24px] bg-[#f3f8ff] p-4">
            <p className="text-base font-medium text-[#143764]">פעולות מהירות</p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.assign("/api/admin/export");
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0f61d8] px-4 text-base text-white sm:text-sm"
              >
                ייצוא CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.assign("/api/admin/photos-zip");
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#153968] px-4 text-base text-white sm:text-sm"
              >
                הורדת ZIP תמונות
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        className="admin-panel order-3 rounded-[34px] p-5 sm:p-6"
        data-admin-host-section
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.95rem] text-[#5d7ca3]">Host Mode</p>
            <h2 className="font-display text-2xl text-[#0f254a]">הודעות מנחה חיות</h2>
            <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
              שולחים מסר חי לכל המשתתפים או מתזמנים הודעה מדויקת להמשך הערב.
            </p>
          </div>
          <div className="w-full rounded-full bg-[#edf6ff] px-4 py-2 text-base text-[#0f61d8] sm:w-auto sm:text-sm">
            {snapshot.nextHostTransitionAt
              ? `המעבר הבא: ${formatLocalDateTime(snapshot.nextHostTransitionAt)}`
              : "אין מעבר מתוזמן כרגע"}
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] bg-[#f3f8ff] p-5">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[#5c7ca2]">הודעה</span>
                <textarea
                  value={hostMessage}
                  onChange={(event) => setHostMessage(event.target.value)}
                  rows={4}
                  maxLength={180}
                  className="admin-input w-full rounded-[24px] px-4 py-4 text-right"
                  placeholder="לדוגמה: כולם מתכנסים ליד הבמה בעוד 5 דקות"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] bg-[#eff6ff] p-4">
                  <p className="text-base font-medium text-[#143764]">מתי לשלוח</p>
                  <div className="mt-3 grid gap-2">
                    <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-[0.98rem] text-[#274b79] sm:text-sm">
                      <span>שליחה מיידית</span>
                      <input
                        type="radio"
                        name="host-publish-mode"
                        checked={hostPublishMode === "now"}
                        onChange={() => setHostPublishMode("now")}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-[0.98rem] text-[#274b79] sm:text-sm">
                      <span>תזמון לשעה מדויקת</span>
                      <input
                        type="radio"
                        name="host-publish-mode"
                        checked={hostPublishMode === "schedule"}
                        onChange={() => setHostPublishMode("schedule")}
                      />
                    </label>
                  </div>

                  {hostPublishMode === "schedule" ? (
                    <label className="mt-3 block">
                      <span className="mb-2 block text-[0.95rem] text-[#5c7ca2] sm:text-sm">
                        שעת הפעלה
                      </span>
                      <input
                        value={hostScheduledFor}
                        onChange={(event) => setHostScheduledFor(event.target.value)}
                        type="datetime-local"
                        className="admin-input h-12 w-full rounded-[18px] px-4 text-right"
                      />
                    </label>
                  ) : null}
                </div>

                <div className="rounded-[24px] bg-[#eff6ff] p-4">
                  <p className="text-base font-medium text-[#143764]">כמה זמן היא תישאר</p>
                  <div className="mt-3 grid gap-2">
                    <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-[0.98rem] text-[#274b79] sm:text-sm">
                      <span>עד ההודעה הבאה</span>
                      <input
                        type="radio"
                        name="host-ends-mode"
                        checked={hostEndsMode === "until_next"}
                        onChange={() => setHostEndsMode("until_next")}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-[0.98rem] text-[#274b79] sm:text-sm">
                      <span>עד זמן סיום מוגדר</span>
                      <input
                        type="radio"
                        name="host-ends-mode"
                        checked={hostEndsMode === "at_time"}
                        onChange={() => setHostEndsMode("at_time")}
                      />
                    </label>
                  </div>

                  {hostEndsMode === "at_time" ? (
                    <label className="mt-3 block">
                      <span className="mb-2 block text-[0.95rem] text-[#5c7ca2] sm:text-sm">
                        שעת סיום
                      </span>
                      <input
                        value={hostEndsAt}
                        onChange={(event) => setHostEndsAt(event.target.value)}
                        type="datetime-local"
                        className="admin-input h-12 w-full rounded-[18px] px-4 text-right"
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[0.95rem] text-[#5d7ca3] sm:text-sm">
                  {hostMessage.trim().length}/180 תווים
                </div>
                <button
                  type="button"
                  disabled={hostBusy}
                  onClick={() => void createHostAnnouncement()}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0f61d8] px-5 text-base text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
                >
                  {hostBusy ? "שולחים..." : "שמור ושלח"}
                </button>
              </div>

              <div className="min-h-[1.5rem] text-sm">
                {hostError ? <p className="text-[#a44848]">{hostError}</p> : null}
                {!hostError && hostSuccess ? (
                  <p className="text-[#0f61d8]">{hostSuccess}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] bg-[#f3f8ff] p-5">
              <h3 className="font-display text-xl text-[#0f254a]">הודעה פעילה עכשיו</h3>
              {activeHostAnnouncement ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[22px] bg-[#edf6ff] px-4 py-4">
                    <p className="text-base font-medium text-[#143764] sm:text-sm">
                      {activeHostAnnouncement.message}
                    </p>
                    <p className="mt-2 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                      התחילה ב-{formatLocalDateTime(activeHostAnnouncement.startedAt)}
                    </p>
                    {activeHostAnnouncement.endsAt ? (
                      <p className="mt-1 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                        מסתיימת ב-{formatLocalDateTime(activeHostAnnouncement.endsAt)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={hostBusy}
                    onClick={() =>
                      void hostAction({
                        action: "stop-now",
                        hostAnnouncementId: activeHostAnnouncement.id,
                      })
                    }
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#153968] px-4 text-base text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
                  >
                    סיים עכשיו
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
                  אין הודעת מערכת פעילה כרגע.
                </p>
              )}
            </div>

            <div className="rounded-[28px] bg-[#f3f8ff] p-5">
              <h3 className="font-display text-xl text-[#0f254a]">הודעות מתוזמנות</h3>
              <div className="mt-4 space-y-3">
                {scheduledHostAnnouncements.length === 0 ? (
                  <p className="text-sm text-[#5d7ca3]">אין הודעות שמחכות להפעלה.</p>
                ) : (
                  scheduledHostAnnouncements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="rounded-[22px] bg-[#edf6ff] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-[#143764] sm:text-sm">
                            {announcement.message}
                          </p>
                          <p className="mt-2 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                            {getHostStatusLabel(announcement.status)} |{" "}
                            {formatLocalDateTime(announcement.scheduledFor)}
                          </p>
                          <p className="mt-1 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                            {getHostEndLabel(announcement)}
                          </p>
                        </div>
                        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                          <button
                            type="button"
                            disabled={hostBusy}
                            onClick={() =>
                              void hostAction({
                                action: "activate-now",
                                hostAnnouncementId: announcement.id,
                              })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0f61d8] px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            הפעל עכשיו
                          </button>
                          <button
                            type="button"
                            disabled={hostBusy}
                            onClick={() =>
                              void hostAction({
                                action: "cancel",
                                hostAnnouncementId: announcement.id,
                              })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[#cfe4ff] px-3 text-sm text-[#43638b] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            בטל
                          </button>
                          <button
                            type="button"
                            disabled={hostBusy}
                            onClick={() =>
                              void hostAction({
                                action: "delete",
                                hostAnnouncementId: announcement.id,
                              })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[#ffd7d7] px-3 text-sm text-[#a44848] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            מחק
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] bg-[#eef4fc] p-5">
          <h3 className="font-display text-xl text-[#0f254a]">הודעות קודמות</h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {previousHostAnnouncements.length === 0 ? (
              <p className="text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
                עדיין אין היסטוריית הודעות לערב הזה.
              </p>
            ) : (
              previousHostAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-[22px] bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-[#143764] sm:text-sm">
                        {announcement.message}
                      </p>
                      <p className="mt-2 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                        {getHostStatusLabel(announcement.status)} |{" "}
                        {formatLocalDateTime(announcement.scheduledFor)}
                      </p>
                      <p className="mt-1 text-[0.9rem] leading-6 text-[#5d7ca3] sm:text-xs">
                        {getHostEndLabel(announcement)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={hostBusy}
                      onClick={() =>
                        void hostAction({
                          action: "delete",
                          hostAnnouncementId: announcement.id,
                        })
                      }
                      className="rounded-full border border-[#ffd7d7] px-3 py-2 text-xs text-[#a44848] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      מחק
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="order-6">
        <AdminLiveSurveyDashboard
          overview={snapshot.liveSurveyOverview}
          surveyPhase={snapshot.surveyPhase}
        />
      </div>
      <div className="order-7">
        <AdminPlayerMonitor players={snapshot.playerMonitor} />
      </div>


      <section
        className="admin-panel order-8 rounded-[34px] p-6"
        data-admin-gallery-section
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[#0f254a]">ניהול תמונות</h2>
            <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
              פריסה קומפקטית כדי לראות כמה תמונות ביחד. לחיצה על תמונה תפתח אותה
              להגדלה.
            </p>
          </div>
          <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-base text-[#0f61d8] sm:text-sm">
            {filteredPhotos.length} מתוך {snapshot.photos.length} תמונות
          </div>
        </div>

        <label className="mt-4 flex h-12 items-center gap-3 rounded-full bg-[#f3f8ff] px-4">
          <Search size={18} className="text-[#5d7ca3]" />
          <input
            value={photoQuery}
            onChange={(event) => setPhotoQuery(event.target.value)}
            placeholder="חיפוש לפי שם משתתף..."
            className="h-full w-full bg-transparent text-right text-[#143764] outline-none placeholder:text-[#7d9abf]"
          />
        </label>

        <div
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-4"
          data-admin-gallery-rail
        >
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="admin-card min-w-0 overflow-hidden rounded-[22px]"
            >
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

      <section
        className="order-9 grid gap-6 lg:grid-cols-[1fr_0.9fr]"
        data-admin-link-section
      >
        <div className="admin-panel rounded-[34px] p-5 sm:p-6">
          <p className="text-[0.95rem] text-[#5d7ca3]">כניסה למשחק</p>
          <h2 className="mt-2 font-display text-2xl text-[#0f254a]">
            הלינק למשתתפים
          </h2>
          <p className="mt-2 break-all rounded-[20px] bg-[#f3f8ff] px-4 py-3 text-[0.95rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
            {publicUrl}
          </p>
          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                window.open(publicUrl, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0f61d8] px-4 text-base text-white sm:w-auto sm:text-sm"
            >
              <FileDown size={16} />
              פתיחת המשחק
            </button>
            <a
              href={qrDataUrl}
              download="kochav-michael-qr.png"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#cfe4ff] px-4 text-base text-[#43638b] sm:w-auto sm:text-sm"
            >
              <Download size={16} />
              הורדת QR
            </a>
          </div>
        </div>

        <div className="admin-panel rounded-[34px] p-5 sm:p-6">
          <div className="flex flex-col gap-2 text-[#0f61d8] sm:flex-row sm:items-center">
            <QrCode size={20} />
            <p className="font-display text-xl">QR לכניסה למשחק</p>
          </div>
          <p className="mt-2 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
            אפשר להציג מהמובייל או להוריד מיידית ולשתף למשתתפים.
          </p>
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="QR"
              width={280}
              height={280}
              className="mx-auto mt-5 w-full max-w-[15rem] rounded-[28px] bg-white p-4 sm:max-w-[17.5rem]"
            />
          ) : null}
        </div>
      </section>

      {surveyConfirmAction ? (
        <div
          data-admin-survey-confirm-modal
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061423cc] px-4 py-6"
        >
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_30px_90px_rgba(5,18,36,0.3)]">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-[#fff1df] p-2 text-[#d77000]">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#5d7ca3]">אישור פעולה</p>
                <h3 className="mt-1 font-display text-2xl text-[#0f254a]">
                  {surveyConfirmTitle}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-7 text-[#5d7ca3] sm:text-sm sm:leading-6">
                  {surveyConfirmBody}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-admin-cancel-survey-action
                disabled={surveyBusy}
                onClick={() => setSurveyConfirmAction(null)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#cfe4ff] px-5 text-base text-[#43638b] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                לא, חזרה
              </button>
              <button
                type="button"
                data-admin-confirm-publish-final-results={
                  surveyConfirmAction === "publish-final-results" ? true : undefined
                }
                data-admin-confirm-reopen-live-results={
                  surveyConfirmAction === "reopen-live-survey" ? true : undefined
                }
                disabled={surveyBusy}
                onClick={() => void runSurveyAction(surveyConfirmAction)}
                className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
                  surveyConfirmAction === "publish-final-results"
                    ? "bg-[#f28c28] shadow-[0_18px_40px_rgba(242,140,40,0.28)]"
                    : "bg-[#11875d] shadow-[0_18px_40px_rgba(17,135,93,0.22)]"
                }`}
              >
                {surveyBusy ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="animate-spin" size={16} />
                    מעדכנים...
                  </span>
                ) : (
                  surveyConfirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Lightbox
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        items={selectedPhotoItems}
      />
    </div>
  );
}
