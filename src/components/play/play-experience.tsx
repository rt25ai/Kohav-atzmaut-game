"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, Camera, LoaderCircle, SkipForward, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useHeartbeat } from "@/hooks/use-heartbeat";
import {
  getMissionProgress,
  getParticipantVoice,
  getPlayerDisplayName,
  getQuestionProgress,
} from "@/lib/game/player-experience";
import { getMissionMap, getQuestionMap } from "@/lib/game/run-plan";
import type { OptionId, SessionSnapshot } from "@/lib/types";
import { compressForUpload } from "@/lib/utils/image-upload";
import {
  clearStoredPlayerId,
  getPendingUploads,
  getStoredPlayerId,
  setPendingUploads,
  type PendingUpload,
} from "@/lib/utils/local-session";
import { useSound } from "@/components/shared/sound-provider";

async function fetchSession(playerId: string) {
  const response = await fetch(`/api/game/session?playerId=${playerId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("session");
  }

  const json = (await response.json()) as { session: SessionSnapshot };
  return json.session;
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const error = new Error(payload?.error || "request") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

const OPTION_LETTERS: Record<OptionId, string> = {
  a: "א",
  b: "ב",
  c: "ג",
  d: "ד",
};

function getAnswerVisualMeta({
  optionId,
  selectedOptionId,
  confirmedOptionId,
}: {
  optionId: OptionId;
  selectedOptionId: OptionId | null;
  confirmedOptionId: OptionId | null;
}) {
  if (confirmedOptionId === optionId) {
    return {
      badgeText: "נשמר",
      buttonClassName:
        "border-[#0f61d8] bg-[#eaf4ff] text-[#0f254a] shadow-[0_18px_36px_rgba(15,97,216,0.16)]",
      badgeClassName: "bg-[#0f61d8] text-white",
      helperText: "",
      helperClassName: "text-[#0f61d8]",
    };
  }

  if (selectedOptionId === optionId) {
    return {
      badgeText: "נבחרה",
      buttonClassName:
        "border-[#0f61d8] bg-[#eaf4ff] text-[#0f254a] shadow-[0_18px_36px_rgba(15,97,216,0.16)]",
      badgeClassName: "bg-[#0f61d8] text-white",
      helperText: "זו הבחירה שלך",
      helperClassName: "text-[#0f61d8]",
    };
  }

  return {
    badgeText: OPTION_LETTERS[optionId],
    buttonClassName:
      "border-white/65 bg-white/80 text-[#123460] hover:-translate-y-0.5 hover:border-[#b7d4ff] hover:bg-white",
    badgeClassName: "bg-[#edf6ff] text-[#0f61d8]",
    helperText: "",
    helperClassName: "text-[#5d7aa4]",
  };
}

export function PlayExperience() {
  const router = useRouter();
  const { play, setGlobalSoundEnabled } = useSound();
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [newPeopleMet, setNewPeopleMet] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<OptionId | null>(null);
  const [confirmedOptionId, setConfirmedOptionId] = useState<OptionId | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [pendingSessionAfterReview, setPendingSessionAfterReview] =
    useState<SessionSnapshot | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const previewObjectUrlRef = useRef<string | null>(null);

  useHeartbeat(playerId);

  useEffect(() => {
    const stored = getStoredPlayerId();
    if (!stored) {
      setLoading(false);
      return;
    }

    setPlayerId(stored);
    void fetchSession(stored)
      .then((nextSession) => {
        setSession(nextSession);
        setGlobalSoundEnabled(nextSession.settings.globalSoundEnabled);
      })
      .catch(() => {
        clearStoredPlayerId();
      })
      .finally(() => setLoading(false));
  }, [setGlobalSoundEnabled]);

  const currentStepKey =
    session?.currentStep?.kind === "question"
      ? `question:${session.currentStep.questionId}`
      : session?.currentStep?.kind === "mission"
        ? `mission:${session.currentStep.missionId}`
        : "idle";

  useEffect(() => {
    startedAtRef.current = Date.now();
    setCaption("");
    setNewPeopleMet("");
    setSelectedOptionId(null);
    setConfirmedOptionId(null);
    setAwaitingContinue(false);
    setPendingSessionAfterReview(null);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setPreviewUrl(null);
    setSelectedFile(null);
  }, [currentStepKey]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const advanceAfterOutcome = (nextSession: SessionSnapshot) => {
    setSession(nextSession);

    if (nextSession.player.completed) {
      play("celebration");
      router.push("/summary");
      return;
    }

    play("transition");
  };

  useEffect(() => {
    if (!playerId) {
      return;
    }

    const retryQueuedUploads = async () => {
      const queue = getPendingUploads();
      if (queue.length === 0) {
        return;
      }

      for (const item of queue) {
        if (item.playerId !== playerId) {
          continue;
        }

        try {
          const result = await postJson<{ session: SessionSnapshot }>(
            "/api/game/mission",
            {
              ...item,
              skipped: false,
            },
          );

          setPendingUploads(queue.filter((entry) => entry.id !== item.id));
          setQueueMessage("ההעלאה שנשמרה במכשיר נשלחה עכשיו בהצלחה.");
          play("upload");
          advanceAfterOutcome(result.session);
        } catch {
          return;
        }
      }
    };

    void retryQueuedUploads();
    window.addEventListener("online", retryQueuedUploads);

    return () => window.removeEventListener("online", retryQueuedUploads);
  }, [play, playerId, router]);

  const currentStep = session?.currentStep ?? null;
  const questionMap = useMemo(
    () => getQuestionMap(session?.questions ?? []),
    [session?.questions],
  );
  const missionMap = useMemo(
    () => getMissionMap(session?.missions ?? []),
    [session?.missions],
  );
  const currentQuestion =
    currentStep?.kind === "question"
      ? questionMap.get(currentStep.questionId) ?? null
      : null;
  const currentMission =
    currentStep?.kind === "mission"
      ? missionMap.get(currentStep.missionId) ?? null
      : null;

  const progressValue = useMemo(() => {
    if (!session) {
      return 0;
    }

    return Math.round(
      (session.player.currentStepIndex / session.steps.length) * 100,
    );
  }, [session]);

  const voice = session
    ? getParticipantVoice(session.player.participantType)
    : getParticipantVoice("solo_male");
  const displayName = session
    ? getPlayerDisplayName(session.player.name, session.player.participantType)
    : "";
  const questionProgress = session
    ? getQuestionProgress(session.steps, session.player.currentStepIndex)
    : { current: 0, total: 0 };
  const missionProgress = session
    ? getMissionProgress(session.steps, session.player.currentStepIndex)
    : { current: 0, total: 0 };

  const continueFromReview = () => {
    if (!pendingSessionAfterReview) {
      return;
    }

    setPendingSessionAfterReview(null);
    setAwaitingContinue(false);
    advanceAfterOutcome(pendingSessionAfterReview);
  };

  const updatePreviewFromFile = (file: File | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setSelectedFile(file);

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  };

  const skipCurrent = async () => {
    if (!currentStep || !session || !playerId || busy || awaitingContinue) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (currentStep.kind === "question") {
        const result = await postJson<{
          session: SessionSnapshot;
          outcome: { status: "skipped" | "wrong" | "correct" };
        }>("/api/game/answer", {
          playerId,
          questionId: currentStep.questionId,
          stepIndex: session.player.currentStepIndex,
          selectedOptionId: null,
          responseMs: Date.now() - startedAtRef.current,
          skipped: true,
        });
        advanceAfterOutcome(result.session);
        return;
      }

      const result = await postJson<{ session: SessionSnapshot }>(
        "/api/game/mission",
        {
          playerId,
          missionId: currentStep.missionId,
          stepIndex: session.player.currentStepIndex,
          caption: "",
          newPeopleMet: 0,
          skipped: true,
          photoUrl: null,
          thumbnailUrl: null,
        },
      );
      advanceAfterOutcome(result.session);
    } catch (caughtError) {
      const serverMessage =
        caughtError instanceof Error ? caughtError.message : null;
      setError(serverMessage ?? "לא הצלחנו להמשיך כרגע. נסו שוב.");
    } finally {
      setBusy(false);
    }
  };

  const answerQuestion = async (optionId: OptionId) => {
    if (!currentQuestion || !session || !playerId || busy || awaitingContinue) {
      return;
    }

    setSelectedOptionId(optionId);
    setBusy(true);
    setError(null);
    play("click");

    try {
      const result = await postJson<{
        session: SessionSnapshot;
        outcome: {
          status: "correct" | "wrong" | "skipped";
          rankImproved: boolean;
          pointsAwarded: number;
        };
      }>("/api/game/answer", {
        playerId,
        questionId: currentQuestion.id,
        stepIndex: session.player.currentStepIndex,
        selectedOptionId: optionId,
        responseMs: Date.now() - startedAtRef.current,
        skipped: false,
      });

      setConfirmedOptionId(optionId);
      setPendingSessionAfterReview(result.session);
      setAwaitingContinue(true);
    } catch (caughtError) {
      setConfirmedOptionId(null);
      setAwaitingContinue(false);
      setPendingSessionAfterReview(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "לא הצלחנו לשמור את הבחירה כרגע. נסו שוב.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitMission = async () => {
    if (!currentMission || !session || !playerId || busy || !selectedFile) {
      setError("צריך לבחור תמונה לפני שממשיכים.");
      return;
    }

    setBusy(true);
    setError(null);
    let compressed:
      | {
          photoUrl: string;
          thumbnailUrl: string;
        }
      | null = null;

    try {
      compressed = await compressForUpload(selectedFile);
      const payload: PendingUpload = {
        id: `${currentMission.id}-${Date.now()}`,
        playerId,
        missionId: currentMission.id,
        stepIndex: session.player.currentStepIndex,
        caption,
        newPeopleMet: Number(newPeopleMet || 0),
        photoUrl: compressed.photoUrl,
        thumbnailUrl: compressed.thumbnailUrl,
      };

      const result = await postJson<{
        session: SessionSnapshot;
        outcome: { rankImproved: boolean };
      }>("/api/game/mission", {
        ...payload,
        skipped: false,
      });

      play("upload");
      setQueueMessage(null);
      advanceAfterOutcome(result.session);
    } catch (caughtError) {
      const status =
        caughtError instanceof Error && "status" in caughtError
          ? Number((caughtError as Error & { status?: number }).status)
          : null;
      const shouldQueue = status === null || status >= 500;

      if (!shouldQueue) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "לא הצלחנו לשלוח את התמונה כרגע. נסו שוב.",
        );
        return;
      }

      const payload: PendingUpload = {
        id: `${currentMission.id}-${Date.now()}`,
        playerId,
        missionId: currentMission.id,
        stepIndex: session.player.currentStepIndex,
        caption,
        newPeopleMet: Number(newPeopleMet || 0),
        photoUrl: compressed?.photoUrl ?? "",
        thumbnailUrl: compressed?.thumbnailUrl ?? null,
      };

      setPendingUploads([...getPendingUploads(), payload]);
      setQueueMessage(
        "נראה שאין חיבור יציב. שמרנו את ההעלאה על המכשיר והיא תישלח אוטומטית כשהחיבור יחזור.",
      );
      setError("התמונה נשמרה במכשיר ותישלח אוטומטית ברגע שהחיבור יחזור.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel flex min-h-[60vh] items-center justify-center rounded-[34px]">
        <LoaderCircle className="animate-spin text-[#0f61d8]" size={30} />
      </div>
    );
  }

  if (!playerId || !session) {
    return (
      <div className="glass-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-[#0f254a]">
          אין כרגע משחק פעיל במכשיר הזה
        </h1>
        <p className="mt-3 text-[#547198]">
          חזרו למסך הבית כדי לפתוח משחק חדש.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[#0f61d8] px-5 py-3 text-white"
        >
          חזרה למסך הבית
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#4a678f]">
              שלב {session.player.currentStepIndex + 1} מתוך {session.steps.length}
            </p>
            <h1 className="font-display text-2xl text-[#0f254a]">
              {displayName}, {voice.readyLine}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-[#355682]">
              {questionProgress.current} מתוך {questionProgress.total} שאלות
            </div>
            <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-[#355682]">
              {session.player.photoMissionsCompleted} משימות צילום הושלמו
            </div>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
          <motion.div
            animate={{ width: `${progressValue}%` }}
            className="h-full rounded-full bg-[linear-gradient(90deg,#0f61d8,#7cc4ff)]"
          />
        </div>
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="rounded-[22px] bg-[#fff3f3] px-4 py-3 text-sm text-[#8c3434]"
        >
          {error}
        </div>
      ) : null}

      {queueMessage ? (
        <div
          aria-live="polite"
          className="rounded-[22px] bg-[#eef8ff] px-4 py-3 text-sm text-[#0f4d97]"
        >
          {queueMessage}
        </div>
      ) : null}

      {currentQuestion ? (
        <section className="glass-panel rounded-[34px] p-5 sm:p-8">
          <div className="mb-6">
            <p className="text-sm text-[#6888ae]">
              שאלה {questionProgress.current} מתוך {questionProgress.total}
            </p>
            <h2 className="font-display text-3xl text-[#0f254a]">
              שאלה {questionProgress.current}
            </h2>
          </div>

          <p className="max-w-3xl text-2xl leading-relaxed text-[#153a6b]">
            {currentQuestion.prompt}
          </p>

          <div className="mt-8 grid gap-3">
            {currentQuestion.options.map((option) => {
              const visualMeta = getAnswerVisualMeta({
                optionId: option.id,
                selectedOptionId,
                confirmedOptionId,
              });

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => answerQuestion(option.id)}
                  disabled={busy || awaitingContinue}
                  aria-pressed={selectedOptionId === option.id}
                  className={`flex w-full items-start justify-between gap-4 rounded-[26px] border px-5 py-5 text-right transition ${visualMeta.buttonClassName}`}
                >
                  <div className="space-y-2">
                    <span className="block text-lg leading-relaxed">
                      {option.label}
                    </span>
                    {visualMeta.helperText ? (
                      <span
                        className={`block text-sm ${visualMeta.helperClassName}`}
                      >
                        {visualMeta.helperText}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex min-w-[74px] shrink-0 justify-center rounded-full px-3 py-1.5 text-sm font-semibold ${visualMeta.badgeClassName}`}
                  >
                    {visualMeta.badgeText}
                  </span>
                </button>
              );
            })}
          </div>

          {confirmedOptionId ? (
            <div
              aria-live="polite"
              className="mt-6 rounded-[24px] bg-[#eef8ff] px-4 py-4 text-sm text-[#0f4d97] sm:text-base"
            >
              הבחירה נשמרה. אפשר להמשיך לשאלה הבאה.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {awaitingContinue ? (
              <button
                type="button"
                onClick={continueFromReview}
                className="inline-flex items-center gap-2 rounded-full bg-[#0f61d8] px-5 py-3 text-white shadow-[0_18px_45px_rgba(15,97,216,0.25)]"
              >
                <ArrowLeft size={16} />
                {voice.continueLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={skipCurrent}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-[#cfe4ff] px-4 py-2 text-sm text-[#47688e]"
              >
                <SkipForward size={16} />
                {voice.skipLabel}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {currentMission ? (
        <section className="glass-panel rounded-[34px] p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#6888ae]">
                משימת צילום {missionProgress.current} מתוך {missionProgress.total}
              </p>
              <h2 className="font-display text-3xl text-[#0f254a]">
                {currentMission.title}
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf6ff] px-4 py-2 text-sm text-[#0f61d8]">
              <Camera size={16} />
              משימה קהילתית
            </div>
          </div>

          <p className="max-w-3xl text-xl leading-relaxed text-[#153a6b]">
            {currentMission.prompt}
          </p>
          <p className="mt-3 rounded-[20px] bg-[#f8fbff] px-4 py-3 text-sm text-[#4b688d]">
            {voice.photoHint}
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/60 bg-white/70 p-3">
                <div className="relative h-[260px] overflow-hidden rounded-[22px] bg-[#eef5ff] sm:h-[320px]">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="תצוגה מקדימה לתמונה שנבחרה"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Camera className="text-[#0f61d8]" size={36} />
                      <p className="mt-3 text-lg text-[#143763]">
                        בחרו תמונה והיא תופיע כאן בלי להזיז את המסך
                      </p>
                      <p className="mt-2 text-sm text-[#6282a8]">
                        עדיף רגע אמיתי, ברור ומואר מתוך האירוע
                      </p>
                    </div>
                  )}

                  {busy ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#082a54]/45 text-white">
                      <LoaderCircle className="animate-spin" size={28} />
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[22px] border border-[#cfe4ff] bg-white/80 px-5 text-[#0f61d8]">
                <Camera size={18} />
                {selectedFile ? voice.replacePhotoLabel : voice.choosePhotoLabel}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    updatePreviewFromFile(file);
                  }}
                />
              </label>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[#56759b]">
                  {voice.photoCaptionLabel}
                </span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  name="missionCaption"
                  autoComplete="off"
                  rows={4}
                  className="glass-panel w-full rounded-[24px] px-4 py-4 text-right text-[#123460]"
                  placeholder={voice.photoCaptionPlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-[#56759b]">
                  <Users size={16} />
                  {voice.newPeopleMetLabel}
                </span>
                <input
                  type="number"
                  name="newPeopleMet"
                  autoComplete="off"
                  min={0}
                  max={99}
                  value={newPeopleMet}
                  onChange={(event) => setNewPeopleMet(event.target.value)}
                  placeholder="0"
                  className="glass-panel h-14 w-full rounded-[22px] px-4 text-right text-[#123460]"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={submitMission}
                  disabled={busy}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] bg-[#0f61d8] text-white shadow-[0_18px_45px_rgba(15,97,216,0.25)]"
                >
                  <Camera size={18} />
                  {voice.submitMissionLabel}
                </button>
                <button
                  type="button"
                  onClick={skipCurrent}
                  disabled={busy}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] border border-[#cfe4ff] text-[#47688e]"
                >
                  <ArrowLeft size={18} />
                  {voice.skipLabel}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel rounded-[28px] p-5">
          <p className="text-sm text-[#6888ae]">אנשים חדשים</p>
          <p className="mt-2 font-display text-3xl text-[#0f254a]">
            {session.player.newPeopleMet}
          </p>
        </div>
        <div className="glass-panel rounded-[28px] p-5">
          <p className="text-sm text-[#6888ae]">משימות צילום</p>
          <p className="mt-2 font-display text-3xl text-[#0f254a]">
            {session.player.photoMissionsCompleted}
          </p>
        </div>
      </section>
    </div>
  );
}
