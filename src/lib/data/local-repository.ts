import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

import {
  normalizeAdminSettings,
} from "@/lib/content/admin-settings";
import {
  defaultAdminSettings,
  defaultMissions,
  defaultQuestions,
} from "@/lib/content/default-bank";
import {
  formatAdminActivityUpdateMessage,
  formatSurveyAnswerEventMessage,
  formatSurveyMomentumEventMessage,
} from "@/lib/data/live-event-copy";
import {
  assertPlayerStep,
  appendEvent,
  buildAdminPlayerMonitor,
  buildFinalSystemBanner,
  buildLeaderboard,
  buildLiveSurveyOverview,
  buildSessionSnapshot,
  buildSummarySnapshot,
  buildSurveyResultsSnapshot,
  createDefaultSurveyRuntimeState,
  createFrozenSurveySnapshot,
  deriveHostAnnouncementState,
  FINAL_RESULTS_PUBLISHED_MESSAGE,
  getCurrentPlayerStep,
  getNowIso,
  getPlayerAnswers,
  getPlayerRank,
  getSurveyRuntimePhase,
  hasCompletedAllPhotoMissions,
  isPlayerActive,
  normalizeSurveyRuntimeState,
  shouldAllowCurrentStepCompletionAfterClosure,
} from "@/lib/data/helpers";
import {
  EXTRA_GALLERY_MISSION_ID,
  EXTRA_GALLERY_MISSION_TITLE,
} from "@/lib/game/photo-gallery";
import { filterPublicRecentEvents } from "@/lib/game/live-event-feed";
import {
  getPlayerDisplayName,
  pickByParticipantType,
} from "@/lib/game/player-experience";
import { calculateMissionScore, calculateQuestionScore } from "@/lib/game/scoring";
import { buildLiveQuestionResult } from "@/lib/game/survey-results";
import {
  buildRunSteps,
  getOrderedMissionIds,
  getOrderedQuestionIds,
} from "@/lib/game/run-plan";
import type {
  AdminSettings,
  AdminSettingsPatch,
  AdminSnapshot,
  AdjustPlayerPointsInput,
  CreateHostAnnouncementInput,
  HostAnnouncementRecord,
  LocalDatabase,
  PhotoModerationInput,
  PublicSnapshot,
  SessionSnapshot,
  StartGameInput,
  SubmitExtraPhotoInput,
  SubmitAnswerInput,
  SubmitMissionInput,
  SummarySnapshot,
  SurveyQuestionResult,
  SurveyRuntimeState,
} from "@/lib/types";

type ActionOutcome = {
  pointsAwarded: number;
  speedBonus: number;
  comboBonus: number;
  rankImproved: boolean;
  completed: boolean;
  status: "correct" | "wrong" | "skipped" | "uploaded";
  liveQuestionResult: SurveyQuestionResult | null;
};

let writeQueue: Promise<unknown> = Promise.resolve();
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "local-db.json");

function createInitialDatabase(): LocalDatabase {
  return {
    settings: defaultAdminSettings,
    players: [],
    answers: [],
    photos: [],
    events: [],
    hostAnnouncements: [],
    questions: defaultQuestions,
    missions: defaultMissions,
    surveyRuntime: createDefaultSurveyRuntimeState(),
  };
}

function buildMissionOrder(missions: LocalDatabase["missions"]) {
  return getOrderedMissionIds(missions);
}

function normalizeLocalDb(db: Partial<LocalDatabase> | null | undefined): LocalDatabase {
  return {
    settings: normalizeAdminSettings(db?.settings ?? defaultAdminSettings),
    players: Array.isArray(db?.players) ? db.players : [],
    answers: Array.isArray(db?.answers) ? db.answers : [],
    photos: Array.isArray(db?.photos) ? db.photos : [],
    events: Array.isArray(db?.events) ? db.events : [],
    hostAnnouncements: Array.isArray(db?.hostAnnouncements)
      ? db.hostAnnouncements
      : [],
    questions:
      Array.isArray(db?.questions) && db.questions.length > 0
        ? db.questions
        : defaultQuestions,
    missions:
      Array.isArray(db?.missions) && db.missions.length > 0
        ? db.missions
        : defaultMissions,
    surveyRuntime: normalizeSurveyRuntimeState(db?.surveyRuntime),
  };
}

function getGracePlayersForSurveyClosure(db: LocalDatabase) {
  return db.players.flatMap((player) => {
    const currentStep = getCurrentPlayerStep(player);

    if (player.completed || !currentStep || !isPlayerActive(player)) {
      return [];
    }

    return [{ playerId: player.id, stepIndex: player.currentStepIndex }];
  });
}

function maybeFinalizeClosedSurveyRuntime(db: LocalDatabase) {
  if (
    db.surveyRuntime.phase !== "closing" ||
    db.surveyRuntime.gracePlayers.length > 0
  ) {
    return db.surveyRuntime;
  }

  db.surveyRuntime = {
    ...db.surveyRuntime,
    phase: "finalized",
    finalizedAt: db.surveyRuntime.finalizedAt ?? getNowIso(),
  };

  return db.surveyRuntime;
}

function consumeClosingGracePlayer(
  db: LocalDatabase,
  playerId: string,
  stepIndex: number,
) {
  if (db.surveyRuntime.phase !== "closing") {
    return db.surveyRuntime;
  }

  db.surveyRuntime = {
    ...db.surveyRuntime,
    gracePlayers: db.surveyRuntime.gracePlayers.filter(
      (entry) => !(entry.playerId === playerId && entry.stepIndex === stepIndex),
    ),
  };

  return maybeFinalizeClosedSurveyRuntime(db);
}

function assertSurveyStillAcceptsStep(
  db: LocalDatabase,
  playerId: string,
  playerCurrentStepIndex: number,
  submittedStepIndex: number,
) {
  if (db.surveyRuntime.phase === "finalized") {
    throw new Error("התוצאות הסופיות כבר פורסמו. אי אפשר לענות יותר.");
  }

  if (
    db.surveyRuntime.phase === "closing" &&
    !shouldAllowCurrentStepCompletionAfterClosure({
      phase: db.surveyRuntime.phase,
      playerId,
      playerCurrentStepIndex,
      submittedStepIndex,
      gracePlayers: db.surveyRuntime.gracePlayers,
    })
  ) {
    throw new Error("הסקר נסגר והתוצאות הסופיות פורסמו.");
  }
}

async function ensureLocalDb() {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });

  try {
    await fs.access(LOCAL_DB_PATH);
  } catch {
    await fs.writeFile(
      LOCAL_DB_PATH,
      JSON.stringify(createInitialDatabase(), null, 2),
      "utf8",
    );
  }
}

async function readDb() {
  await ensureLocalDb();
  const raw = await fs.readFile(LOCAL_DB_PATH, "utf8");
  return normalizeLocalDb(JSON.parse(raw) as Partial<LocalDatabase>);
}

async function writeDb(db: LocalDatabase) {
  db.surveyRuntime = normalizeSurveyRuntimeState(db.surveyRuntime);
  db.questions = defaultQuestions;
  db.missions = defaultMissions;
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function withDb<T>(callback: (db: LocalDatabase) => Promise<T> | T) {
  const operation = writeQueue.then(async () => {
    const db = await readDb();
    const result = await callback(db);
    await writeDb(db);
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}

function createPlayer(
  db: LocalDatabase,
  name: string,
  participantType: StartGameInput["participantType"],
): LocalDatabase["players"][number] {
  const now = getNowIso();

  return {
    id: nanoid(12),
    name: name.trim(),
    participantType,
    questionOrder: getOrderedQuestionIds(db.questions),
    missionOrder: [],
    currentStepIndex: 0,
    totalScore: 0,
    correctAnswers: 0,
    photoMissionsCompleted: 0,
    newPeopleMet: 0,
    comboStreak: 0,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    lastRank: null,
  };
}

function findPlayerOrThrow(db: LocalDatabase, playerId: string) {
  const player = db.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error("השחקן לא נמצא");
  }

  return player;
}

function findHostAnnouncementOrThrow(
  db: LocalDatabase,
  hostAnnouncementId: string,
): HostAnnouncementRecord {
  const announcement = db.hostAnnouncements.find(
    (entry) => entry.id === hostAnnouncementId,
  );

  if (!announcement) {
    throw new Error("הודעת המנחה לא נמצאה");
  }

  return announcement;
}

function buildHostAnnouncementSummary(announcement: HostAnnouncementRecord) {
  return announcement.message.length > 48
    ? `${announcement.message.slice(0, 45).trim()}...`
    : announcement.message;
}

function finalizeCompletedRun(db: LocalDatabase, playerId: string) {
  const player = findPlayerOrThrow(db, playerId);
  const steps = buildRunSteps(player.questionOrder, player.missionOrder);
  const answers = getPlayerAnswers(db.answers, playerId);

  if (player.completed || player.currentStepIndex < steps.length) {
    return 0;
  }

  let bonus = 200;
  if (hasCompletedAllPhotoMissions(answers, db.missions.length)) {
    bonus += 150;
  }

  player.totalScore += bonus;
  player.completed = true;
  player.completedAt = getNowIso();
  player.updatedAt = player.completedAt;
  const displayName = getPlayerDisplayName(player.name, player.participantType);

  appendEvent(db, {
    id: nanoid(12),
    type: "game_completed",
    message: `${displayName} ${pickByParticipantType(player.participantType, {
      solo_male: "סיים את המשחק עם סיום חגיגי",
      solo_female: "סיימה את המשחק עם סיום חגיגי",
      family: "סיימו את המשחק עם סיום חגיגי",
    })}`,
    playerId: player.id,
    playerName: displayName,
  });

  return bonus;
}

export async function localStartGame(input: StartGameInput) {
  return withDb(async (db) => {
    const player = createPlayer(db, input.name, input.participantType);
    db.players.push(player);
    const displayName = getPlayerDisplayName(player.name, player.participantType);

    appendEvent(db, {
      id: nanoid(12),
      type: "player_joined",
      message: `${displayName} ${pickByParticipantType(player.participantType, {
        solo_male: "הצטרף למשחק",
        solo_female: "הצטרפה למשחק",
        family: "הצטרפו למשחק",
      })}`,
      playerId: player.id,
      playerName: displayName,
    });

    player.lastRank = getPlayerRank(db.players, player.id);
    return buildSessionSnapshot(db, player);
  });
}

export async function localHeartbeat(playerId: string) {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, playerId);
    player.lastSeenAt = getNowIso();
    player.updatedAt = player.lastSeenAt;
    return { ok: true };
  });
}

export async function localGetSession(playerId: string) {
  const db = await readDb();
  const player = findPlayerOrThrow(db, playerId);
  return buildSessionSnapshot(db, player);
}

export async function localGetSummary(playerId: string) {
  const db = await readDb();
  const player = findPlayerOrThrow(db, playerId);
  return buildSummarySnapshot(db, player);
}

export async function localGetSurveyResults(playerId: string) {
  const db = await readDb();
  const player = findPlayerOrThrow(db, playerId);
  return buildSurveyResultsSnapshot(db, player);
}

export async function localGetSurveyRuntime() {
  const db = await readDb();
  return db.surveyRuntime;
}

export async function localPublishFinalSurveyResults() {
  return withDb(async (db) => {
    if (db.surveyRuntime.phase !== "live") {
      return db.surveyRuntime;
    }

    const closedAt = getNowIso();
    db.surveyRuntime = {
      phase: "closing",
      closedAt,
      finalizedAt: null,
      finalResultsSnapshot: createFrozenSurveySnapshot(db, closedAt),
      finalBannerMessage: FINAL_RESULTS_PUBLISHED_MESSAGE,
      gracePlayers: getGracePlayersForSurveyClosure(db),
    };

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: 'פורסמו התוצאות הסופיות והסקר נסגר למענה חדש',
      playerId: null,
      playerName: null,
    });

    return maybeFinalizeClosedSurveyRuntime(db);
  });
}

export async function localReopenSurveyToLive() {
  return withDb(async (db) => {
    if (db.surveyRuntime.phase === "live") {
      return db.surveyRuntime;
    }

    db.surveyRuntime = createDefaultSurveyRuntimeState();
    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: "הסקר הוחזר למצב חי ונפתח שוב למענה חדש",
      playerId: null,
      playerName: null,
    });

    return db.surveyRuntime;
  });
}

export async function localGetPublicSnapshot(): Promise<PublicSnapshot> {
  const db = await readDb();
  const hostState = deriveHostAnnouncementState(db.hostAnnouncements);
  const surveyPhase = getSurveyRuntimePhase(db.surveyRuntime);

  return {
    settings: normalizeAdminSettings(db.settings),
    totalParticipants: db.players.length,
    activePlayersNow: db.players.filter(isPlayerActive).length,
    leaderboard: buildLeaderboard(db.players),
    latestPhotos: db.photos
      .filter((photo) => !photo.hidden)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 12),
    recentEvents: filterPublicRecentEvents(db.events),
    activeHostAnnouncement: hostState.active,
    activeSystemBanner: buildFinalSystemBanner({
      surveyRuntime: db.surveyRuntime,
      activeHostAnnouncement: hostState.active,
    }),
    nextHostTransitionAt: hostState.nextTransitionAt,
    surveyRuntime: db.surveyRuntime,
    surveyPhase,
    finalSurveySnapshot: db.surveyRuntime.finalResultsSnapshot,
  };
}

export async function localGetGallery(includeHidden = false) {
  const db = await readDb();
  return db.photos
    .filter((photo) => (includeHidden ? true : !photo.hidden))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

export async function localGetLeaderboard() {
  const db = await readDb();
  return buildLeaderboard(db.players);
}

export async function localSubmitExtraPhoto(input: SubmitExtraPhotoInput) {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, input.playerId);
    const now = getNowIso();
    const displayName = getPlayerDisplayName(player.name, player.participantType);
    const photo = {
      id: nanoid(12),
      playerId: player.id,
      playerName: displayName,
      missionId: EXTRA_GALLERY_MISSION_ID,
      missionTitle: EXTRA_GALLERY_MISSION_TITLE,
      caption: input.caption.trim() || null,
      photoUrl: input.photoUrl,
      thumbnailUrl: input.thumbnailUrl,
      hidden: false,
      createdAt: now,
      isFinalMission: false,
    };

    db.photos.push(photo);

    appendEvent(db, {
      id: nanoid(12),
      type: "photo_uploaded",
      message: `${displayName} ${pickByParticipantType(player.participantType, {
        solo_male: `העלה תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
        solo_female: `העלתה תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
        family: `העלו תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
      })}`,
      playerId: player.id,
      playerName: displayName,
    });

    player.updatedAt = now;
    player.lastSeenAt = now;

    return { photo };
  });
}

export async function localSubmitAnswer(
  input: SubmitAnswerInput,
): Promise<{ session: SessionSnapshot; outcome: ActionOutcome }> {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, input.playerId);
    const question = db.questions.find((entry) => entry.id === input.questionId);

    if (!question) {
      throw new Error("השאלה לא נמצאה");
    }

    const existing = db.answers.find(
      (answer) =>
        answer.playerId === input.playerId &&
        answer.kind === "question" &&
        answer.contentId === input.questionId,
    );

    if (existing) {
      return {
        session: buildSessionSnapshot(db, player),
        outcome: {
          pointsAwarded: 0,
          speedBonus: 0,
          comboBonus: 0,
          rankImproved: false,
          completed: player.completed,
          status: existing.status,
          liveQuestionResult: buildLiveQuestionResult({
            question,
            answers: db.answers,
            playerId: player.id,
          }),
        },
      };
    }

    assertPlayerStep(player, input.stepIndex, {
      kind: "question",
      id: input.questionId,
    });
    assertSurveyStillAcceptsStep(
      db,
      player.id,
      player.currentStepIndex,
      input.stepIndex,
    );

    const beforeRank = getPlayerRank(db.players, player.id);
    const breakdown = calculateQuestionScore({
      // The survey uses subjective community choices, so every non-skipped answer counts.
      isCorrect: !input.skipped,
      skipped: input.skipped,
      responseMs: input.responseMs,
      previousStreak: player.comboStreak,
    });
    const now = getNowIso();

    db.answers.push({
      id: nanoid(12),
      playerId: player.id,
      kind: "question",
      contentId: question.id,
      stepIndex: input.stepIndex,
      status: breakdown.label,
      answerOptionId: input.skipped ? null : input.selectedOptionId,
      responseMs: input.responseMs,
      pointsAwarded: breakdown.points,
      caption: null,
      photoUrl: null,
      thumbnailUrl: null,
      missionTitle: null,
      newPeopleMet: 0,
      isFinalMission: false,
      createdAt: now,
    });

    player.totalScore += breakdown.points;
    player.correctAnswers += breakdown.label === "correct" ? 1 : 0;
    player.comboStreak = breakdown.nextStreak;
    player.currentStepIndex += 1;
    player.updatedAt = now;
    player.lastSeenAt = now;
    const displayName = getPlayerDisplayName(player.name, player.participantType);

    const completionBonus = finalizeCompletedRun(db, player.id);
    consumeClosingGracePlayer(db, player.id, input.stepIndex);
    appendEvent(db, {
      id: nanoid(12),
      type: "score_update",
      message: formatSurveyAnswerEventMessage(
        displayName,
        player.participantType,
        breakdown.label,
      ),
      playerId: player.id,
      playerName: displayName,
    });

    const afterRank = getPlayerRank(db.players, player.id);
    const rankImproved = afterRank < beforeRank;
    player.lastRank = afterRank;

    if (rankImproved) {
      appendEvent(db, {
        id: nanoid(12),
        type: "rank_up",
        message: formatSurveyMomentumEventMessage(displayName, player.participantType),
        playerId: player.id,
        playerName: displayName,
      });
    }

    const liveQuestionResult = buildLiveQuestionResult({
      question,
      answers: db.answers,
      playerId: player.id,
    });

    return {
      session: buildSessionSnapshot(db, player),
      outcome: {
        pointsAwarded: breakdown.points + completionBonus,
        speedBonus: breakdown.speedBonus,
        comboBonus: breakdown.comboBonus,
        rankImproved,
        completed: player.completed,
        status: breakdown.label,
        liveQuestionResult,
      },
    };
  });
}

export async function localSubmitMission(
  input: SubmitMissionInput,
): Promise<{ session: SessionSnapshot; outcome: ActionOutcome }> {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, input.playerId);
    const mission = db.missions.find((entry) => entry.id === input.missionId);

    if (!mission) {
      throw new Error("המשימה לא נמצאה");
    }

    const existing = db.answers.find(
      (answer) =>
        answer.playerId === input.playerId &&
        answer.kind === "mission" &&
        answer.contentId === input.missionId,
    );

    if (existing) {
      return {
        session: buildSessionSnapshot(db, player),
        outcome: {
          pointsAwarded: 0,
          speedBonus: 0,
          comboBonus: 0,
          rankImproved: false,
          completed: player.completed,
          status: existing.status,
          liveQuestionResult: null,
        },
      };
    }

    assertPlayerStep(player, input.stepIndex, {
      kind: "mission",
      id: input.missionId,
    });
    assertSurveyStillAcceptsStep(
      db,
      player.id,
      player.currentStepIndex,
      input.stepIndex,
    );

    if (!input.skipped && !input.photoUrl) {
      throw new Error("צריך להעלות תמונה אמיתית כדי להשלים את המשימה.");
    }

    const beforeRank = getPlayerRank(db.players, player.id);
    const now = getNowIso();
    const pointsAwarded = calculateMissionScore(mission.basePoints, input.skipped);
    const displayName = getPlayerDisplayName(player.name, player.participantType);

    db.answers.push({
      id: nanoid(12),
      playerId: player.id,
      kind: "mission",
      contentId: mission.id,
      stepIndex: input.stepIndex,
      status: input.skipped ? "skipped" : "uploaded",
      answerOptionId: null,
      responseMs: null,
      pointsAwarded,
      caption: input.caption.trim() || null,
      photoUrl: input.photoUrl,
      thumbnailUrl: input.thumbnailUrl,
      missionTitle: mission.title,
      newPeopleMet: input.newPeopleMet,
      isFinalMission: Boolean(mission.isFinal),
      createdAt: now,
    });

    if (!input.skipped && input.photoUrl) {
      db.photos.push({
        id: nanoid(12),
        playerId: player.id,
        playerName: displayName,
        missionId: mission.id,
        missionTitle: mission.title,
        caption: input.caption.trim() || null,
        photoUrl: input.photoUrl,
        thumbnailUrl: input.thumbnailUrl,
        hidden: false,
        createdAt: now,
        isFinalMission: Boolean(mission.isFinal),
      });

      appendEvent(db, {
        id: nanoid(12),
        type: "photo_uploaded",
        message: `${displayName} ${pickByParticipantType(player.participantType, {
          solo_male: `העלה תמונה למשימה "${mission.title}"`,
          solo_female: `העלתה תמונה למשימה "${mission.title}"`,
          family: `העלו תמונה למשימה "${mission.title}"`,
        })}`,
        playerId: player.id,
        playerName: displayName,
      });
    }

    player.totalScore += pointsAwarded;
    player.photoMissionsCompleted += input.skipped ? 0 : 1;
    player.newPeopleMet += Number.isFinite(input.newPeopleMet)
      ? Math.max(input.newPeopleMet, 0)
      : 0;
    player.currentStepIndex += 1;
    player.comboStreak = 0;
    player.updatedAt = now;
    player.lastSeenAt = now;

    const completionBonus = finalizeCompletedRun(db, player.id);
    consumeClosingGracePlayer(db, player.id, input.stepIndex);
    const afterRank = getPlayerRank(db.players, player.id);
    const rankImproved = afterRank < beforeRank;
    player.lastRank = afterRank;

    if (rankImproved) {
      appendEvent(db, {
        id: nanoid(12),
        type: "rank_up",
        message: formatSurveyMomentumEventMessage(displayName, player.participantType),
        playerId: player.id,
        playerName: displayName,
      });
    }

    return {
      session: buildSessionSnapshot(db, player),
      outcome: {
        pointsAwarded: pointsAwarded + completionBonus,
        speedBonus: 0,
        comboBonus: 0,
        rankImproved,
        completed: player.completed,
        status: input.skipped ? "skipped" : "uploaded",
        liveQuestionResult: null,
      },
    };
  });
}

export async function localGetAdminSnapshot(): Promise<AdminSnapshot> {
  const db = await readDb();
  const hostState = deriveHostAnnouncementState(db.hostAnnouncements);
  const liveSurveyOverview = buildLiveSurveyOverview(db);

  return {
    settings: normalizeAdminSettings(db.settings),
    players: db.players.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    activePlayers: db.players.filter(isPlayerActive),
    leaderboard: buildLeaderboard(db.players),
    photos: db.photos.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    totalParticipants: db.players.length,
    activeHostAnnouncement: hostState.active,
    hostAnnouncements: hostState.announcements,
    nextHostTransitionAt: hostState.nextTransitionAt,
    surveyRuntime: db.surveyRuntime,
    surveyPhase: db.surveyRuntime.phase,
    finalizedAt: db.surveyRuntime.finalizedAt,
    finalSurveySnapshot: db.surveyRuntime.finalResultsSnapshot,
    liveSurveyOverview,
    playersFinishingCurrentStep: db.surveyRuntime.gracePlayers.length,
    playerMonitor: buildAdminPlayerMonitor(db),
  };
}

export async function localCreateHostAnnouncement(
  input: CreateHostAnnouncementInput,
) {
  return withDb(async (db) => {
    const now = getNowIso();
    const announcement: HostAnnouncementRecord = {
      id: nanoid(12),
      message: input.message.trim(),
      scheduledFor: input.scheduledFor,
      endsMode: input.endsMode,
      endsAt: input.endsMode === "at_time" ? input.endsAt : null,
      clearedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    db.hostAnnouncements.push(announcement);

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message:
        announcement.scheduledFor <= now
          ? `המנחה שלח הודעה חיה לקהל: "${buildHostAnnouncementSummary(announcement)}"`
          : `נקבעה הודעת מנחה מתוזמנת: "${buildHostAnnouncementSummary(announcement)}"`,
      playerId: null,
      playerName: null,
    });

    return announcement;
  });
}

export async function localActivateHostAnnouncementNow(hostAnnouncementId: string) {
  return withDb(async (db) => {
    const announcement = findHostAnnouncementOrThrow(db, hostAnnouncementId);
    const now = getNowIso();

    announcement.scheduledFor = now;
    announcement.clearedAt = null;
    announcement.updatedAt = now;

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `הופעלה עכשיו הודעת מנחה: "${buildHostAnnouncementSummary(announcement)}"`,
      playerId: null,
      playerName: null,
    });

    return announcement;
  });
}

export async function localStopHostAnnouncementNow(hostAnnouncementId: string) {
  return withDb(async (db) => {
    const announcement = findHostAnnouncementOrThrow(db, hostAnnouncementId);
    const now = getNowIso();

    announcement.clearedAt = now;
    announcement.updatedAt = now;

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `הסתיימה הודעת מנחה: "${buildHostAnnouncementSummary(announcement)}"`,
      playerId: null,
      playerName: null,
    });

    return announcement;
  });
}

export async function localCancelHostAnnouncement(hostAnnouncementId: string) {
  return withDb(async (db) => {
    const announcement = findHostAnnouncementOrThrow(db, hostAnnouncementId);
    const now = getNowIso();

    announcement.clearedAt = now;
    announcement.updatedAt = now;

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `בוטלה הודעת מנחה מתוזמנת: "${buildHostAnnouncementSummary(announcement)}"`,
      playerId: null,
      playerName: null,
    });

    return announcement;
  });
}

export async function localDeleteHostAnnouncement(hostAnnouncementId: string) {
  return withDb(async (db) => {
    const announcement = findHostAnnouncementOrThrow(db, hostAnnouncementId);
    db.hostAnnouncements = db.hostAnnouncements.filter(
      (entry) => entry.id !== hostAnnouncementId,
    );

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `נמחקה הודעת מנחה: "${buildHostAnnouncementSummary(announcement)}"`,
      playerId: null,
      playerName: null,
    });

    return announcement;
  });
}

export async function localUpdateSettings(settings: AdminSettingsPatch) {
  return withDb(async (db) => {
    db.settings = {
      ...db.settings,
      ...settings,
      prizeLabels: {
        ...db.settings.prizeLabels,
        ...settings.prizeLabels,
      },
    };

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: "הגדרות המשחק עודכנו מהמסך הניהולי",
      playerId: null,
      playerName: null,
    });

    return db.settings;
  });
}

export async function localResetPlayer(playerId: string) {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, playerId);
    const reset = createPlayer(db, player.name, player.participantType);
    const displayName = getPlayerDisplayName(player.name, player.participantType);

    player.questionOrder = reset.questionOrder;
    player.missionOrder = reset.missionOrder;
    player.currentStepIndex = 0;
    player.totalScore = 0;
    player.correctAnswers = 0;
    player.photoMissionsCompleted = 0;
    player.newPeopleMet = 0;
    player.comboStreak = 0;
    player.completed = false;
    player.completedAt = null;
    player.updatedAt = getNowIso();
    player.lastSeenAt = player.updatedAt;
    player.lastRank = null;

    db.answers = db.answers.filter((answer) => answer.playerId !== playerId);
    db.photos = db.photos.filter((photo) => photo.playerId !== playerId);

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `הריצה של ${displayName} אופסה`,
      playerId,
      playerName: displayName,
    });

    return buildSessionSnapshot(db, player);
  });
}

export async function localAdjustPlayerPoints(input: AdjustPlayerPointsInput) {
  return withDb(async (db) => {
    const player = findPlayerOrThrow(db, input.playerId);
    player.totalScore += input.delta;
    player.updatedAt = getNowIso();
    const displayName = getPlayerDisplayName(player.name, player.participantType);

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: formatAdminActivityUpdateMessage(displayName),
      playerId: player.id,
      playerName: displayName,
    });

    return buildSessionSnapshot(db, player);
  });
}

export async function localModeratePhoto(input: PhotoModerationInput) {
  return withDb(async (db) => {
    const photo = db.photos.find((entry) => entry.id === input.photoId);

    if (!photo) {
      throw new Error("התמונה לא נמצאה");
    }

    if (input.action === "delete") {
      db.photos = db.photos.filter((entry) => entry.id !== input.photoId);
    } else if (input.action === "hide") {
      photo.hidden = true;
    } else {
      photo.hidden = false;
    }

    appendEvent(db, {
      id: nanoid(12),
      type: "admin_update",
      message: `בוצע עדכון ניהולי על תמונה מהמשימה "${photo.missionTitle}"`,
      playerId: photo.playerId,
      playerName: photo.playerName,
    });

    return photo;
  });
}

export async function localExportPlayersCsv() {
  const db = await readDb();
  const rows = [
    ["מזהה", "שם", "ניקוד", "תשובות נכונות", "משימות צילום", "אנשים חדשים", "הושלם", "פעיל עכשיו"],
    ...buildLeaderboard(db.players).map((entry) => [
      entry.playerId,
      entry.name,
      String(entry.totalScore),
      String(entry.correctAnswers),
      String(entry.photoMissionsCompleted),
      String(entry.newPeopleMet),
      entry.completed ? "כן" : "לא",
      entry.isActive ? "כן" : "לא",
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
