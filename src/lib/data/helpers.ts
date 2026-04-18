import { ACTIVE_PLAYER_WINDOW_MS } from "@/lib/config";
import { buildSurveyQuestionResults } from "@/lib/game/survey-results";
import { getPlayerDisplayName } from "@/lib/game/player-experience";
import { buildRunSteps } from "@/lib/game/run-plan";
import type {
  GameEventRecord,
  LeaderboardEntry,
  LocalDatabase,
  PlayerAnswerRecord,
  PlayerRecord,
  RunStep,
  SessionSnapshot,
  SummarySnapshot,
  SurveyResultsSnapshot,
} from "@/lib/types";

export function getNowIso() {
  return new Date().toISOString();
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

  return {
    player,
    settings: db.settings,
    steps,
    currentStep: steps[player.currentStepIndex] ?? null,
    answers,
    leaderboard: buildLeaderboard(db.players),
    questions: db.questions,
    missions: db.missions,
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
    settings: db.settings,
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
