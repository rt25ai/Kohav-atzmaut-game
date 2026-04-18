import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

import {
  defaultAdminSettings,
  defaultMissions,
  defaultQuestions,
} from "@/lib/content/default-bank";
import {
  assertPlayerStep,
  appendEvent,
  buildLeaderboard,
  buildSessionSnapshot,
  buildSummarySnapshot,
  buildSurveyResultsSnapshot,
  getNowIso,
  getPlayerAnswers,
  getPlayerRank,
  hasCompletedAllPhotoMissions,
  isPlayerActive,
} from "@/lib/data/helpers";
import {
  EXTRA_GALLERY_MISSION_ID,
  EXTRA_GALLERY_MISSION_TITLE,
} from "@/lib/game/photo-gallery";
import {
  getPlayerDisplayName,
  pickByParticipantType,
} from "@/lib/game/player-experience";
import { calculateMissionScore, calculateQuestionScore } from "@/lib/game/scoring";
import { buildRunSteps, shuffleArray } from "@/lib/game/run-plan";
import type {
  AdminSettings,
  AdminSettingsPatch,
  AdminSnapshot,
  AdjustPlayerPointsInput,
  LocalDatabase,
  PhotoModerationInput,
  PublicSnapshot,
  SessionSnapshot,
  StartGameInput,
  SubmitExtraPhotoInput,
  SubmitAnswerInput,
  SubmitMissionInput,
  SummarySnapshot,
} from "@/lib/types";

type ActionOutcome = {
  pointsAwarded: number;
  speedBonus: number;
  comboBonus: number;
  rankImproved: boolean;
  completed: boolean;
  status: "correct" | "wrong" | "skipped" | "uploaded";
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
    questions: defaultQuestions,
    missions: defaultMissions,
  };
}

function buildMissionOrder(missions: LocalDatabase["missions"]) {
  const standardMissionOrder = missions
    .filter((mission) => !mission.isFinal)
    .map((mission) => mission.id);
  const finalMission = missions.find((mission) => mission.isFinal);

  return [...standardMissionOrder, finalMission?.id ?? ""].filter(Boolean);
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
  return JSON.parse(raw) as LocalDatabase;
}

async function writeDb(db: LocalDatabase) {
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
    questionOrder: shuffleArray(db.questions.map((question) => question.id)),
    missionOrder: buildMissionOrder(db.missions),
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

export async function localGetPublicSnapshot(): Promise<PublicSnapshot> {
  const db = await readDb();

  return {
    settings: db.settings,
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
    recentEvents: db.events.slice(0, 12),
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
        },
      };
    }

    assertPlayerStep(player, input.stepIndex, {
      kind: "question",
      id: input.questionId,
    });

    const beforeRank = getPlayerRank(db.players, player.id);
    const breakdown = calculateQuestionScore({
      isCorrect: !input.skipped && input.selectedOptionId === question.correctOptionId,
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
    appendEvent(db, {
      id: nanoid(12),
      type: "score_update",
      message:
        breakdown.label === "correct"
          ? `${displayName} ${pickByParticipantType(player.participantType, {
              solo_male: `קיבל ${breakdown.points} נק׳ על תשובה נכונה`,
              solo_female: `קיבלה ${breakdown.points} נק׳ על תשובה נכונה`,
              family: `קיבלו ${breakdown.points} נק׳ על תשובה נכונה`,
            })}`
          : breakdown.label === "wrong"
            ? `${displayName} ${pickByParticipantType(player.participantType, {
                solo_male: "ממשיך לצבור נקודות ולהישאר במשחק",
                solo_female: "ממשיכה לצבור נקודות ולהישאר במשחק",
                family: "ממשיכים לצבור נקודות ולהישאר במשחק",
              })}`
            : `${displayName} ${pickByParticipantType(player.participantType, {
                solo_male: "דילג והמשיך הלאה",
                solo_female: "דילגה והמשיכה הלאה",
                family: "דילגו והמשיכו הלאה",
              })}`,
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
        message: `${displayName} ${pickByParticipantType(player.participantType, {
          solo_male: `עלה למקום ${afterRank}`,
          solo_female: `עלתה למקום ${afterRank}`,
          family: `עלו למקום ${afterRank}`,
        })}`,
        playerId: player.id,
        playerName: displayName,
      });
    }

    return {
      session: buildSessionSnapshot(db, player),
      outcome: {
        pointsAwarded: breakdown.points + completionBonus,
        speedBonus: breakdown.speedBonus,
        comboBonus: breakdown.comboBonus,
        rankImproved,
        completed: player.completed,
        status: breakdown.label,
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
        },
      };
    }

    assertPlayerStep(player, input.stepIndex, {
      kind: "mission",
      id: input.missionId,
    });

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
    const afterRank = getPlayerRank(db.players, player.id);
    const rankImproved = afterRank < beforeRank;
    player.lastRank = afterRank;

    if (rankImproved) {
      appendEvent(db, {
        id: nanoid(12),
        type: "rank_up",
        message: `${displayName} ${pickByParticipantType(player.participantType, {
          solo_male: `עלה למקום ${afterRank}`,
          solo_female: `עלתה למקום ${afterRank}`,
          family: `עלו למקום ${afterRank}`,
        })}`,
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
      },
    };
  });
}

export async function localGetAdminSnapshot(): Promise<AdminSnapshot> {
  const db = await readDb();
  return {
    settings: db.settings,
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
  };
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
      message: `הניקוד של ${displayName} עודכן ידנית`,
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
