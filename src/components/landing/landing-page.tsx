"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Images, Play, Radio, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Lightbox } from "@/components/shared/lightbox";
import { RelativeTimeText } from "@/components/shared/relative-time-text";
import { useSound } from "@/components/shared/sound-provider";
import { OpenPhotoUpload } from "@/components/landing/open-photo-upload";
import { SummaryExtraPhotoForm } from "@/components/summary/summary-extra-photo-form";
import { useLiveJson } from "@/hooks/use-live-json";
import { HOME_HERO_IMAGE } from "@/lib/config";
import { formatPublicRecentEventMessage } from "@/lib/game/live-event-feed";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import {
  buildGalleryGroups,
  getParticipantVoice,
  pickByParticipantType,
} from "@/lib/game/player-experience";
import type {
  GalleryEntry,
  GameEventRecord,
  ParticipantType,
  PublicSnapshot,
  SessionSnapshot,
} from "@/lib/types";
import {
  clearStoredActiveGame,
  clearStoredPlayerId,
  clearStoredSessionSnapshot,
  getStoredPlayerId,
  getStoredSessionSnapshot,
  setStoredPlayerId,
  setStoredSessionSnapshot,
} from "@/lib/utils/local-session";

type LandingPageProps = {
  initialSnapshot: PublicSnapshot;
  initialGallery: GalleryEntry[];
};

function formatLiveEventMessage(event: GameEventRecord) {
  return formatPublicRecentEventMessage(event);
}

async function fetchStoredSession(playerId: string) {
  const response = await fetch(`/api/game/session?playerId=${playerId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("session");
  }

  const json = (await response.json()) as { session: SessionSnapshot };
  return json.session;
}

export function LandingPage({
  initialSnapshot,
  initialGallery,
}: LandingPageProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [participantType, setParticipantType] =
    useState<ParticipantType>("solo_male");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingResume, setCheckingResume] = useState(false);
  const [resumeSession, setResumeSession] = useState<SessionSnapshot | null>(null);
  const [showFreshStart, setShowFreshStart] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { play, setGlobalSoundEnabled } = useSound();
  const voice = getParticipantVoice(participantType);
  const isHomeReturnMode = () =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("return") === "home";

  const { data } = useLiveJson("/api/public/snapshot", {
    initialData: initialSnapshot,
    tables: ["game_events", "photo_uploads"],
  });
  const { data: galleryData } = useLiveJson("/api/public/gallery", {
    initialData: { photos: initialGallery },
    tables: ["photo_uploads"],
  });

  const galleryGroups = useMemo(
    () => buildGalleryGroups(galleryData.photos),
    [galleryData.photos],
  );
  const latestGalleryGroups = galleryGroups.slice(0, 4);
  const selectedGroup =
    galleryGroups.find((group) => group.playerId === selectedPlayerId) ?? null;
  const lightboxItems = selectedGroup
    ? selectedGroup.photos.map((photo) => buildPhotoLightboxItem(photo))
    : [];
  useEffect(() => {
    setGlobalSoundEnabled(data.settings.globalSoundEnabled);
  }, [data.settings.globalSoundEnabled, setGlobalSoundEnabled]);

  useEffect(() => {
    const storedPlayerId = getStoredPlayerId();
    if (!storedPlayerId) {
      setResumeSession(null);
      return;
    }

    setCheckingResume(true);

    const cachedSession = getStoredSessionSnapshot();
    if (cachedSession?.player.id === storedPlayerId) {
      setResumeSession(cachedSession);
      setName(cachedSession.player.name);
      setParticipantType(cachedSession.player.participantType);
    }

    void fetchStoredSession(storedPlayerId)
      .then((storedSession) => {
        setStoredPlayerId(storedSession.player.id);
        setStoredSessionSnapshot(storedSession);
        setResumeSession(storedSession);

        if (isHomeReturnMode()) {
          return;
        }

        if (storedSession.player.completed) {
          return;
        }

        router.replace("/play");
      })
      .catch(() => {
        clearStoredPlayerId();
        clearStoredSessionSnapshot();
        setResumeSession(null);
      })
      .finally(() => {
        setCheckingResume(false);
      });
  }, [router]);

  const resumeButtonLabel = resumeSession?.player.completed
    ? pickByParticipantType(resumeSession.player.participantType, {
        solo_male: "למסך הסיום שלך",
        solo_female: "למסך הסיום שלך",
        family: "למסך הסיום שלכם",
      })
    : pickByParticipantType(
        resumeSession?.player.participantType ?? participantType,
        {
          solo_male: "המשך משחק",
          solo_female: "המשיכי משחק",
          family: "המשיכו משחק",
        },
      );

  const newGameButtonLabel = pickByParticipantType(
    resumeSession?.player.participantType ?? participantType,
    {
      solo_male: "התחל משחק חדש",
      solo_female: "התחילי משחק חדש",
      family: "התחילו משחק חדש",
    },
  );

  const continueStoredGame = () => {
    if (!resumeSession) {
      return;
    }

    play("start");
    router.push(resumeSession.player.completed ? "/summary" : "/play");
  };

  const startFreshGame = () => {
    if (resumeSession) {
      clearStoredActiveGame(resumeSession.player.id);
    } else {
      clearStoredPlayerId();
      clearStoredSessionSnapshot();
    }

    setResumeSession(null);
    setShowFreshStart(true);
    setError(null);
    setName("");
    setParticipantType("solo_male");
    router.replace("/");
  };

  const startGame = async () => {
    if (name.trim().length < 2) {
      setError("צריך שם קצר כדי להיכנס למשחק.");
      return;
    }

    setSubmitting(true);
    setError(null);
    play("start");

    const response = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, participantType }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError("לא הצלחנו להתחיל כרגע. נסו שוב.");
      return;
    }

    const json = (await response.json()) as { session: SessionSnapshot };

    setStoredPlayerId(json.session.player.id);
    setStoredSessionSnapshot(json.session);
    router.push("/play");
  };

  if (checkingResume) {
    return (
      <div className="stage-panel flex min-h-[60vh] items-center justify-center rounded-[34px]">
        <p className="text-sm text-[var(--text-soft)]">
          בודקים אם יש משחק שממתין לך...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-b-[2.75rem] border-b border-white/8 sm:left-1/2 sm:-mx-0 sm:w-screen sm:-translate-x-1/2">
        <div className="relative min-h-[84svh]">
          <Image
            src={HOME_HERO_IMAGE}
            alt="אווירת במה חגיגית לערב הקהילתי"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,19,0.3)_0%,rgba(3,10,19,0.48)_18%,rgba(5,14,26,0.74)_54%,rgba(4,10,18,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,223,154,0.14),transparent_18%),radial-gradient(circle_at_78%_24%,rgba(92,183,255,0.22),transparent_24%)]" />

          <div className="relative z-10 mx-auto flex min-h-[84svh] max-w-[92rem] flex-col justify-end px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-end"
            >
              <div className="max-w-3xl space-y-5">
                <div className="section-kicker">
                  <Sparkles size={15} />
                  משחק קהילתי חי לערב יום העצמאות
                </div>

                <div className="space-y-5">
                  <span className="hero-eyebrow">
                    <span className="hero-eyebrow-dot" aria-hidden="true" />
                    מושב כוכב מיכאל
                    <span className="hero-eyebrow-dot" aria-hidden="true" />
                  </span>
                  <h1 className="hero-festive-title max-w-4xl">
                    כוכבניק
                  </h1>
                  <div className="hero-festive-divider max-w-md" aria-hidden="true">
                    ✦
                  </div>
                  <p className="hero-festive-lede max-w-2xl">
                    {data.settings.introText}
                  </p>
                  <p className="hero-festive-sub max-w-2xl">
                    עונים על שאלות קצרות, מצלמים רגעים מהאירוע, ובסוף מגלים איך כל
                    הקהילה בחרה וחוותה את הערב.
                  </p>
                </div>

                <div className="hero-stat-stars">
                  <div className="hero-stat-star" data-stat-tone="participants">
                    <span className="hero-stat-star-shape" aria-hidden="true" />
                    <div className="hero-stat-star-content">
                      <p className="hero-stat-star-value">
                        <AnimatedCounter value={data.totalParticipants} />
                      </p>
                      <p className="hero-stat-star-label">משתתפים</p>
                    </div>
                  </div>
                  <div className="hero-stat-star" data-stat-tone="active">
                    <span className="hero-stat-star-shape" aria-hidden="true" />
                    <div className="hero-stat-star-content">
                      <p className="hero-stat-star-value">
                        <AnimatedCounter value={data.activePlayersNow} />
                      </p>
                      <p className="hero-stat-star-label">פעילים עכשיו</p>
                    </div>
                  </div>
                  <div className="hero-stat-star" data-stat-tone="gallery">
                    <span className="hero-stat-star-shape" aria-hidden="true" />
                    <div className="hero-stat-star-content">
                      <p className="hero-stat-star-value">
                        <AnimatedCounter value={galleryData.photos.length} />
                      </p>
                      <p className="hero-stat-star-label">רגעים בגלריה</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/gallery"
                  onClick={() => {
                    play("gallery");
                  }}
                  data-hero-gallery-cta
                  aria-label="צפו בגלריה הרשמית של המשחק והערב שלנו"
                  className="gallery-cta-shell"
                >
                  <span className="gallery-cta-button">
                    <span className="gallery-cta-icon-wrap" aria-hidden="true">
                      <Images size={28} />
                      <Sparkles size={14} className="gallery-cta-spark" />
                    </span>
                    <span className="gallery-cta-copy">
                      צפו בגלריה הרשמית של המשחק והערב שלנו!
                    </span>
                  </span>
                </Link>

                <div className="stage-panel-soft max-w-2xl rounded-[28px] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="broadcast-chip on-air-chip">
                      <span className="on-air-dot" aria-hidden="true" />
                      <Radio size={15} />
                      קורה עכשיו באירוע
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                      <span className="on-air-dot" aria-hidden="true" />
                      מתעדכן בזמן אמת
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {data.recentEvents.length === 0 ? (
                      <p className="text-sm leading-7 text-[var(--text-soft)]">
                        עוד רגע ייכנסו המשתתפים הראשונים והעדכונים יופיעו כאן.
                      </p>
                    ) : (
                      data.recentEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start justify-between gap-4 rounded-[20px] border border-white/10 bg-white/6 px-4 py-3"
                        >
                          <p className="text-sm leading-6 text-white">
                            {formatLiveEventMessage(event)}
                          </p>
                          <span className="shrink-0 text-xs text-[var(--text-dim)]">
                            <RelativeTimeText value={event.createdAt} />
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="stage-panel relative overflow-hidden rounded-[32px] p-5 sm:p-6">
                <div className="relative z-10">
                  <div className="section-kicker">
                    <Play size={15} />
                    מצטרפים עכשיו למשחק
                  </div>
                  <h2 className="mt-5 font-display text-3xl text-white sm:text-4xl">
                    נכנסים בשנייה
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                    בוחרים איך להופיע במשחק, כותבים שם קצר, ומיד נכנסים לשאלות,
                    לצילום ולחוויה של הערב.
                  </p>

                  {resumeSession && !showFreshStart ? (
                    <div className="mt-5 rounded-[26px] border border-[#8fd8ff2e] bg-[linear-gradient(180deg,rgba(10,38,63,0.84),rgba(7,24,42,0.92))] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="text-right">
                          <p className="text-sm text-[var(--text-dim)]">
                            כבר יש שמירה מקומית על המכשיר הזה
                          </p>
                          <h3 className="mt-2 font-display text-2xl text-white">
                            {resumeSession.player.completed
                              ? "חוזרים למסך הסיום שלך"
                              : "חוזרים בדיוק לאותה נקודה"}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                            {resumeSession.player.name}{" "}
                            {resumeSession.player.completed
                              ? "כבר סיים את המשחק ויכול להמשיך מהסיכום ולהעלות עוד תמונות."
                              : "כבר התחיל לשחק, אז אפשר להמשיך מאותה נקודה או לפתוח משחק חדש מההתחלה."}
                          </p>
                        </div>
                        <div className="broadcast-chip">
                          <Play size={14} />
                          {resumeSession.player.completed ? "משחק הושלם" : "משחק פעיל"}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          data-resume-game
                          onClick={continueStoredGame}
                          className="hero-button-primary inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[22px] px-6 text-base font-semibold transition hover:-translate-y-0.5"
                        >
                          <Play size={18} />
                          {resumeButtonLabel}
                        </button>
                        <button
                          type="button"
                          data-start-new-game
                          onClick={startFreshGame}
                          className="hero-button-secondary inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[22px] px-6 text-base font-semibold text-white"
                        >
                          {newGameButtonLabel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {[
                      {
                        id: "solo_male" as const,
                        label: "שחקן יחיד",
                        note: "בלשון זכר",
                      },
                      {
                        id: "solo_female" as const,
                        label: "שחקנית יחידה",
                        note: "בלשון נקבה",
                      },
                      {
                        id: "family" as const,
                        label: "משפחה",
                        note: "בלשון רבים",
                      },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        data-active={participantType === option.id}
                        onClick={() => setParticipantType(option.id)}
                        className="mode-pill rounded-[22px] px-4 py-3 text-right transition"
                      >
                        <span className="block text-sm font-semibold">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs opacity-80">
                          {option.note}
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="mt-5 block text-sm text-[var(--text-soft)]">
                    {participantType === "family"
                      ? "איך יופיע שם המשפחה במשחק?"
                      : "איך יקראו לך במשחק?"}
                  </label>

                  <div className="mt-2 flex flex-col gap-3">
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      name="playerName"
                      autoComplete="nickname"
                      placeholder={
                        participantType === "family"
                          ? "שם המשפחה..."
                          : "השם שלך..."
                      }
                      className="hero-input h-14 rounded-[22px] px-4 text-right placeholder:text-[#6a87a5]"
                    />

                    <button
                      type="button"
                      onClick={startGame}
                      disabled={submitting}
                      className="hero-button-primary inline-flex h-14 items-center justify-center gap-2 rounded-[22px] px-6 text-base font-semibold transition hover:-translate-y-0.5"
                    >
                      <Play size={18} />
                      {submitting ? voice.startingLabel : voice.startLabel}
                    </button>
                  </div>
                    </>
                  )}

                  {error ? (
                    <p aria-live="polite" className="mt-3 text-sm text-[#ffd7d7]">
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-5 flex justify-center">
                    <Link
                      href="/results"
                      onClick={() => {
                        play("click");
                      }}
                      className="hero-button-secondary inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-bold"
                    >
                      <Sparkles size={18} />
                      תוצאות המשחק
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <OpenPhotoUpload />

      <section className="stage-panel rounded-[34px] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="section-kicker">
                <Users size={15} />
                איך זה עובד
              </div>
              <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">
                קצר, ברור ומהנה
              </h2>
            </div>
            <div className="broadcast-chip">
              משפחות, חברים, שכנים וילדים
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Play,
                title: "נכנסים מהר",
                text: "בוחרים סוג משתתף, כותבים שם, ומתחילים בלי הרשמה מסובכת.",
              },
              {
                icon: Sparkles,
                title: "עונים ונהנים",
                text: "השאלות קצרות, קלילות ומתאימות לקהל רחב, כך שקל להצטרף גם באמצע הערב.",
              },
              {
                icon: Camera,
                title: "מעלים רגעים",
                text: "כל תמונה שנשלחת נכנסת לגלריה החיה ומספרת מה קורה מסביבכם בזמן אמת.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[26px] border border-white/10 bg-white/6 p-5"
              >
                <item.icon className="text-[#80d4ff]" size={22} />
                <h3 className="mt-4 font-display text-xl text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
      </section>

      <section className="stage-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-kicker">
              <Images size={15} />
              הגלריה החיה
            </div>
            <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">
              המשתתפים האחרונים שהעלו רגע מהערב
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)] sm:text-base">
              כל תמונה חדשה מקפיצה את המשתתף לראש הרשימה. לחיצה על כרטיס פותחת
              את כל האלבום שלו בקרוסלה נוחה לצפייה.
            </p>
          </div>
          <Link
            href="/gallery"
            onClick={() => {
              play("gallery");
            }}
            className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
          >
            לכל הגלריה
          </Link>
        </div>

        {latestGalleryGroups.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {latestGalleryGroups.map((group) => (
              <button
                key={group.playerId}
                type="button"
                onClick={() => {
                  play("photo");
                  setSelectedPlayerId(group.playerId);
                  setSelectedIndex(0);
                }}
                className="stage-panel-soft overflow-hidden rounded-[28px] text-right transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-[1.02] overflow-hidden">
                  <Image
                    src={group.cover.thumbnailUrl || group.cover.photoUrl}
                    alt={group.cover.missionTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,10,18,0.94))]" />
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
                    <p className="font-display text-2xl text-white">
                      {group.playerName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {group.photos.length} תמונות באלבום
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-[var(--text-soft)]">
                      {group.cover.missionTitle}
                    </span>
                    <span className="text-xs text-[var(--text-dim)]">
                      <RelativeTimeText value={group.latestCreatedAt} />
                    </span>
                  </div>
                  {group.cover.caption ? (
                    <p className="line-clamp-2 text-sm leading-6 text-[var(--text-soft)]">
                      {group.cover.caption}
                    </p>
                  ) : (
                    <p className="text-sm leading-6 text-[var(--text-dim)]">
                      לחצו כדי לפתוח את כל התמונות של {group.playerName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-5 py-8 text-center text-[var(--text-soft)]">
            ברגע שתעלה התמונה הראשונה, היא תופיע כאן.
          </div>
        )}
      </section>

      <Lightbox
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedPlayerId(null)}
        items={lightboxItems}
        initialIndex={selectedIndex}
      />
    </div>
  );
}
