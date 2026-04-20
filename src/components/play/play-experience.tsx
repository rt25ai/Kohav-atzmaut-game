"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  LoaderCircle,
  SkipForward,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { LiveAnswerResultsChart } from "@/components/play/live-answer-results-chart";
import { FestiveBurst } from "@/components/shared/festive-burst";
import { useSound } from "@/components/shared/sound-provider";
import { useHeartbeat } from "@/hooks/use-heartbeat";
import {
  getFestiveCue,
  type FestiveCue,
  type FestiveEventName,
} from "@/lib/game/festive-feedback";
import {
  getMissionProgress,
  getParticipantVoice,
  getPlayerDisplayName,
  getQuestionProgress,
} from "@/lib/game/player-experience";
import { getMissionMap, getQuestionMap } from "@/lib/game/run-plan";
import type { OptionId, SessionSnapshot, SurveyQuestionResult } from "@/lib/types";
import { compressForUpload } from "@/lib/utils/image-upload";
import {
  clearStoredPlayerId,
  clearStoredSessionSnapshot,
  getPendingUploads,
  getStoredPlayerId,
  getStoredSessionSnapshot,
  setPendingUploads,
  setStoredSessionSnapshot,
  type PendingUpload,
} from "@/lib/utils/local-session";

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

function scrollToViewportTop() {
  if (typeof window === "undefined") {
    return;
  }

  const performScroll = () => {
    const scrollingElement =
      document.scrollingElement || document.documentElement || document.body;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (scrollingElement && "scrollTop" in scrollingElement) {
      scrollingElement.scrollTop = 0;
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  requestAnimationFrame(() => requestAnimationFrame(performScroll));
}

function blurActiveElement() {
  if (typeof document === "undefined") {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

const OPTION_LETTERS: Record<OptionId, string> = {
  a: "א",
  b: "ב",
  c: "ג",
  d: "ד",
};

const PENDING_LIVE_RESULTS_MESSAGE =
  "הבחירה נקלטה, המתינו לטעינת גרף הנתונים בלייב";
const CONFIRMED_LIVE_RESULTS_MESSAGE =
  "הבחירה נקלטה. גרף הנתונים בלייב מתעדכן ממש עכשיו.";

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
      state: "confirmed" as const,
      badgeText: "נשמר",
      buttonClassName:
        "border-[#9fe1ff]/60 bg-[linear-gradient(180deg,rgba(20,82,132,0.62),rgba(7,37,62,0.78))] text-white shadow-[0_24px_50px_rgba(74,176,255,0.22)]",
      badgeClassName: "bg-[#7ad7ff] text-[#041223]",
      helperText: "הבחירה נקלטה ועולה למסך הסיום.",
      helperClassName: "text-[#d7f4ff]",
    };
  }

  if (selectedOptionId === optionId) {
    return {
      state: "pending" as const,
      badgeText: "נבחרה",
      buttonClassName:
        "border-[#7ad7ff]/46 bg-[linear-gradient(180deg,rgba(16,68,110,0.56),rgba(7,28,48,0.72))] text-white shadow-[0_18px_40px_rgba(74,176,255,0.16)]",
      badgeClassName: "bg-[#7ad7ff] text-[#041223]",
      helperText: "זו הבחירה שלך כרגע",
      helperClassName: "text-[#d7f4ff]",
    };
  }

  return {
    state: "idle" as const,
    badgeText: OPTION_LETTERS[optionId],
    buttonClassName:
      "border-white/10 bg-white/5 text-white hover:-translate-y-0.5 hover:border-[#84d6ff]/30 hover:bg-white/8",
    badgeClassName: "bg-white/10 text-[#a9deff]",
    helperText: "",
    helperClassName: "text-[var(--text-soft)]",
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
  const [liveQuestionResult, setLiveQuestionResult] =
    useState<SurveyQuestionResult | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [pendingSessionAfterReview, setPendingSessionAfterReview] =
    useState<SessionSnapshot | null>(null);
  const [festiveCue, setFestiveCue] = useState<FestiveCue | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const busyRef = useRef(false);
  const awaitingContinueRef = useRef(false);
  const pendingSessionAfterReviewRef = useRef<SessionSnapshot | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const festiveSequenceRef = useRef<Record<FestiveEventName, number>>({
    "answer-saved": 0,
    "step-transition": 0,
    "photo-chosen": 0,
    "mission-uploaded": 0,
    "summary-uploaded": 0,
    "summary-finished": 0,
  });
  const didMountStepRef = useRef(false);
  const didAnnounceClosedSurveyRef = useRef(false);

  const showFestiveCue = (eventName: FestiveEventName) => {
    const iteration = festiveSequenceRef.current[eventName];
    festiveSequenceRef.current[eventName] = iteration + 1;
    setFestiveCue(getFestiveCue(eventName, iteration));
  };

  useHeartbeat(playerId);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    awaitingContinueRef.current = awaitingContinue;
  }, [awaitingContinue]);

  useEffect(() => {
    pendingSessionAfterReviewRef.current = pendingSessionAfterReview;
  }, [pendingSessionAfterReview]);

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) {
      return;
    }
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const stored = getStoredPlayerId();
    if (!stored) {
      setLoading(false);
      return;
    }

    const cachedSession = getStoredSessionSnapshot();
    setPlayerId(stored);
    if (cachedSession?.player.id === stored) {
      setSession(cachedSession);
      setGlobalSoundEnabled(cachedSession.settings.globalSoundEnabled);
      setLoading(false);
    }

    void fetchSession(stored)
      .then((nextSession) => {
        if (
          busyRef.current ||
          awaitingContinueRef.current ||
          pendingSessionAfterReviewRef.current
        ) {
          return;
        }

        setSession(nextSession);
        setStoredSessionSnapshot(nextSession);
        setGlobalSoundEnabled(nextSession.settings.globalSoundEnabled);
      })
      .catch(() => {
        clearStoredPlayerId();
        clearStoredSessionSnapshot();
      })
      .finally(() => {
        if (cachedSession?.player.id !== stored) {
          setLoading(false);
        }
      });
  }, [setGlobalSoundEnabled]);

  const currentStepKey =
    session?.currentStep?.kind === "question"
      ? `question:${session.currentStep.questionId}`
      : session?.currentStep?.kind === "mission"
        ? `mission:${session.currentStep.missionId}`
        : "idle";

  const lastScrolledStepKeyRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (currentStepKey === "idle") {
      return;
    }

    if (lastScrolledStepKeyRef.current === currentStepKey) {
      return;
    }

    lastScrolledStepKeyRef.current = currentStepKey;
    blurActiveElement();
    scrollToViewportTop();
  }, [currentStepKey]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setCaption("");
    setNewPeopleMet("");
    setSelectedOptionId(null);
    setConfirmedOptionId(null);
    setLiveQuestionResult(null);
    setAwaitingContinue(false);
    setPendingSessionAfterReview(null);
    setFestiveCue(null);

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
    blurActiveElement();
    flushSync(() => {
      setSession(nextSession);
    });
    setStoredSessionSnapshot(nextSession);

    if (nextSession.player.completed) {
      play("celebration");
      router.push("/summary");
      return;
    }

    if (nextSession.resultsPromptRequired) {
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
          showFestiveCue("mission-uploaded");
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

  useEffect(() => {
    if (!currentStep || currentStepKey === "idle") {
      return;
    }

    if (!didMountStepRef.current) {
      didMountStepRef.current = true;
      return;
    }

    const iteration = festiveSequenceRef.current["step-transition"];
    festiveSequenceRef.current["step-transition"] = iteration + 1;
    setFestiveCue(getFestiveCue("step-transition", iteration));
  }, [currentStep, currentStepKey]);

  useEffect(() => {
    if (!session?.resultsPromptRequired) {
      didAnnounceClosedSurveyRef.current = false;
      return;
    }

    if (didAnnounceClosedSurveyRef.current) {
      return;
    }

    didAnnounceClosedSurveyRef.current = true;
    setFestiveCue(getFestiveCue("summary-finished", 0));
    play("celebration");
    scrollToViewportTop();
  }, [play, session?.resultsPromptRequired]);

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

    const nextSession = pendingSessionAfterReview;
    blurActiveElement();
    setPendingSessionAfterReview(null);
    setAwaitingContinue(false);
    window.setTimeout(() => {
      advanceAfterOutcome(nextSession);
    }, 0);
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
    showFestiveCue("photo-chosen");
    play("photo");
  };

  const skipCurrent = async () => {
    if (
      !currentStep ||
      !session ||
      !playerId ||
      busyRef.current ||
      awaitingContinueRef.current
    ) {
      return;
    }

    busyRef.current = true;
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
      busyRef.current = false;
      setBusy(false);
    }
  };

  const answerQuestion = async (optionId: OptionId) => {
    if (
      !currentQuestion ||
      !session ||
      !playerId ||
      busyRef.current ||
      awaitingContinueRef.current
    ) {
      return;
    }

    busyRef.current = true;
    flushSync(() => {
      setSelectedOptionId(optionId);
      setConfirmedOptionId(null);
      setLiveQuestionResult(null);
    });
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
          liveQuestionResult: SurveyQuestionResult | null;
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
      setLiveQuestionResult(result.outcome.liveQuestionResult);
      setPendingSessionAfterReview(result.session);
      setAwaitingContinue(true);
      showFestiveCue("answer-saved");
      play(result.outcome.rankImproved ? "rankUp" : "points");
    } catch (caughtError) {
      setConfirmedOptionId(null);
      setLiveQuestionResult(null);
      setAwaitingContinue(false);
      setPendingSessionAfterReview(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "לא הצלחנו לשמור את הבחירה כרגע. נסו שוב.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const submitMission = async () => {
    if (
      !currentMission ||
      !session ||
      !playerId ||
      busyRef.current ||
      !selectedFile
    ) {
      if (!selectedFile) {
        setError("צריך לבחור תמונה לפני שממשיכים.");
      }
      return;
    }

    blurActiveElement();
    busyRef.current = true;
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

      showFestiveCue("mission-uploaded");
      play("upload");
      if (result.outcome.rankImproved) {
        play("rankUp");
      }
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
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="stage-panel flex min-h-[60vh] items-center justify-center rounded-[34px]">
        <LoaderCircle className="animate-spin text-[#7ad7ff]" size={30} />
      </div>
    );
  }

  if (!playerId || !session) {
    return (
      <div className="stage-panel rounded-[34px] p-8 text-center">
        <h1 className="font-display text-3xl text-white">
          אין כרגע משחק פעיל במכשיר הזה
        </h1>
        <p className="mt-3 text-[var(--text-soft)]">
          חזרו למסך הבית כדי לפתוח משחק חדש.
        </p>
        <Link href="/" className="hero-button-primary mt-6 inline-flex rounded-full px-5 py-3">
          חזרה למסך הבית
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="stage-panel rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="section-kicker">
              <Sparkles size={14} />
              שלב {session.player.currentStepIndex + 1} מתוך {session.steps.length}
            </div>
            <h1 className="mt-4 font-display text-3xl text-white">
              {displayName}, {voice.readyLine}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <div className="broadcast-chip">
              {questionProgress.current} מתוך {questionProgress.total} שאלות
            </div>
            <div className="broadcast-chip">
              {session.player.photoMissionsCompleted} משימות צילום הושלמו
            </div>
          </div>
        </div>

        <div className="mt-5 result-track h-3.5">
          <motion.div
            animate={{ width: `${progressValue}%` }}
            className="result-fill h-full rounded-full"
          />
        </div>
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="rounded-[22px] border border-[#ffb6b6]/30 bg-[#3d1520] px-4 py-3 text-sm text-[#ffd9d9]"
        >
          {error}
        </div>
      ) : null}

      {queueMessage ? (
        <div
          aria-live="polite"
          className="rounded-[22px] border border-[#9fe1ff]/24 bg-[#09233f] px-4 py-3 text-sm text-[#d3efff]"
        >
          {queueMessage}
        </div>
      ) : null}

      {session.resultsPromptRequired ? (
        <motion.section
          key="survey-results-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          data-play-results-closed
          className="stage-panel rounded-[36px] p-5 sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-dim)]">
                {"\u05D4\u05E1\u05E7\u05E8 \u05E0\u05E1\u05D2\u05E8 \u05DC\u05DE\u05E2\u05E0\u05D4 \u05D7\u05D3\u05E9"}
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                {"\u05D4\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05D5\u05E4\u05D9\u05D5\u05EA \u05DB\u05D1\u05E8 \u05D1\u05D0\u05D5\u05D5\u05D9\u05E8"}
              </h2>
            </div>
            <div className="broadcast-chip">
              <Sparkles size={16} />
              {"\u05DE\u05E2\u05DB\u05E9\u05D9\u05D5 \u05E8\u05D5\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4\u05D0\u05D7\u05D5\u05D6\u05D9\u05DD \u05D4\u05E8\u05E9\u05DE\u05D9\u05D9\u05DD"}
            </div>
          </div>

          <p className="max-w-3xl text-xl leading-relaxed text-white">
            {"\u05E1\u05D9\u05D9\u05DE\u05EA \u05D0\u05EA \u05D4\u05DE\u05E1\u05DA \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9. \u05DB\u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E2\u05D1\u05D5\u05E8 \u05DC\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05D5\u05E4\u05D9\u05D5\u05EA \u05D0\u05D5 \u05DC\u05E1\u05D9\u05D5\u05DD \u05D0\u05EA \u05D4\u05DE\u05E9\u05D7\u05E7 \u05E9\u05DC\u05DA \u05D5\u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D1\u05DE\u05D4\u05DC\u05DA \u05D4\u05E2\u05E8\u05D1."}
          </p>

          <div className="mt-4 min-h-[5.5rem] sm:min-h-[6rem]">
            <FestiveBurst cue={festiveCue} scopeKey="survey-results-prompt" />
          </div>

          {session.finalSurveySnapshot ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <div className="broadcast-chip">
                <Users size={16} />
                {session.finalSurveySnapshot.totalParticipants}{" "}
                {"\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD"}
              </div>
              <div className="broadcast-chip">
                {session.finalSurveySnapshot.questionResults.length}{" "}
                {"\u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05E0\u05E2\u05DC\u05D5"}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/results")}
              className="hero-button-primary inline-flex items-center gap-2 rounded-full px-5 py-3"
            >
              <ArrowLeft size={16} />
              {"\u05DC\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05D5\u05E4\u05D9\u05D5\u05EA"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/summary")}
              className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3"
            >
              {"\u05DC\u05DE\u05E1\u05DA \u05D4\u05E1\u05D9\u05D5\u05DD \u05E9\u05DC\u05D9"}
            </button>
          </div>
        </motion.section>
      ) : null}

      {currentQuestion ? (
        <motion.section
          key={currentStepKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="stage-panel rounded-[36px] p-5 sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-dim)]">
                שאלה {questionProgress.current} מתוך {questionProgress.total}
              </p>
              <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                בחירת הקהל
              </h2>
            </div>
            <div className="broadcast-chip">הבחירה שלך תיחשף בסיום</div>
          </div>

          <p className="max-w-4xl text-2xl leading-relaxed text-white sm:text-[2rem]">
            {currentQuestion.prompt}
          </p>

          <div className="mt-4 min-h-[5.5rem] sm:min-h-[6rem]">
            <FestiveBurst cue={festiveCue} scopeKey={currentStepKey} />
          </div>

          <div className="mt-8 grid gap-3">
            {currentQuestion.options.map((option) => {
              const visualMeta = getAnswerVisualMeta({
                optionId: option.id,
                selectedOptionId,
                confirmedOptionId,
              });
              const liveResultsHelperText =
                visualMeta.state === "pending"
                  ? PENDING_LIVE_RESULTS_MESSAGE
                  : visualMeta.state === "confirmed"
                    ? CONFIRMED_LIVE_RESULTS_MESSAGE
                    : visualMeta.helperText;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => answerQuestion(option.id)}
                  disabled={busy || awaitingContinue}
                  aria-pressed={
                    selectedOptionId === option.id || confirmedOptionId === option.id
                  }
                  data-answer-option={option.id}
                  data-answer-state={visualMeta.state}
                  className={`flex w-full items-start justify-between gap-4 rounded-[28px] border px-5 py-5 text-right transition ${visualMeta.buttonClassName}`}
                >
                  <span
                    className={`inline-flex min-w-[82px] shrink-0 justify-center rounded-full px-3 py-1.5 text-sm font-semibold ${visualMeta.badgeClassName}`}
                  >
                    {visualMeta.badgeText}
                  </span>
                  <div className="flex-1 space-y-2 text-right">
                    <span className="block text-lg leading-relaxed">{option.label}</span>
                    {liveResultsHelperText ? (
                      <span
                        data-pending-live-results-message={
                          visualMeta.state === "pending" ? "true" : undefined
                        }
                        className={`block text-sm ${
                          visualMeta.state === "pending" ||
                          visualMeta.state === "confirmed"
                            ? "live-note-pulse"
                            : visualMeta.helperClassName
                        }`}
                      >
                        {liveResultsHelperText}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {liveQuestionResult ? (
            <LiveAnswerResultsChart questionResult={liveQuestionResult} />
          ) : null}

          {confirmedOptionId && !liveQuestionResult ? (
            <div
              aria-live="polite"
              className="mt-6 rounded-[24px] border border-[#92dcff]/24 bg-[#092742] px-4 py-4 text-sm text-[#d8f4ff] sm:text-base"
            >
              הבחירה נשמרה. ממשיכים יחד לרגע הבא.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {awaitingContinue ? (
              <button
                type="button"
                onClick={continueFromReview}
                className="hero-button-primary inline-flex items-center gap-2 rounded-full px-5 py-3"
              >
                <ArrowLeft size={16} />
                {voice.continueLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={skipCurrent}
                disabled={busy}
                className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
              >
                <SkipForward size={16} />
                {voice.skipLabel}
              </button>
            )}
          </div>
        </motion.section>
      ) : null}

      {currentMission ? (
        <motion.section
          key={currentStepKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="stage-panel rounded-[36px] p-5 sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-dim)]">
                משימת צילום {missionProgress.current} מתוך {missionProgress.total}
              </p>
              <h2 className="mt-2 font-display text-3xl text-white">
                {currentMission.title}
              </h2>
            </div>
            <div className="broadcast-chip">
              <Camera size={16} />
              רגע צילום חי
            </div>
          </div>

          <p className="max-w-3xl text-xl leading-relaxed text-white">
            {currentMission.prompt}
          </p>
          <p className="mt-3 rounded-[20px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-[var(--text-soft)]">
            {voice.photoHint}
          </p>

          <div className="mt-4 min-h-[5.5rem] sm:min-h-[6rem]">
            <FestiveBurst cue={festiveCue} scopeKey={currentStepKey} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <input
                id="mission-photo-input"
                data-mission-photo-input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                  zIndex: -1,
                }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  const inputEl = event.target;
                  inputEl.value = "";
                  inputEl.blur();
                  blurActiveElement();
                  updatePreviewFromFile(file);
                }}
              />
              <label
                htmlFor="mission-photo-input"
                data-mission-photo-picker
                aria-label={selectedFile ? voice.replacePhotoLabel : voice.choosePhotoLabel}
                aria-disabled={busy ? "true" : undefined}
                className={`block w-full rounded-[28px] border bg-white/6 p-3 text-inherit transition ${
                  busy
                    ? "cursor-progress border-white/10 opacity-80 pointer-events-none"
                    : "cursor-pointer border-white/10 hover:border-[#84d6ff]/35 hover:bg-white/8"
                }`}
              >
                <div className="relative h-[260px] overflow-hidden rounded-[22px] bg-[#08172d] sm:h-[320px]">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="תצוגה מקדימה לתמונה שנבחרה"
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Camera className="text-[#89dbff]" size={36} />
                      <p className="mt-3 text-lg text-white">
                        בחרו תמונה והיא תופיע כאן בלי להזיז את המסך
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">
                        עדיף רגע אמיתי, ברור ומואר מתוך האירוע
                      </p>
                    </div>
                  )}

                  {busy ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#02101ecc] text-white">
                      <LoaderCircle className="animate-spin" size={28} />
                    </div>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-soft)]">
                  {voice.photoCaptionLabel}
                </span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  name="missionCaption"
                  autoComplete="off"
                  rows={4}
                  className="stage-panel-soft w-full rounded-[24px] px-4 py-4 text-right text-white"
                  placeholder={voice.photoCaptionPlaceholder}
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-[var(--text-soft)]">
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
                  className="stage-panel-soft h-14 w-full rounded-[22px] px-4 text-right text-white"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={submitMission}
                  disabled={busy}
                  className="hero-button-primary inline-flex h-14 items-center justify-center gap-2 rounded-[22px]"
                >
                  <Camera size={18} />
                  {voice.submitMissionLabel}
                </button>
                <button
                  type="button"
                  onClick={skipCurrent}
                  disabled={busy}
                  className="hero-button-secondary inline-flex h-14 items-center justify-center gap-2 rounded-[22px] text-white"
                >
                  <ArrowLeft size={18} />
                  {voice.skipLabel}
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="metric-plate px-5 py-5">
          <p className="text-sm text-[var(--text-dim)]">אנשים חדשים</p>
          <p className="mt-2 font-display text-3xl text-white">
            {session.player.newPeopleMet}
          </p>
        </div>
        <div className="metric-plate px-5 py-5">
          <p className="text-sm text-[var(--text-dim)]">משימות צילום</p>
          <p className="mt-2 font-display text-3xl text-white">
            {session.player.photoMissionsCompleted}
          </p>
        </div>
      </section>
    </div>
  );
}
