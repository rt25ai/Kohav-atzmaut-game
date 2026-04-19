import { ACTIVE_PLAYER_WINDOW_MS } from "@/lib/config";
import { normalizeAdminSettings } from "@/lib/content/admin-settings";
import { buildSurveyQuestionResults } from "@/lib/game/survey-results";
import { getPlayerDisplayName } from "@/lib/game/player-experience";
import { buildRunSteps } from "@/lib/game/run-plan";
import type {
  ActiveHostAnnouncement,
  ActiveSystemBanner,
  AdminPlayerMonitorEntry,
  FinalSurveyResultsSnapshot,
  GameEventRecord,
  HostAnnouncementRecord,
  HostAnnouncementView,
  LeaderboardEntry,
  LiveSurveyOverview,
  LiveSurveyQuestionOverview,
  LocalDatabase,
  PlayerAnswerRecord,
  PlayerRecord,
  RunStep,
  SessionSnapshot,
  SummarySnapshot,
  SurveyClosureGracePlayer,
  SurveyPhase,
  SurveyResultsSnapshot,
  SurveyRuntimeState,
} from "@/lib/types";

export function getNowIso() {
  return new Date().toISOString();
}

export const FINAL_RESULTS_PUBLISHED_MESSAGE = "התוצאות הסופיות פורסמו";

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareIsoAsc(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function getReplacementStartAt(
  rows: HostAnnouncementRecord[],
  current: HostAnnouncementRecord,
) {
  const currentStart = toTimestamp(current.scheduledFor);
  if (currentStart === null) {
    return null;
  }

  const nextRow = rows
    .filter((candidate) => candidate.id !== current.id)
    .filter((candidate) => {
      const candidateStart = toTimestamp(candidate.scheduledFor);
      if (candidateStart === null || candidateStart <= currentStart) {
        return false;
      }

      const clearedAt = toTimestamp(candidate.clearedAt);
      return !(clearedAt !== null && clearedAt <= candidateStart);
    })
    .sort((left, right) => compareIsoAsc(left.scheduledFor, right.scheduledFor))[0];

  return nextRow?.scheduledFor ?? null;
}

function getEffectiveEndAt(
  rows: HostAnnouncementRecord[],
  current: HostAnnouncementRecord,
) {
  const currentStart = toTimestamp(current.scheduledFor);
  if (currentStart === null) {
    return null;
  }

  const candidateEnds = [
    current.clearedAt,
    current.endsMode === "at_time" ? current.endsAt : null,
    getReplacementStartAt(rows, current),
  ]
    .map((value) => {
      const timestamp = toTimestamp(value);
      return value && timestamp !== null && timestamp >= currentStart
        ? { value, timestamp }
        : null;
    })
    .filter((entry): entry is { value: string; timestamp: number } => Boolean(entry))
    .sort((left, right) => left.timestamp - right.timestamp);

  return candidateEnds[0]?.value ?? null;
}

function getAnnouncementStatus(
  row: HostAnnouncementRecord,
  nowTimestamp: number,
  effectiveEndAt: string | null,
): HostAnnouncementView["status"] {
  const startAt = toTimestamp(row.scheduledFor);
  const clearedAt = toTimestamp(row.clearedAt);
  const effectiveEndTimestamp = toTimestamp(effectiveEndAt);

  if (startAt === null) {
    return "ended";
  }

  if (clearedAt !== null && clearedAt <= startAt) {
    return "cancelled";
  }

  if (nowTimestamp < startAt) {
    return "scheduled";
  }

  if (effectiveEndTimestamp !== null && nowTimestamp >= effectiveEndTimestamp) {
    return "ended";
  }

  return "active";
}

export function deriveHostAnnouncementState(
  rows: HostAnnouncementRecord[],
  nowIso = getNowIso(),
) {
  const nowTimestamp = toTimestamp(nowIso) ?? Date.now();
  const announcements = [...rows]
    .map((row) => {
      const effectiveEndAt = getEffectiveEndAt(rows, row);
      return {
        ...row,
        status: getAnnouncementStatus(row, nowTimestamp, effectiveEndAt),
        effectiveEndAt,
      } satisfies HostAnnouncementView;
    })
    .sort((left, right) => compareIsoAsc(right.scheduledFor, left.scheduledFor));

  const activeView =
    announcements
      .filter((announcement) => announcement.status === "active")
      .sort((left, right) => compareIsoAsc(right.scheduledFor, left.scheduledFor))[0] ??
    null;

  const active = activeView
    ? {
        id: activeView.id,
        message: activeView.message,
        startedAt: activeView.scheduledFor,
        endsMode: activeView.endsMode,
        endsAt: activeView.effectiveEndAt,
      }
    : null;

  const nextTransitionCandidates = [
    ...announcements
      .filter((announcement) => announcement.status === "scheduled")
      .map((announcement) => announcement.scheduledFor),
    ...announcements
      .filter((announcement) => announcement.status === "active")
      .map((announcement) => announcement.effectiveEndAt)
      .filter((value): value is string => Boolean(value)),
  ]
    .map((value) => ({
      value,
      timestamp: toTimestamp(value),
    }))
    .filter(
      (entry): entry is { value: string; timestamp: number } =>
        Boolean(entry.value) &&
        entry.timestamp !== null &&
        entry.timestamp > nowTimestamp,
    )
    .sort((left, right) => left.timestamp - right.timestamp);

  return {
    announcements,
    active,
    nextTransitionAt: nextTransitionCandidates[0]?.value ?? null,
  };
}

export function getActiveHostAnnouncement(
  rows: HostAnnouncementRecord[],
  nowIso = getNowIso(),
): ActiveHostAnnouncement | null {
  return deriveHostAnnouncementState(rows, nowIso).active;
}

export function getNextHostTransitionAt(
  rows: HostAnnouncementRecord[],
  nowIso = getNowIso(),
) {
  return deriveHostAnnouncementState(rows, nowIso).nextTransitionAt;
}

export function createDefaultSurveyRuntimeState(): SurveyRuntimeState {
  return {
    phase: "live",
    closedAt: null,
    finalizedAt: null,
    finalResultsSnapshot: null,
    finalBannerMessage: null,
    gracePlayers: [],
  };
}

export function normalizeSurveyRuntimeState(
  surveyRuntime: Partial<SurveyRuntimeState> | null | undefined,
): SurveyRuntimeState {
  const defaults = createDefaultSurveyRuntimeState();

  return {
    ...defaults,
    ...surveyRuntime,
    gracePlayers: Array.isArray(surveyRuntime?.gracePlayers)
      ? surveyRuntime.gracePlayers.filter(
          (entry): entry is SurveyClosureGracePlayer =>
            Boolean(entry) &&
            typeof entry.playerId === "string" &&
            Number.isFinite(entry.stepIndex),
        )
      : defaults.gracePlayers,
  };
}

function toLiveSurveyQuestionOverview(
  questionResult: ReturnType<typeof buildSurveyQuestionResults>[number],
): LiveSurveyQuestionOverview {
  return {
    questionId: questionResult.questionId,
    questionTitle: questionResult.questionTitle,
    prompt: questionResult.prompt,
    totalAnswered: questionResult.totalAnswered,
    totalResponses: questionResult.totalResponses,
    skippedCount: questionResult.skippedCount,
    topOptionIds: questionResult.topOptionIds,
    options: questionResult.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
      voteCount: option.voteCount,
      percentage: option.percentage,
      isTopChoice: option.isTopChoice,
    })),
  };
}

export function getSurveyRuntimePhase(
  surveyRuntime: SurveyRuntimeState | null | undefined,
): SurveyPhase {
  return surveyRuntime?.phase ?? "live";
}

export function buildLiveSurveyOverview(db: LocalDatabase): LiveSurveyOverview {
  const questionResults = buildSurveyQuestionResults({
    questions: db.questions,
    answers: db.answers,
    playerId: "__aggregate__",
  });

  return {
    questionCount: db.questions.length,
    answeredQuestionCount: questionResults.filter(
      (questionResult) => questionResult.totalResponses > 0,
    ).length,
    totalParticipants: db.players.length,
    questions: questionResults.map(toLiveSurveyQuestionOverview),
  };
}

export function createFrozenSurveySnapshot(
  db: LocalDatabase,
  finalizedAt = getNowIso(),
): FinalSurveyResultsSnapshot {
  const liveOverview = buildLiveSurveyOverview(db);

  return {
    finalizedAt,
    totalParticipants: liveOverview.totalParticipants,
    questionResults: liveOverview.questions,
  };
}

export function shouldAllowCurrentStepCompletionAfterClosure({
  phase,
  playerCurrentStepIndex,
  playerId,
  submittedStepIndex,
  gracePlayers = [],
}: {
  phase: SurveyPhase;
  playerCurrentStepIndex: number;
  playerId?: string | null;
  submittedStepIndex: number;
  gracePlayers?: SurveyClosureGracePlayer[];
}) {
  if (phase === "live") {
    return true;
  }

  if (phase === "finalized") {
    return false;
  }

  if (submittedStepIndex !== playerCurrentStepIndex) {
    return false;
  }

  if (!playerId || gracePlayers.length === 0) {
    return true;
  }

  return gracePlayers.some(
    (gracePlayer) =>
      gracePlayer.playerId === playerId &&
      gracePlayer.stepIndex === submittedStepIndex,
  );
}

export function getAdminPlayerStepLabel(
  db: Pick<LocalDatabase, "questions" | "missions">,
  player: PlayerRecord,
) {
  const currentStep = getCurrentPlayerStep(player);

  if (!currentStep) {
    return "סיים";
  }

  if (currentStep.kind === "question") {
    const question = db.questions.find(
      (entry) => entry.id === currentStep.questionId,
    );
    return question?.title ?? "שאלה";
  }

  const mission = db.missions.find((entry) => entry.id === currentStep.missionId);
  return mission?.title ?? "משימת צילום";
}

export function buildAdminPlayerMonitor(
  db: LocalDatabase,
): AdminPlayerMonitorEntry[] {
  return [...db.players]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .map((player) => {
      const answeredQuestions = db.answers.filter(
        (answer) => answer.playerId === player.id && answer.kind === "question",
      ).length;
      const uploadedPhotos = db.photos.filter(
        (photo) => photo.playerId === player.id,
      ).length;
      const isFinishingCurrentStep =
        db.surveyRuntime.phase === "closing" &&
        db.surveyRuntime.gracePlayers.some(
          (entry) =>
            entry.playerId === player.id &&
            entry.stepIndex === player.currentStepIndex,
        );

      return {
        playerId: player.id,
        name: getPlayerDisplayName(player.name, player.participantType),
        participantType: player.participantType,
        status: player.completed
          ? "completed"
          : isFinishingCurrentStep
            ? "finishing-current-step"
            : isPlayerActive(player)
              ? "active"
              : "idle",
        currentStepIndex: player.currentStepIndex,
        currentStepLabel: getAdminPlayerStepLabel(db, player),
        answeredQuestions,
        uploadedPhotos,
        lastSeenAt: player.lastSeenAt,
        completedAt: player.completedAt,
      };
    });
}

export function buildFinalSystemBanner({
  surveyRuntime,
  activeHostAnnouncement,
}: {
  surveyRuntime: SurveyRuntimeState | null | undefined;
  activeHostAnnouncement: ActiveHostAnnouncement | null;
}): ActiveSystemBanner | null {
  const surveyPhase = getSurveyRuntimePhase(surveyRuntime);

  if (
    (surveyPhase === "closing" || surveyPhase === "finalized") &&
    surveyRuntime?.finalBannerMessage
  ) {
    return {
      type: "final-results",
      message: surveyRuntime.finalBannerMessage,
      startedAt: surveyRuntime.closedAt ?? surveyRuntime.finalizedAt,
      endsAt: null,
    };
  }

  if (!activeHostAnnouncement) {
    return null;
  }

  return {
    type: "host",
    message: activeHostAnnouncement.message,
    startedAt: activeHostAnnouncement.startedAt,
    endsAt: activeHostAnnouncement.endsAt,
  };
}

export function sortPlayers(players: PlayerRecord[]) {
  return [...players].sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (right.correctAnswers !== left.correctAnswers) {
      return right.correctAnswers - left.correctAnswers;
    }

    if (right.photoMissionsCompleted !== left.photoMissionsCompleted) {
      return right.photoMissionsCompleted - left.photoMissionsCompleted;
    }

    return (
      new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
    );
  });
}

export function isPlayerActive(player: PlayerRecord) {
  return Date.now() - new Date(player.lastSeenAt).getTime() <= ACTIVE_PLAYER_WINDOW_MS;
}

export function buildLeaderboard(players: PlayerRecord[]): LeaderboardEntry[] {
  return sortPlayers(players).map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    name: getPlayerDisplayName(player.name, player.participantType),
    totalScore: player.totalScore,
    correctAnswers: player.correctAnswers,
    photoMissionsCompleted: player.photoMissionsCompleted,
    newPeopleMet: player.newPeopleMet,
    completed: player.completed,
    isActive: isPlayerActive(player),
  }));
}

export function getPlayerRank(players: PlayerRecord[], playerId: string) {
  const leaderboard = buildLeaderboard(players);
  return leaderboard.find((entry) => entry.playerId === playerId)?.rank ?? leaderboard.length;
}

export function getPlayerAnswers(
  answers: PlayerAnswerRecord[],
  playerId: string,
) {
  return answers
    .filter((answer) => answer.playerId === playerId)
    .sort((left, right) => left.stepIndex - right.stepIndex);
}

export function buildSessionSnapshot(
  db: LocalDatabase,
  player: PlayerRecord,
): SessionSnapshot {
  const steps = buildRunSteps(player.questionOrder, player.missionOrder);
  const answers = getPlayerAnswers(db.answers, player.id);
  const surveyPhase = getSurveyRuntimePhase(db.surveyRuntime);
  const resultsPromptRequired =
    !player.completed &&
    surveyPhase !== "live" &&
    !shouldAllowCurrentStepCompletionAfterClosure({
      phase: surveyPhase,
      playerId: player.id,
      playerCurrentStepIndex: player.currentStepIndex,
      submittedStepIndex: player.currentStepIndex,
      gracePlayers: db.surveyRuntime.gracePlayers,
    });

  return {
    player,
    settings: normalizeAdminSettings(db.settings),
    steps,
    currentStep: resultsPromptRequired ? null : (steps[player.currentStepIndex] ?? null),
    answers,
    leaderboard: buildLeaderboard(db.players),
    questions: db.questions,
    missions: db.missions,
    surveyPhase,
    finalSurveySnapshot: db.surveyRuntime.finalResultsSnapshot,
    resultsPromptRequired,
  };
}

export function buildSummarySnapshot(
  db: LocalDatabase,
  player: PlayerRecord,
): SummarySnapshot {
  const leaderboard = buildLeaderboard(db.players);

  return {
    player,
    rank: leaderboard.find((entry) => entry.playerId === player.id)?.rank ?? 0,
    totalPlayers: leaderboard.length,
    settings: normalizeAdminSettings(db.settings),
    leaderboard,
    survey: buildSurveyResultsSnapshot(db, player),
  };
}

export function buildSurveyResultsSnapshot(
  db: LocalDatabase,
  player: PlayerRecord,
): SurveyResultsSnapshot {
  return {
    playerId: player.id,
    completed: player.completed,
    questionResults: buildSurveyQuestionResults({
      questions: db.questions,
      answers: db.answers,
      playerId: player.id,
    }),
  };
}

export function appendEvent(
  db: LocalDatabase,
  event: Omit<GameEventRecord, "createdAt"> & { createdAt?: string },
) {
  db.events.unshift({
    ...event,
    createdAt: event.createdAt ?? getNowIso(),
  });
  db.events = db.events.slice(0, 100);
}

export function hasCompletedAllPhotoMissions(
  answers: PlayerAnswerRecord[],
  missionCount: number,
) {
  const uploadedMissionIds = new Set(
    answers
      .filter((answer) => answer.kind === "mission" && answer.status === "uploaded")
      .map((answer) => answer.contentId),
  );

  return uploadedMissionIds.size >= missionCount;
}

export function getCurrentPlayerStep(player: PlayerRecord): RunStep | null {
  const steps = buildRunSteps(player.questionOrder, player.missionOrder);
  return steps[player.currentStepIndex] ?? null;
}

export function assertPlayerStep(
  player: PlayerRecord,
  stepIndex: number,
  expected:
    | {
        kind: "question";
        id: string;
      }
    | {
        kind: "mission";
        id: string;
      },
) {
  if (player.completed) {
    throw new Error("המשחק כבר הושלם.");
  }

  if (player.currentStepIndex !== stepIndex) {
    throw new Error("השלב השתנה. רעננו את המשחק ונסו שוב.");
  }

  const currentStep = getCurrentPlayerStep(player);
  if (!currentStep) {
    throw new Error("לא נמצא שלב פעיל למשחק.");
  }

  if (expected.kind === "question") {
    if (currentStep.kind !== "question" || currentStep.questionId !== expected.id) {
      throw new Error("השאלה שנשלחה לא תואמת לשלב הנוכחי.");
    }
    return currentStep;
  }

  if (currentStep.kind !== "mission" || currentStep.missionId !== expected.id) {
    throw new Error("משימת הצילום שנשלחה לא תואמת לשלב הנוכחי.");
  }

  return currentStep;
}
