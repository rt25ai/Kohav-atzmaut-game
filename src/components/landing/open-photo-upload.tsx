"use client";

import { Camera, Images, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FestiveBurst } from "@/components/shared/festive-burst";
import { useSound } from "@/components/shared/sound-provider";
import { getFestiveCue, type FestiveCue } from "@/lib/game/festive-feedback";
import { compressForUpload } from "@/lib/utils/image-upload";
import {
  getStoredPhotographerId,
  getStoredPlayerId,
  setStoredPhotographerId,
} from "@/lib/utils/local-session";

type ExtraPhotoRecord = {
  id: string;
  caption: string | null;
  photoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export function OpenPhotoUpload() {
  const { play } = useSound();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<ExtraPhotoRecord[]>([]);
  const [cue, setCue] = useState<FestiveCue | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const scrollYRef = useRef<number | null>(null);
  const cueIterRef = useRef(0);

  useEffect(() => {
    const stored = getStoredPlayerId() ?? getStoredPhotographerId();
    if (stored) setPlayerId(stored);
    return () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    };
  }, []);

  const snapshotScroll = () => {
    scrollYRef.current = typeof window === "undefined" ? 0 : window.scrollY;
  };

  const restoreScroll = (target: number | null) => {
    if (target === null || typeof window === "undefined") return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.scrollTo({ top: target, left: 0, behavior: "auto" });
      }),
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const target = scrollYRef.current;
    scrollYRef.current = null;

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setSelectedFile(file);

    if (!file) {
      setPreviewUrl(null);
      restoreScroll(target);
      return;
    }

    const url = URL.createObjectURL(file);
    previewObjectUrlRef.current = url;
    setPreviewUrl(url);
    setCue(getFestiveCue("photo-chosen", uploads.length));
    setSuccessMessage(null);
    play("photo");
    restoreScroll(target);
  };

  const registerName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError("שם חייב להיות לפחות 2 תווים");
      return;
    }
    setNameBusy(true);
    setNameError(null);
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, participantType: "solo_male" }),
      });
      if (!res.ok) throw new Error("register");
      const json = (await res.json()) as { session: { player: { id: string } } };
      const id = json.session.player.id;
      setStoredPhotographerId(id);
      setPlayerId(id);
    } catch {
      setNameError("לא הצלחנו לרשום את השם, נסו שוב");
    } finally {
      setNameBusy(false);
    }
  };

  const submitPhoto = async () => {
    if (!playerId || !selectedFile) {
      setError("צריך לבחור תמונה");
      return;
    }
    const scrollY = typeof window === "undefined" ? 0 : window.scrollY;
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const compressed = await compressForUpload(selectedFile);
      const res = await fetch("/api/game/extra-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          caption,
          photoUrl: compressed.photoUrl,
          thumbnailUrl: compressed.thumbnailUrl,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "upload");
      }
      const json = (await res.json()) as { photo: ExtraPhotoRecord };
      const nextCue = getFestiveCue("summary-uploaded", cueIterRef.current++);
      setUploads((cur) => [json.photo, ...cur]);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setCue(nextCue);
      setSuccessMessage(nextCue.copy);
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (deviceInputRef.current) deviceInputRef.current.value = "";
      play("upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "לא הצלחנו להוסיף את התמונה");
    } finally {
      setBusy(false);
      restoreScroll(scrollY);
    }
  };

  if (!playerId) {
    return (
      <section className="stage-panel rounded-[34px] p-6 sm:p-8">
        <div className="section-kicker">
          <Camera size={15} />
          הוסיפו תמונות לגלריה
        </div>
        <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">
          צלמתם משהו יפה? שתפו עם כולם
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
          גם מי שלא משחק יכול להוסיף תמונות לגלריה החיה. רק תרשמו שם ותעלו.
        </p>
        <div className="mt-6 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void registerName();
            }}
            placeholder="שמך / שם הקבוצה"
            className="hero-input flex-1 rounded-[18px] px-4 py-3 text-right"
            maxLength={32}
          />
          <button
            type="button"
            onClick={() => void registerName()}
            disabled={nameBusy}
            className="hero-button-primary inline-flex h-12 items-center gap-2 rounded-[18px] px-5"
          >
            {nameBusy ? <LoaderCircle className="animate-spin" size={16} /> : "המשך"}
          </button>
        </div>
        {nameError ? <p className="mt-3 text-sm text-[#ffd9d9]">{nameError}</p> : null}
      </section>
    );
  }

  return (
    <section className="stage-panel rounded-[34px] p-6 sm:p-8">
      <div className="section-kicker">
        <Sparkles size={14} />
        העלו תמונה לגלריה
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/6 p-3">
          <div className="relative h-[220px] overflow-hidden rounded-[22px] bg-[#08172d] sm:h-[280px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="תצוגה מקדימה"
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Camera className="text-[#89dbff]" size={34} />
                <p className="mt-3 text-lg text-white">בחרו תמונה מהמצלמה או מהמכשיר</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <label className="hero-button-secondary inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-white">
              <Camera size={16} />
              מצלמה
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onPointerDown={snapshotScroll}
                onChange={handleFileChange}
              />
            </label>
            <label className="hero-button-secondary inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-white">
              <Images size={16} />
              מהמכשיר
              <input
                ref={deviceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onPointerDown={snapshotScroll}
                onChange={handleFileChange}
              />
            </label>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="stage-panel-soft w-full rounded-[24px] px-4 py-4 text-right text-white"
            placeholder="מה רואים כאן? (אופציונלי)"
            maxLength={120}
          />

          <button
            type="button"
            onClick={() => void submitPhoto()}
            disabled={busy || !selectedFile}
            className="hero-button-primary inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />}
            הוספת התמונה לגלריה
          </button>

          <div className="min-h-[2rem]">
            {successMessage ? (
              <p aria-live="polite" className="text-sm text-[#d7f4ff]">
                {successMessage}
              </p>
            ) : null}
            {error ? (
              <p aria-live="polite" className="text-sm text-[#ffd9d9]">
                {error}
              </p>
            ) : null}
          </div>

          <FestiveBurst cue={cue} scopeKey={`open-photo-${uploads.length}`} />
        </div>
      </div>

      {uploads.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {uploads.map((photo) => (
            <article
              key={photo.id}
              className="rounded-[24px] border border-white/10 bg-white/6 p-3"
            >
              <div className="relative h-36 overflow-hidden rounded-[18px]">
                <img
                  src={photo.thumbnailUrl ?? photo.photoUrl}
                  alt={photo.caption ?? "תמונה"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              {photo.caption ? (
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{photo.caption}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
