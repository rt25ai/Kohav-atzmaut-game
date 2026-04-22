"use client";

import Image from "next/image";
import { Camera, Images, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FestiveBurst } from "@/components/shared/festive-burst";
import { useSound } from "@/components/shared/sound-provider";
import { getFestiveCue, type FestiveCue } from "@/lib/game/festive-feedback";
import { compressForUpload } from "@/lib/utils/image-upload";
import { getStoredPlayerId } from "@/lib/utils/local-session";

type ExtraPhotoRecord = {
  id: string;
  caption: string | null;
  photoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

type ExtraPhotoResponse = {
  photo: ExtraPhotoRecord;
};

export function SummaryExtraPhotoForm() {
  const { play } = useSound();
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploads, setUploads] = useState<ExtraPhotoRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cue, setCue] = useState<FestiveCue | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);
  const pickerScrollYRef = useRef<number | null>(null);
  const cueIterationRef = useRef(0);

  const restoreScrollPosition = (scrollY: number) => {
    if (typeof window === "undefined") {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      });
    });
  };

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const updatePreviewFromFile = (file: File | null) => {
    const targetScrollY =
      pickerScrollYRef.current ?? (typeof window === "undefined" ? 0 : window.scrollY);
    pickerScrollYRef.current = null;

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setSelectedFile(file);

    if (!file) {
      setPreviewUrl(null);
      restoreScrollPosition(targetScrollY);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setCue(getFestiveCue("photo-chosen", uploads.length));
    setSuccessMessage(null);
    play("photo");

    restoreScrollPosition(targetScrollY);
  };

  const submitExtraPhoto = async () => {
    const currentScrollY = typeof window === "undefined" ? 0 : window.scrollY;
    const playerId = getStoredPlayerId();
    if (!playerId || !selectedFile) {
      setError("צריך לבחור תמונה כדי להמשיך.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const compressed = await compressForUpload(selectedFile);
      const response = await fetch("/api/game/extra-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          caption,
          photoUrl: compressed.photoUrl,
          thumbnailUrl: compressed.thumbnailUrl,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "upload");
      }

      const json = (await response.json()) as ExtraPhotoResponse;
      const nextCue = getFestiveCue("summary-uploaded", cueIterationRef.current);
      cueIterationRef.current += 1;

      setUploads((current) => [json.photo, ...current]);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setCue(nextCue);
      setSuccessMessage(nextCue.copy);

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (deviceInputRef.current) deviceInputRef.current.value = "";

      play("upload");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "לא הצלחנו להוסיף את התמונה כרגע. נסו שוב.",
      );
    } finally {
      setBusy(false);
      restoreScrollPosition(currentScrollY);
    }
  };

  return (
    <section className="stage-panel-soft rounded-[34px] p-6 sm:p-8">
      <div className="section-kicker">
        <Sparkles size={14} />
        ממשיכים לשתף רגעים מהערב
      </div>

      <div className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
        אפשר להוסיף עוד תמונות חופשיות מהאירוע, לכתוב עליהן משהו קצר, ולהמשיך
        להזין את הגלריה גם אחרי שסיימתם את המשחק.
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/6 p-3">
          <div className="relative h-[240px] overflow-hidden rounded-[22px] bg-[#08172d] sm:h-[300px]">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="תצוגה מקדימה לתמונה נוספת"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Camera className="text-[#89dbff]" size={34} />
                <p className="mt-3 text-lg text-white">
                  בוחרים תמונה יפה ומוסיפים לה משפט קצר
                </p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  כל רגע כזה נכנס לגלריה החיה של הערב
                </p>
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
                ref={fileInputRef}
                data-summary-extra-file-input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onPointerDown={() => {
                  pickerScrollYRef.current =
                    typeof window === "undefined" ? 0 : window.scrollY;
                }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  updatePreviewFromFile(file);
                }}
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
                onPointerDown={() => {
                  pickerScrollYRef.current =
                    typeof window === "undefined" ? 0 : window.scrollY;
                }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  updatePreviewFromFile(file);
                }}
              />
            </label>
          </div>

          <textarea
            data-summary-extra-caption
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={4}
            className="stage-panel-soft w-full rounded-[24px] px-4 py-4 text-right text-white"
            placeholder="מה רואים כאן? משפט קצר מספיק"
          />

          <button
            data-summary-extra-submit
            type="button"
            onClick={submitExtraPhoto}
            disabled={busy}
            className="hero-button-primary inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px]"
          >
            {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />}
            הוספת התמונה לגלריה
          </button>

          <div className="min-h-[2.5rem]">
            {successMessage ? (
              <p
                data-summary-extra-success
                aria-live="polite"
                className="text-sm text-[#d7f4ff]"
              >
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p aria-live="polite" className="text-sm text-[#ffd9d9]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="min-h-[5.5rem] sm:min-h-[6rem]">
            <FestiveBurst cue={cue} scopeKey={`summary-extra-${uploads.length}`} />
          </div>
        </div>
      </div>

      {uploads.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {uploads.map((photo) => (
            <article
              key={photo.id}
              data-summary-extra-item
              className="rounded-[24px] border border-white/10 bg-white/6 p-3"
            >
              <div className="relative h-36 overflow-hidden rounded-[18px]">
                <Image
                  src={photo.thumbnailUrl || photo.photoUrl}
                  alt={photo.caption || "תמונה נוספת"}
                  fill
                  className="object-cover"
                />
              </div>
              {photo.caption ? (
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                  {photo.caption}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
