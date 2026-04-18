"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Play, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingIntroOverlay } from "@/components/landing/landing-intro-overlay";
import { Lightbox } from "@/components/shared/lightbox";
import { useSound } from "@/components/shared/sound-provider";
import { HERO_IMAGE } from "@/lib/config";
import { useLiveJson } from "@/hooks/use-live-json";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import { getLandingHeroReveal } from "@/lib/landing/intro-sequence";
import { getParticipantVoice } from "@/lib/game/player-experience";
import type { ParticipantType, PublicSnapshot } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { setStoredPlayerId } from "@/lib/utils/local-session";

type LandingPageProps = {
  initialSnapshot: PublicSnapshot;
};

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
      setError("צריך שם קצר כדי להיכנס למשחק");
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
      setError("לא הצלחנו להתחיל, נסו שוב");
      return;
    }

    const json = (await response.json()) as {
      session: { player: { id: string } };
    };

    setStoredPlayerId(json.session.player.id);
    router.push("/play");
  };

  return (
    <div className="space-y-10">
      {showIntro ? (
        <LandingIntroOverlay onComplete={() => setShowIntro(false)} />
      ) : null}

      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <div className="relative min-h-[78svh]">
          <Image
            src={HERO_IMAGE}
            alt="אווירת יום העצמאות"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,21,47,0.24)_0%,rgba(8,40,81,0.44)_30%,rgba(7,31,61,0.68)_58%,rgba(8,27,54,0.75)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(140,213,255,0.40),transparent_30%)]" />
          <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-12 pt-32 sm:px-6 lg:px-8">
            <motion.div
              initial={false}
              animate={heroReveal}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm text-white/92 backdrop-blur-md">
                <Sparkles size={16} />
                כוכבניק - סקר הכי ישראלי שיש
              </p>
              <h1 className="font-display text-4xl leading-[1.02] text-white sm:text-6xl">
                כוכבניק
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#eaf6ff] sm:text-lg">
                {data.settings.introText}
              </p>
              <div className="mt-8 max-w-xl rounded-[28px] border border-white/16 bg-white/12 p-3 backdrop-blur-xl">
                <p className="mb-3 text-sm text-white/88">איך תרצו להיכנס לסקר?</p>
                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      id: "solo_male" as const,
                      label: "שחקן יחיד",
                      note: "ממשק בלשון זכר",
                    },
                    {
                      id: "solo_female" as const,
                      label: "שחקנית יחידה",
                      note: "ממשק בלשון נקבה",
                    },
                    {
                      id: "family" as const,
                      label: "משפחה",
                      note: "ממשק בלשון רבים",
                    },
                  ].map((option) => {
                    const selected = participantType === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setParticipantType(option.id)}
                        className={`rounded-[20px] border px-4 py-3 text-right transition ${
                          selected
                            ? "border-[#9cd0ff] bg-white text-[#0f254a] shadow-[0_14px_30px_rgba(15,97,216,0.18)]"
                            : "border-white/18 bg-white/8 text-white/92"
                        }`}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span
                          className={`mt-1 block text-xs ${
                            selected ? "text-[#4f6f98]" : "text-white/74"
                          }`}
                        >
                          {option.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="mb-2 block text-sm text-white/88">
                  {participantType === "family"
                    ? "איך יקראו לכם בתוך הסקר?"
                    : "איך יקראו לך בתוך הסקר?"}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    name="playerName"
                    autoComplete="nickname"
                    placeholder={
                      participantType === "family" ? "שם המשפחה..." : "השם שלך..."
                    }
                    className="h-14 flex-1 rounded-[20px] border border-white/18 bg-white/88 px-4 text-right text-[#0f254a] ring-0 placeholder:text-[#6888ae]"
                  />
                  <button
                    type="button"
                    onClick={startGame}
                    disabled={submitting}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-[#0f61d8] px-6 text-base font-medium text-white shadow-[0_18px_45px_rgba(15,97,216,0.35)] transition hover:translate-y-[-1px]"
                  >
                    <Play size={18} />
                    {submitting ? voice.startingLabel : voice.startLabel}
                  </button>
                </div>
                {error ? (
                  <p aria-live="polite" className="mt-2 text-sm text-[#fff2f2]">
                    {error}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/results"
                    onClick={() => {
                      play("click");
                    }}
                    className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm text-white"
                  >
                    תוצאות הסקר
                  </Link>
                  <Link
                    href="/gallery"
                    onClick={() => {
                      play("gallery");
                    }}
                    className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm text-white"
                  >
                    גלריה
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "נרשמים",
            text: "מקלידים שם, נכנסים מיד ומתחילים מסלול קהילתי קצר וזורם.",
          },
          {
            icon: Sparkles,
            title: "עונים ומגלים",
            text: "20 שאלות, בחירה אחת בכל פעם, ורק בסוף רואים איך כולם בחרו.",
          },
          {
            icon: Camera,
            title: "מצלמים ומתחברים",
            text: "משימות צילום באמצע הדרך יוצרות גלריה חיה עם רגעים אמיתיים מהאירוע.",
          },
        ].map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="glass-panel rounded-[30px] p-6"
          >
            <item.icon className="mb-4 text-[#0f61d8]" size={24} />
            <h2 className="font-display text-xl text-[#0f254a]">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#4a678f]">{item.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-[34px] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#4a678f]">מה קורה עכשיו באירוע</p>
              <h2 className="font-display text-2xl text-[#0f254a]">אירועים חיים מהשטח</h2>
            </div>
            <div className="rounded-full bg-[#eef6ff] px-4 py-2 text-sm text-[#0f61d8]">
              {data.activePlayersNow} פעילים עכשיו
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {data.recentEvents.length === 0 ? (
              <p className="text-sm text-[#57749b]">המשחק מחכה למשתתפים הראשונים.</p>
            ) : (
              data.recentEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="rounded-[22px] border border-white/55 bg-white/60 px-4 py-3"
                >
                  <p className="text-sm font-medium text-[#163a6d]">{event.message}</p>
                  <p className="mt-1 text-xs text-[#6888ae]">
                    {formatRelativeTime(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel rounded-[30px] p-6">
            <p className="text-sm text-[#4a678f]">משתתפים</p>
            <p className="mt-2 font-display text-4xl text-[#0f254a]">
              {data.totalParticipants}
            </p>
          </div>
          <div className="glass-panel rounded-[30px] p-6">
            <p className="text-sm text-[#4a678f]">תמונות אחרונות</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {latestPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    play("photo");
                    setSelectedPhotoIndex(index);
                  }}
                  className="relative aspect-square overflow-hidden rounded-[18px] text-right"
                >
                  <Image
                    src={photo.thumbnailUrl || photo.photoUrl}
                    alt={photo.missionTitle}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                  <div className="absolute right-2 top-2 rounded-full bg-[#031c3ecc] px-2 py-1 text-[10px] text-white">
                    {photo.playerName}
                  </div>
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
