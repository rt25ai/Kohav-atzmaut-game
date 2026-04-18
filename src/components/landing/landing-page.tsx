"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Play, Radio, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingIntroOverlay } from "@/components/landing/landing-intro-overlay";
import { Lightbox } from "@/components/shared/lightbox";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useSound } from "@/components/shared/sound-provider";
import {
  FESTIVE_GLOW_OVERLAY,
  HOME_HERO_IMAGE,
  HERO_POSTER_ANCHOR_IMAGE,
  RESULTS_CELEBRATION_OVERLAY,
} from "@/lib/config";
import { useLiveJson } from "@/hooks/use-live-json";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import { getParticipantVoice } from "@/lib/game/player-experience";
import { getLandingHeroReveal } from "@/lib/landing/intro-sequence";
import type { GameEventRecord, ParticipantType, PublicSnapshot } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { setStoredPlayerId } from "@/lib/utils/local-session";

type LandingPageProps = {
  initialSnapshot: PublicSnapshot;
};

function formatLiveEventMessage(event: GameEventRecord) {
  if (event.type === "score_update") {
    return event.playerName
      ? `${event.playerName} סימנו בחירה חדשה בסקר`
      : "משתתפים חדשים סימנו בחירה בסקר";
  }

  if (event.type === "rank_up") {
    return event.playerName
      ? `${event.playerName} התקדמו בקצב של הערב`
      : "משתתפים מתקדמים לשלב הבא";
  }

  return event.message;
}

export function LandingPage({ initialSnapshot }: LandingPageProps) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [name, setName] = useState("");
  const [participantType, setParticipantType] =
    useState<ParticipantType>("solo_male");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const { play, setGlobalSoundEnabled } = useSound();
  const voice = getParticipantVoice(participantType);
  const { data } = useLiveJson("/api/public/snapshot", {
    initialData: initialSnapshot,
    tables: ["players", "game_events", "photo_uploads", "admin_settings"],
  });
  const latestPhotos = data.latestPhotos.slice(0, 6);
  const latestPhotoItems = latestPhotos.map((photo) => buildPhotoLightboxItem(photo));
  const heroReveal = getLandingHeroReveal(showIntro);

  useEffect(() => {
    setGlobalSoundEnabled(data.settings.globalSoundEnabled);
  }, [data.settings.globalSoundEnabled, setGlobalSoundEnabled]);

  const startGame = async () => {
    if (name.trim().length < 2) {
      setError("צריך שם קצר כדי להיכנס לסקר החי.");
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

    const json = (await response.json()) as {
      session: { player: { id: string } };
    };

    setStoredPlayerId(json.session.player.id);
    router.push("/play");
  };

  return (
    <div className="space-y-12">
      {showIntro ? (
        <LandingIntroOverlay onComplete={() => setShowIntro(false)} />
      ) : null}

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden rounded-b-[2.75rem] border-b border-white/8">
        <div className="relative min-h-[86svh]">
          <Image
            src={HOME_HERO_IMAGE}
            alt="אווירת במה חגיגית לערב הקהילתי"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <Image
            src={FESTIVE_GLOW_OVERLAY}
            alt=""
            fill
            className="object-cover object-center opacity-[0.42] mix-blend-screen"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,16,0.34)_0%,rgba(5,15,29,0.48)_18%,rgba(7,18,33,0.72)_54%,rgba(5,11,21,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(255,217,135,0.16),transparent_18%),radial-gradient(circle_at_78%_24%,rgba(92,183,255,0.24),transparent_22%)]" />

          <div className="relative z-10 mx-auto flex min-h-[86svh] max-w-[92rem] flex-col justify-end px-4 pb-12 pt-24 sm:px-6 lg:px-8">
            <motion.div
              initial={false}
              animate={heroReveal}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="max-w-3xl space-y-6">
                <div className="section-kicker">
                  <Sparkles size={15} />
                  במה קהילתית חיה ליום העצמאות
                </div>

                <div>
                  <p className="text-sm uppercase tracking-[0.42em] text-[var(--text-dim)]">
                    Kochav Michael Live Survey Show
                  </p>
                  <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[0.92] text-white sm:text-7xl xl:text-[5.8rem]">
                    כוכבניק
                  </h1>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--text-soft)] sm:text-xl">
                    {data.settings.introText}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="metric-plate px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
                      משתתפים
                    </p>
                    <p className="mt-3 font-display text-4xl text-white">
                      <AnimatedCounter value={data.totalParticipants} />
                    </p>
                  </div>
                  <div className="metric-plate px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
                      באוויר עכשיו
                    </p>
                    <p className="mt-3 font-display text-4xl text-white">
                      <AnimatedCounter value={data.activePlayersNow} />
                    </p>
                  </div>
                  <div className="metric-plate px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">
                      רגעים ששותפו
                    </p>
                    <p className="mt-3 font-display text-4xl text-white">
                      <AnimatedCounter value={data.latestPhotos.length} />
                    </p>
                  </div>
                </div>

                <div className="stage-panel-soft max-w-2xl rounded-[28px] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="broadcast-chip">
                      <Radio size={15} />
                      קורה עכשיו באירוע
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">
                      עדכון חי מהשטח
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {data.recentEvents.length === 0 ? (
                      <p className="text-sm text-[var(--text-soft)]">
                        עוד רגע המשתתפים הראשונים יעלו על הבמה.
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
                            {formatRelativeTime(event.createdAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 self-end">
                <div className="stage-panel relative overflow-hidden rounded-[32px] p-4">
                  <div className="section-kicker">
                    <Sparkles size={15} />
                    תמונת העוגן של הערב
                  </div>
                  <div className="relative mt-4 aspect-square overflow-hidden rounded-[26px] border border-white/12">
                    <Image
                      src={HERO_POSTER_ANCHOR_IMAGE}
                      alt="פוסטר האווירה של כוכבניק"
                      fill
                      className="object-cover"
                      sizes="560px"
                    />
                  </div>
                </div>

                <div className="stage-panel relative overflow-hidden rounded-[32px] p-5 sm:p-6">
                  <Image
                    src={RESULTS_CELEBRATION_OVERLAY}
                    alt=""
                    fill
                    className="object-cover opacity-[0.18] mix-blend-screen"
                  />
                  <div className="relative z-10">
                    <div className="section-kicker">
                      <Play size={15} />
                      נכנסים לסקר החי
                    </div>
                    <p className="mt-5 text-sm text-[var(--text-soft)]">
                      איך תרצו להופיע במשחק הערב?
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
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
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="mt-1 block text-xs opacity-80">{option.note}</span>
                        </button>
                      ))}
                    </div>

                    <label className="mt-5 block text-sm text-[var(--text-soft)]">
                      {participantType === "family"
                        ? "איך יקראו לכם בתוך הסקר?"
                        : "איך יקראו לך בתוך הסקר?"}
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

                    {error ? (
                      <p aria-live="polite" className="mt-3 text-sm text-[#ffd7d7]">
                        {error}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href="/results"
                        onClick={() => {
                          play("click");
                        }}
                        className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                      >
                        תוצאות הסקר
                      </Link>
                      <Link
                        href="/gallery"
                        onClick={() => {
                          play("gallery");
                        }}
                        className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                      >
                        גלריה קהילתית
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="stage-panel-soft rounded-[28px] p-5">
                    <div className="section-kicker">
                      <Users size={15} />
                      כך זה עובד
                    </div>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          title: "עונים",
                          text: "בוחרים תשובה קצרה אחת בכל שאלה וממשיכים בקצב של הערב.",
                        },
                        {
                          title: "מצלמים",
                          text: "באמצע הדרך עוצרים לרגעים קהילתיים ומשימות צילום חיות.",
                        },
                        {
                          title: "מגלים",
                          text: "רק בסוף נפתח reveal אמיתי: איך כל הקהילה בחרה.",
                        },
                      ].map((item) => (
                        <div key={item.title}>
                          <p className="font-display text-lg text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="stage-panel-soft rounded-[28px] p-5">
                    <div className="section-kicker">
                      <Camera size={15} />
                      הרגע האחרון
                    </div>
                    {latestPhotos[0] ? (
                      <button
                        type="button"
                        onClick={() => {
                          play("photo");
                          setSelectedPhotoIndex(0);
                        }}
                        className="mt-4 block w-full text-right"
                      >
                        <div className="relative aspect-[0.9] overflow-hidden rounded-[22px]">
                          <Image
                            src={latestPhotos[0].thumbnailUrl || latestPhotos[0].photoUrl}
                            alt={latestPhotos[0].missionTitle}
                            fill
                            className="object-cover"
                            sizes="360px"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(1,9,18,0.94))] px-4 pb-4 pt-8">
                            <p className="font-display text-lg text-white">
                              {latestPhotos[0].playerName}
                            </p>
                            <p className="text-sm text-[var(--text-soft)]">
                              {latestPhotos[0].missionTitle}
                            </p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <p className="mt-4 text-sm text-[var(--text-soft)]">
                        ברגע שהתמונה הראשונה תעלה, היא תופיע כאן כמו מסך חי מהשטח.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="stage-panel rounded-[34px] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="section-kicker">
                <Sparkles size={15} />
                אנרגיית ערב חיה
              </div>
              <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">
                הזמנה לבמה קהילתית
              </h2>
            </div>
            <div className="broadcast-chip">משפחה, ילדים, חברים ושכנים</div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "כניסה קלה",
                text: "שם קצר, בחירת מצב משתתף, ומיד נכנסים למשחק בלי סיבוך.",
              },
              {
                icon: Sparkles,
                title: "בחירות עם משמעות",
                text: "כל שאלה בודקת הרגל, טעם או תחושה, לא מבחן ידע ולא תחרות על תשובה אחת.",
              },
              {
                icon: Camera,
                title: "רגעים מהשטח",
                text: "המשימות יוצרות גלריה חיה ומרחיבות את החוויה מעבר ללחיצה על תשובות.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[26px] border border-white/10 bg-white/6 p-5"
              >
                <item.icon className="text-[#80d4ff]" size={22} />
                <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="metric-plate px-6 py-6">
            <p className="text-sm text-[var(--text-dim)]">תוצאות חיות</p>
            <h3 className="mt-3 font-display text-3xl text-white">
              הסקר הופך למופע
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
              אחרי שמסיימים נפתח reveal עם פסי אחוזים חיים, השוואה אישית מול הקהילה,
              והרגשה של שידור חי ולא של גרף יבש.
            </p>
            <div className="mt-5 space-y-3">
              {[72, 54, 31].map((value, index) => (
                <div key={value} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-dim)]">
                    <span>שאלה {index + 1}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="result-track h-3">
                    <motion.div
                      className="result-fill h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: index * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="metric-plate px-6 py-6">
            <p className="text-sm text-[var(--text-dim)]">הגלריה החיה</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {latestPhotos.slice(0, 4).map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    play("photo");
                    setSelectedPhotoIndex(index);
                  }}
                  className={`relative overflow-hidden rounded-[20px] ${
                    index === 0 ? "col-span-2 aspect-[1.6]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={photo.thumbnailUrl || photo.photoUrl}
                    alt={photo.missionTitle}
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Lightbox
        open={selectedPhotoIndex !== null}
        onClose={() => setSelectedPhotoIndex(null)}
        items={latestPhotoItems}
        initialIndex={selectedPhotoIndex ?? 0}
      />
    </div>
  );
}
