import "server-only";

import { Buffer } from "node:buffer";
import { nanoid } from "nanoid";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildSeedAdminSettingsRow,
  buildSeedMissionRows,
  buildSeedQuestionRows,
  mapMissionRow,
  mapQuestionRow,
} from "@/lib/content/content-seed";
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
  buildLeaderboard,
  buildSessionSnapshot,
  buildSummarySnapshot,
  buildSurveyResultsSnapshot,
  getPlayerRank,
  hasCompletedAllPhotoMissions,
} from "@/lib/data/helpers";
import {
  EXTRA_GALLERY_MISSION_ID,
  EXTRA_GALLERY_MISSION_TITLE,
} from "@/lib/game/photo-gallery";
import {
  getPlayerDisplayName,
  normalizeParticipantType,
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
  PlayerAnswerRecord,
  PlayerRecord,
  PhotoMission,
  PublicSnapshot,
  Question,
  SessionSnapshot,
  StartGameInput,
  SubmitExtraPhotoInput,
  SubmitAnswerInput,
  SubmitMissionInput,
  SummarySnapshot,
} from "@/lib/types";

const PHOTO_BUCKET = "mission-photos";

type ActionOutcome = {
  pointsAwarded: number;
  speedBonus: number;
  comboBonus: number;
  rankImproved: boolean;
  completed: boolean;
  status: "correct" | "wrong" | "skipped" | "uploaded";
};

type GameContent = {
  questions: Question[];
  missions: PhotoMission[];
};

let cachedClient: SupabaseClient | null = null;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

function getNowIso() {
  return new Date().toISOString();
}

function questionOrder(questions: Question[]) {
  return shuffleArray(questions.map((question) => question.id));
}

function missionOrder(missions: PhotoMission[]) {
  const standard = missions
    .filter((mission) => !mission.isFinal)
    .map((mission) => mission.id);
  const finalMission = missions.find((mission) => mission.isFinal)?.id;
  return [...standard, finalMission].filter(Boolean) as string[];
}

function mapSettings(row?: Record<string, unknown> | null): AdminSettings {
  if (!row) {
    return defaultAdminSettings;
  }

  return {
    introText: String(row.intro_text ?? defaultAdminSettings.introText),
    prizeLabels: {
      first: String(row.prize_first ?? defaultAdminSettings.prizeLabels.first),
      second: String(row.prize_second ?? defaultAdminSettings.prizeLabels.second),
      third: String(row.prize_third ?? defaultAdminSettings.prizeLabels.third),
    },
    globalSoundEnabled: Boolean(
      row.global_sound_enabled ?? defaultAdminSettings.globalSoundEnabled,
    ),
  };
}

function mapPlayer(row: Record<string, unknown>): PlayerRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    participantType: normalizeParticipantType(row.participant_type),
    questionOrder: (row.question_order as string[]) ?? [],
    missionOrder: (row.mission_order as string[]) ?? [],
    currentStepIndex: Number(row.current_step_index ?? 0),
    totalScore: Number(row.total_score ?? 0),
    correctAnswers: Number(row.correct_answers ?? 0),
    photoMissionsCompleted: Number(row.photo_missions_completed ?? 0),
    newPeopleMet: Number(row.new_people_met ?? 0),
    comboStreak: Number(row.combo_streak ?? 0),
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastSeenAt: String(row.last_seen_at),
    lastRank: row.last_rank === null || row.last_rank === undefined ? null : Number(row.last_rank),
  };
}

function mapAnswer(row: Record<string, unknown>): PlayerAnswerRecord {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    kind: row.kind as PlayerAnswerRecord["kind"],
    contentId: String(row.content_id),
    stepIndex: Number(row.step_index ?? 0),
    status: row.status as PlayerAnswerRecord["status"],
    answerOptionId: (row.answer_option_id as PlayerAnswerRecord["answerOptionId"]) ?? null,
    responseMs: row.response_ms === null ? null : Number(row.response_ms),
    pointsAwarded: Number(row.points_awarded ?? 0),
    caption: row.caption ? String(row.caption) : null,
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    missionTitle: row.mission_title ? String(row.mission_title) : null,
    newPeopleMet: Number(row.new_people_met ?? 0),
    isFinalMission: Boolean(row.is_final_mission),
    createdAt: String(row.created_at),
  };
}

function mapPhoto(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    caption: row.caption ? String(row.caption) : null,
    photoUrl: String(row.photo_url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    hidden: Boolean(row.hidden),
    createdAt: String(row.created_at),
    isFinalMission: Boolean(row.is_final_mission),
  };
}

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    type: row.type as
      | "player_joined"
      | "rank_up"
      | "photo_uploaded"
      | "score_update"
      | "game_completed"
      | "admin_update",
    message: String(row.message),
    playerId: row.player_id ? String(row.player_id) : null,
    playerName: row.player_name ? String(row.player_name) : null,
    createdAt: String(row.created_at),
  };
}

function isDuplicateInsertError(error: unknown) {
  return (
    Boolean(error) &&
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    String((error as { code: unknown }).code) === "23505"
  );
}

function getStoragePathFromPublicUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const marker = `/${PHOTO_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function removeStoredAssets(
  client: SupabaseClient,
  urls: Array<string | null | undefined>,
) {
  const paths = urls
    .map((url) => getStoragePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) {
    return;
  }

  const { error } = await client.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) {
    throw error;
  }
}

async function fetchGameContent(client: SupabaseClient): Promise<GameContent> {
  const readContent = async () => {
    const [questionsResponse, missionsResponse] = await Promise.all([
      client
        .from("questions")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      client
        .from("photo_missions")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (questionsResponse.error) {
      throw questionsResponse.error;
    }

    if (missionsResponse.error) {
      throw missionsResponse.error;
    }

    return {
      questions: (questionsResponse.data ?? []).map((row) =>
        mapQuestionRow(row as Record<string, unknown>),
      ),
      missions: (missionsResponse.data ?? []).map((row) =>
        mapMissionRow(row as Record<string, unknown>),
      ),
    };
  };

  let content = await readContent();
  const hasMinimumQuestions = content.questions.length >= defaultQuestions.length;
  const hasMinimumMissions = content.missions.length >= defaultMissions.length;
  const hasFinalMission = content.missions.some((mission) => mission.isFinal);

  if (!hasMinimumQuestions || !hasMinimumMissions || !hasFinalMission) {
    const [{ error: questionsError }, { error: missionsError }] = await Promise.all([
      client.from("questions").upsert(buildSeedQuestionRows(), { onConflict: "id" }),
      client.from("photo_missions").upsert(buildSeedMissionRows(), { onConflict: "id" }),
    ]);

    if (questionsError) {
      throw questionsError;
    }

    if (missionsError) {
      throw missionsError;
    }

    content = await readContent();
  }

  return content;
}

async function ensureSettingsRow(client: SupabaseClient) {
  const { data } = await client
    .from("admin_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!data) {
    const { error } = await client
      .from("admin_settings")
      .upsert(buildSeedAdminSettingsRow());

    if (error) {
      throw error;
    }
  }
}

async function fetchPlayers(client: SupabaseClient) {
  const { data, error } = await client.from("players").select("*");
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => mapPlayer(row as Record<string, unknown>));
}

async function fetchSettings(client: SupabaseClient) {
  await ensureSettingsRow(client);
  const { data, error } = await client
    .from("admin_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw error;
  }

  return mapSettings(data as Record<string, unknown>);
}

async function fetchAnswers(client: SupabaseClient, playerId: string) {
  const { data, error } = await client
    .from("player_answers")
    .select("*")
    .eq("player_id", playerId)
    .order("step_index", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapAnswer(row as Record<string, unknown>));
}

async function fetchPlayer(client: SupabaseClient, playerId: string) {
  const { data, error } = await client
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (error) {
    throw error;
  }

  return mapPlayer(data as Record<string, unknown>);
}

async function fetchPublicDb(client: SupabaseClient): Promise<LocalDatabase> {
  const [players, settings, content, photosResponse, eventsResponse] = await Promise.all([
    fetchPlayers(client),
    fetchSettings(client),
    fetchGameContent(client),
    client.from("photo_uploads").select("*"),
    client.from("game_events").select("*").order("created_at", { ascending: false }),
  ]);

  if (photosResponse.error) {
    throw photosResponse.error;
  }

  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  return {
    settings,
    players,
    answers: [],
    photos: (photosResponse.data ?? []).map((row) =>
      mapPhoto(row as Record<string, unknown>),
    ),
    events: (eventsResponse.data ?? []).map((row) =>
      mapEvent(row as Record<string, unknown>),
    ),
    questions: content.questions,
    missions: content.missions,
  };
}

async function appendSupabaseEvent(
  client: SupabaseClient,
  event: {
    type: string;
    message: string;
    playerId: string | null;
    playerName: string | null;
  },
) {
  const { error } = await client.from("game_events").insert({
    id: nanoid(12),
    type: event.type,
    message: event.message,
    player_id: event.playerId,
    player_name: event.playerName,
    created_at: getNowIso(),
  });

  if (error) {
    console.error("Failed to append game event", error);
  }
}

async function uploadDataUrl(
  client: SupabaseClient,
  playerId: string,
  missionId: string,
  dataUrl: string | null,
  suffix: string,
) {
  if (!dataUrl) {
    return null;
  }

  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return dataUrl;
  }

  const mimeType = match[1];
  const payload = match[2];
  const extension = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  const filePath = `${playerId}/${missionId}-${suffix}-${nanoid(8)}.${extension}`;
  const buffer = Buffer.from(payload, "base64");

  const { error } = await client.storage.from(PHOTO_BUCKET).upload(filePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return client.storage.from(PHOTO_BUCKET).getPublicUrl(filePath).data.publicUrl;
}

async function fetchSessionDb(client: SupabaseClient, playerId: string) {
  const [players, settings, content, player, answers] = await Promise.all([
    fetchPlayers(client),
    fetchSettings(client),
    fetchGameContent(client),
    fetchPlayer(client, playerId),
    fetchAnswers(client, playerId),
  ]);

  return {
    settings,
    players,
    questions: content.questions,
    missions: content.missions,
    answers,
    player,
  };
}

async function finalizeSupabaseRun(
  client: SupabaseClient,
  player: PlayerRecord,
  answers: PlayerAnswerRecord[],
  missions: PhotoMission[],
) {
  const steps = buildRunSteps(player.questionOrder, player.missionOrder);
  if (player.completed || player.currentStepIndex < steps.length) {
    return { player, bonusAwarded: 0 };
  }

  let bonus = 200;
  if (hasCompletedAllPhotoMissions(answers, missions.length)) {
    bonus += 150;
  }

  const updatedPlayer = {
    ...player,
    totalScore: player.totalScore + bonus,
    completed: true,
    completedAt: getNowIso(),
    updatedAt: getNowIso(),
  };
  const displayName = getPlayerDisplayName(player.name, player.participantType);

  const { error } = await client
    .from("players")
    .update({
      total_score: updatedPlayer.totalScore,
      completed: true,
      completed_at: updatedPlayer.completedAt,
      updated_at: updatedPlayer.updatedAt,
    })
    .eq("id", player.id);

  if (error) {
    throw error;
  }

  await appendSupabaseEvent(client, {
    type: "game_completed",
    message: `${displayName} ${pickByParticipantType(player.participantType, {
      solo_male: "סיים את המשחק עם סיום חגיגי",
      solo_female: "סיימה את המשחק עם סיום חגיגי",
      family: "סיימו את המשחק עם סיום חגיגי",
    })}`,
    playerId: player.id,
    playerName: displayName,
  });

  return {
    player: updatedPlayer,
    bonusAwarded: bonus,
  };
}

export async function supabaseStartGame(input: StartGameInput) {
  const client = getClient();
  await ensureSettingsRow(client);
  const content = await fetchGameContent(client);

  const now = getNowIso();
  const player = {
    id: nanoid(12),
    name: input.name.trim(),
    participant_type: input.participantType,
    question_order: questionOrder(content.questions),
    mission_order: missionOrder(content.missions),
    current_step_index: 0,
    total_score: 0,
    correct_answers: 0,
    photo_missions_completed: 0,
    new_people_met: 0,
    combo_streak: 0,
    completed: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
    last_seen_at: now,
    last_rank: null,
  };
  const displayName = getPlayerDisplayName(player.name, input.participantType);

  const { error } = await client.from("players").insert(player);
  if (error) {
    throw error;
  }

  await appendSupabaseEvent(client, {
    type: "player_joined",
    message: `${displayName} ${pickByParticipantType(input.participantType, {
      solo_male: "הצטרף למשחק",
      solo_female: "הצטרפה למשחק",
      family: "הצטרפו למשחק",
    })}`,
    playerId: player.id,
    playerName: displayName,
  });

  return supabaseGetSession(player.id);
}

export async function supabaseHeartbeat(playerId: string) {
  const client = getClient();
  const now = getNowIso();
  const { error } = await client
    .from("players")
    .update({ last_seen_at: now, updated_at: now })
    .eq("id", playerId);

  if (error) {
    throw error;
  }

  return { ok: true };
}

export async function supabaseGetSession(playerId: string): Promise<SessionSnapshot> {
  const client = getClient();
  const { settings, players, questions, missions, player, answers } =
    await fetchSessionDb(client, playerId);

  return buildSessionSnapshot(
    {
      settings,
      players,
      answers,
      photos: [],
      events: [],
      questions,
      missions,
    },
    player,
  );
}

export async function supabaseGetSummary(playerId: string): Promise<SummarySnapshot> {
  const client = getClient();
  const { settings, players, questions, missions, player, answers } =
    await fetchSessionDb(client, playerId);

  return buildSummarySnapshot(
    {
      settings,
      players,
      answers,
      photos: [],
      events: [],
      questions,
      missions,
    },
    player,
  );
}

export async function supabaseGetSurveyResults(playerId: string) {
  const client = getClient();
  const { settings, players, questions, missions, player, answers } =
    await fetchSessionDb(client, playerId);

  return buildSurveyResultsSnapshot(
    {
      settings,
      players,
      answers,
      photos: [],
      events: [],
      questions,
      missions,
    },
    player,
  );
}

export async function supabaseGetPublicSnapshot(): Promise<PublicSnapshot> {
  const client = getClient();
  const db = await fetchPublicDb(client);
  return {
    settings: db.settings,
    totalParticipants: db.players.length,
    activePlayersNow: buildLeaderboard(db.players).filter((entry) => entry.isActive).length,
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

export async function supabaseGetGallery(includeHidden = false) {
  const client = getClient();
  const { data, error } = await client
    .from("photo_uploads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => mapPhoto(row as Record<string, unknown>))
    .filter((photo) => (includeHidden ? true : !photo.hidden));
}

export async function supabaseGetLeaderboard() {
  const client = getClient();
  const players = await fetchPlayers(client);
  return buildLeaderboard(players);
}

export async function supabaseSubmitExtraPhoto(input: SubmitExtraPhotoInput) {
  const client = getClient();
  const player = await fetchPlayer(client, input.playerId);
  const now = getNowIso();
  const displayName = getPlayerDisplayName(player.name, player.participantType);
  const photoId = nanoid(12);
  const uploadedPhotoUrl = await uploadDataUrl(
    client,
    player.id,
    EXTRA_GALLERY_MISSION_ID,
    input.photoUrl,
    "full",
  );
  const uploadedThumbUrl = await uploadDataUrl(
    client,
    player.id,
    EXTRA_GALLERY_MISSION_ID,
    input.thumbnailUrl,
    "thumb",
  );

  try {
    const { error: photoError } = await client.from("photo_uploads").insert({
      id: photoId,
      player_id: player.id,
      player_name: displayName,
      mission_id: EXTRA_GALLERY_MISSION_ID,
      mission_title: EXTRA_GALLERY_MISSION_TITLE,
      caption: input.caption.trim() || null,
      photo_url: uploadedPhotoUrl,
      thumbnail_url: uploadedThumbUrl,
      hidden: false,
      created_at: now,
      is_final_mission: false,
    });

    if (photoError) {
      throw photoError;
    }

    const { error: playerError } = await client
      .from("players")
      .update({ updated_at: now, last_seen_at: now })
      .eq("id", player.id);

    if (playerError) {
      throw playerError;
    }

    await appendSupabaseEvent(client, {
      type: "photo_uploaded",
      message: `${displayName} ${pickByParticipantType(player.participantType, {
        solo_male: `העלה תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
        solo_female: `העלתה תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
        family: `העלו תמונה נוספת ל"${EXTRA_GALLERY_MISSION_TITLE}"`,
      })}`,
      playerId: player.id,
      playerName: displayName,
    });

    return {
      photo: {
        id: photoId,
        playerId: player.id,
        playerName: displayName,
        missionId: EXTRA_GALLERY_MISSION_ID,
        missionTitle: EXTRA_GALLERY_MISSION_TITLE,
        caption: input.caption.trim() || null,
        photoUrl: uploadedPhotoUrl ?? input.photoUrl,
        thumbnailUrl: uploadedThumbUrl,
        hidden: false,
        createdAt: now,
        isFinalMission: false,
      },
    };
  } catch (error) {
    await removeStoredAssets(client, [uploadedPhotoUrl, uploadedThumbUrl]).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function supabaseSubmitAnswer(
  input: SubmitAnswerInput,
): Promise<{ session: SessionSnapshot; outcome: ActionOutcome }> {
  const client = getClient();
  const [content, player, players, answers] = await Promise.all([
    fetchGameContent(client),
    fetchPlayer(client, input.playerId),
    fetchPlayers(client),
    fetchAnswers(client, input.playerId),
  ]);
  const question = content.questions.find((entry) => entry.id === input.questionId);

  if (!question) {
    throw new Error("השאלה לא נמצאה");
  }

  const existingAnswer = answers.find(
    (answer) => answer.kind === "question" && answer.contentId === question.id,
  );

  if (existingAnswer) {
    return {
      session: await supabaseGetSession(input.playerId),
      outcome: {
        pointsAwarded: 0,
        speedBonus: 0,
        comboBonus: 0,
        rankImproved: false,
        completed: player.completed,
        status: existingAnswer.status,
      },
    };
  }

  assertPlayerStep(player, input.stepIndex, {
    kind: "question",
    id: input.questionId,
  });

  const beforeRank = getPlayerRank(players, player.id);
  const breakdown = calculateQuestionScore({
    isCorrect: !input.skipped && input.selectedOptionId === question.correctOptionId,
    skipped: input.skipped,
    responseMs: input.responseMs,
    previousStreak: player.comboStreak,
  });
  const now = getNowIso();
  const answerId = nanoid(12);

  const { error: answerError } = await client.from("player_answers").insert({
    id: answerId,
    player_id: player.id,
    kind: "question",
    content_id: question.id,
    step_index: input.stepIndex,
    status: breakdown.label,
    answer_option_id: input.skipped ? null : input.selectedOptionId,
    response_ms: input.responseMs,
    points_awarded: breakdown.points,
    caption: null,
    photo_url: null,
    thumbnail_url: null,
    mission_title: null,
    new_people_met: 0,
    is_final_mission: false,
    created_at: now,
  });

  if (answerError) {
    if (isDuplicateInsertError(answerError)) {
      const session = await supabaseGetSession(input.playerId);
      const duplicatedAnswer = session.answers.find(
        (answer) => answer.kind === "question" && answer.contentId === question.id,
      );

      return {
        session,
        outcome: {
          pointsAwarded: 0,
          speedBonus: 0,
          comboBonus: 0,
          rankImproved: false,
          completed: session.player.completed,
          status: duplicatedAnswer?.status ?? "skipped",
        },
      };
    }

    throw answerError;
  }

  const updatedPlayer = {
    ...player,
    totalScore: player.totalScore + breakdown.points,
    correctAnswers: player.correctAnswers + (breakdown.label === "correct" ? 1 : 0),
    comboStreak: breakdown.nextStreak,
    currentStepIndex: player.currentStepIndex + 1,
    updatedAt: now,
    lastSeenAt: now,
  };

  const { error: playerError } = await client
    .from("players")
    .update({
      total_score: updatedPlayer.totalScore,
      correct_answers: updatedPlayer.correctAnswers,
      combo_streak: updatedPlayer.comboStreak,
      current_step_index: updatedPlayer.currentStepIndex,
      updated_at: updatedPlayer.updatedAt,
      last_seen_at: updatedPlayer.lastSeenAt,
    })
    .eq("id", player.id);

  if (playerError) {
    await client.from("player_answers").delete().eq("id", answerId);
    throw playerError;
  }

  const displayName = getPlayerDisplayName(player.name, player.participantType);

  await appendSupabaseEvent(client, {
    type: "score_update",
    message: formatSurveyAnswerEventMessage(
      displayName,
      player.participantType,
      breakdown.label,
    ),
    playerId: player.id,
    playerName: displayName,
  });

  const refreshedAnswers = [
    ...answers,
    {
      id: answerId,
      playerId: player.id,
      kind: "question",
      contentId: question.id,
      stepIndex: input.stepIndex,
      status: breakdown.label,
      answerOptionId: input.selectedOptionId,
      responseMs: input.responseMs,
      pointsAwarded: breakdown.points,
      caption: null,
      photoUrl: null,
      thumbnailUrl: null,
      missionTitle: null,
      newPeopleMet: 0,
      isFinalMission: false,
      createdAt: now,
    },
  ] as PlayerAnswerRecord[];
  const { player: finalizedPlayer, bonusAwarded } = await finalizeSupabaseRun(
    client,
    updatedPlayer,
    refreshedAnswers,
    content.missions,
  );
  const latestPlayers = await fetchPlayers(client);
  const afterRank = getPlayerRank(latestPlayers, player.id);
  const rankImproved = afterRank < beforeRank;

  if (rankImproved) {
    await appendSupabaseEvent(client, {
      type: "rank_up",
      message: formatSurveyMomentumEventMessage(displayName, player.participantType),
      playerId: player.id,
      playerName: displayName,
    });
  }

  return {
    session: await supabaseGetSession(input.playerId),
    outcome: {
      pointsAwarded: breakdown.points + bonusAwarded,
      speedBonus: breakdown.speedBonus,
      comboBonus: breakdown.comboBonus,
      rankImproved,
      completed: finalizedPlayer.completed,
      status: breakdown.label,
    },
  };
}

export async function supabaseSubmitMission(
  input: SubmitMissionInput,
): Promise<{ session: SessionSnapshot; outcome: ActionOutcome }> {
  const client = getClient();
  const [content, player, players, answers] = await Promise.all([
    fetchGameContent(client),
    fetchPlayer(client, input.playerId),
    fetchPlayers(client),
    fetchAnswers(client, input.playerId),
  ]);
  const mission = content.missions.find((entry) => entry.id === input.missionId);

  if (!mission) {
    throw new Error("המשימה לא נמצאה");
  }

  const existingAnswer = answers.find(
    (answer) => answer.kind === "mission" && answer.contentId === mission.id,
  );

  if (existingAnswer) {
    return {
      session: await supabaseGetSession(input.playerId),
      outcome: {
        pointsAwarded: 0,
        speedBonus: 0,
        comboBonus: 0,
        rankImproved: false,
        completed: player.completed,
        status: existingAnswer.status,
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

  const beforeRank = getPlayerRank(players, player.id);
  const now = getNowIso();
  const answerId = nanoid(12);
  const photoId = nanoid(12);
  const uploadedPhotoUrl = await uploadDataUrl(
    client,
    player.id,
    mission.id,
    input.photoUrl,
    "full",
  );
  const uploadedThumbUrl = await uploadDataUrl(
    client,
    player.id,
    mission.id,
    input.thumbnailUrl,
    "thumb",
  );
  const pointsAwarded = calculateMissionScore(mission.basePoints, input.skipped);
  const displayName = getPlayerDisplayName(player.name, player.participantType);

  const { error: answerError } = await client.from("player_answers").insert({
    id: answerId,
    player_id: player.id,
    kind: "mission",
    content_id: mission.id,
    step_index: input.stepIndex,
    status: input.skipped ? "skipped" : "uploaded",
    answer_option_id: null,
    response_ms: null,
    points_awarded: pointsAwarded,
    caption: input.caption.trim() || null,
    photo_url: uploadedPhotoUrl,
    thumbnail_url: uploadedThumbUrl,
    mission_title: mission.title,
    new_people_met: input.newPeopleMet,
    is_final_mission: Boolean(mission.isFinal),
    created_at: now,
  });

  if (answerError) {
    await removeStoredAssets(client, [uploadedPhotoUrl, uploadedThumbUrl]).catch(() => undefined);

    if (isDuplicateInsertError(answerError)) {
      const session = await supabaseGetSession(input.playerId);
      const duplicatedAnswer = session.answers.find(
        (answer) => answer.kind === "mission" && answer.contentId === mission.id,
      );

      return {
        session,
        outcome: {
          pointsAwarded: 0,
          speedBonus: 0,
          comboBonus: 0,
          rankImproved: false,
          completed: session.player.completed,
          status: duplicatedAnswer?.status ?? "skipped",
        },
      };
    }

    throw answerError;
  }

  if (!input.skipped && uploadedPhotoUrl) {
    const { error: photoError } = await client.from("photo_uploads").insert({
      id: photoId,
      player_id: player.id,
      player_name: displayName,
      mission_id: mission.id,
      mission_title: mission.title,
      caption: input.caption.trim() || null,
      photo_url: uploadedPhotoUrl,
      thumbnail_url: uploadedThumbUrl,
      hidden: false,
      created_at: now,
      is_final_mission: Boolean(mission.isFinal),
    });

    if (photoError) {
      await client.from("player_answers").delete().eq("id", answerId);
      await removeStoredAssets(client, [uploadedPhotoUrl, uploadedThumbUrl]).catch(() => undefined);
      throw photoError;
    }

    await appendSupabaseEvent(client, {
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

  const updatedPlayer = {
    ...player,
    totalScore: player.totalScore + pointsAwarded,
    photoMissionsCompleted: player.photoMissionsCompleted + (input.skipped ? 0 : 1),
    newPeopleMet: player.newPeopleMet + Math.max(input.newPeopleMet, 0),
    comboStreak: 0,
    currentStepIndex: player.currentStepIndex + 1,
    updatedAt: now,
    lastSeenAt: now,
  };

  const { error: playerError } = await client
    .from("players")
    .update({
      total_score: updatedPlayer.totalScore,
      photo_missions_completed: updatedPlayer.photoMissionsCompleted,
      new_people_met: updatedPlayer.newPeopleMet,
      combo_streak: 0,
      current_step_index: updatedPlayer.currentStepIndex,
      updated_at: updatedPlayer.updatedAt,
      last_seen_at: updatedPlayer.lastSeenAt,
    })
    .eq("id", player.id);

  if (playerError) {
    await client.from("player_answers").delete().eq("id", answerId);
    if (!input.skipped && uploadedPhotoUrl) {
      await client.from("photo_uploads").delete().eq("id", photoId);
      await removeStoredAssets(client, [uploadedPhotoUrl, uploadedThumbUrl]).catch(() => undefined);
    }
    throw playerError;
  }

  const refreshedAnswers = [
    ...answers,
    {
      id: answerId,
      playerId: player.id,
      kind: "mission",
      contentId: mission.id,
      stepIndex: input.stepIndex,
      status: input.skipped ? "skipped" : "uploaded",
      answerOptionId: null,
      responseMs: null,
      pointsAwarded,
      caption: input.caption.trim() || null,
      photoUrl: uploadedPhotoUrl,
      thumbnailUrl: uploadedThumbUrl,
      missionTitle: mission.title,
      newPeopleMet: input.newPeopleMet,
      isFinalMission: Boolean(mission.isFinal),
      createdAt: now,
    },
  ] as PlayerAnswerRecord[];
  const { player: finalizedPlayer, bonusAwarded } = await finalizeSupabaseRun(
    client,
    updatedPlayer,
    refreshedAnswers,
    content.missions,
  );
  const latestPlayers = await fetchPlayers(client);
  const afterRank = getPlayerRank(latestPlayers, player.id);
  const rankImproved = afterRank < beforeRank;

  if (rankImproved) {
    await appendSupabaseEvent(client, {
      type: "rank_up",
      message: formatSurveyMomentumEventMessage(displayName, player.participantType),
      playerId: player.id,
      playerName: displayName,
    });
  }

  return {
    session: await supabaseGetSession(input.playerId),
    outcome: {
      pointsAwarded: pointsAwarded + bonusAwarded,
      speedBonus: 0,
      comboBonus: 0,
      rankImproved,
      completed: finalizedPlayer.completed,
      status: input.skipped ? "skipped" : "uploaded",
    },
  };
}

export async function supabaseGetAdminSnapshot(): Promise<AdminSnapshot> {
  const client = getClient();
  const [settings, players, photos] = await Promise.all([
    fetchSettings(client),
    fetchPlayers(client),
    supabaseGetGallery(true),
  ]);

  return {
    settings,
    players: players.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    activePlayers: buildLeaderboard(players)
      .filter((entry) => entry.isActive)
      .map((entry) => players.find((player) => player.id === entry.playerId)!)
      .filter(Boolean),
    leaderboard: buildLeaderboard(players),
    photos,
    totalParticipants: players.length,
  };
}

export async function supabaseUpdateSettings(settings: AdminSettingsPatch) {
  const client = getClient();
  const current = await fetchSettings(client);
  const next = {
    ...current,
    ...settings,
    prizeLabels: {
      ...current.prizeLabels,
      ...settings.prizeLabels,
    },
  };

  const { error } = await client.from("admin_settings").upsert({
    id: 1,
    intro_text: next.introText,
    prize_first: next.prizeLabels.first,
    prize_second: next.prizeLabels.second,
    prize_third: next.prizeLabels.third,
    global_sound_enabled: next.globalSoundEnabled,
    updated_at: getNowIso(),
  });

  if (error) {
    throw error;
  }

  await appendSupabaseEvent(client, {
    type: "admin_update",
    message: "הגדרות המשחק עודכנו מהמסך הניהולי",
    playerId: null,
    playerName: null,
  });

  return next;
}

export async function supabaseResetPlayer(playerId: string) {
  const client = getClient();
  const [content, player, answers, photosResponse] = await Promise.all([
    fetchGameContent(client),
    fetchPlayer(client, playerId),
    fetchAnswers(client, playerId),
    client.from("photo_uploads").select("*").eq("player_id", playerId),
  ]);
  const now = getNowIso();
  if (photosResponse.error) {
    throw photosResponse.error;
  }

  const playerPhotos = (photosResponse.data ?? []).map((row) =>
    mapPhoto(row as Record<string, unknown>),
  );
  const answerUploads = answers.filter((answer) => answer.kind === "mission");

  const { error: answersDeleteError } = await client
    .from("player_answers")
    .delete()
    .eq("player_id", playerId);
  if (answersDeleteError) {
    throw answersDeleteError;
  }

  const { error: photosDeleteError } = await client
    .from("photo_uploads")
    .delete()
    .eq("player_id", playerId);
  if (photosDeleteError) {
    throw photosDeleteError;
  }
  await removeStoredAssets(
    client,
    [
      ...playerPhotos.flatMap((photo) => [photo.photoUrl, photo.thumbnailUrl]),
      ...answerUploads.flatMap((answer) => [answer.photoUrl, answer.thumbnailUrl]),
    ],
  ).catch(() => undefined);

  const { error } = await client
    .from("players")
    .update({
      question_order: questionOrder(content.questions),
      mission_order: missionOrder(content.missions),
      current_step_index: 0,
      total_score: 0,
      correct_answers: 0,
      photo_missions_completed: 0,
      new_people_met: 0,
      combo_streak: 0,
      completed: false,
      completed_at: null,
      updated_at: now,
      last_seen_at: now,
      last_rank: null,
    })
    .eq("id", playerId);

  if (error) {
    throw error;
  }

  const displayName = getPlayerDisplayName(player.name, player.participantType);

  await appendSupabaseEvent(client, {
    type: "admin_update",
    message: `הריצה של ${displayName} אופסה`,
    playerId,
    playerName: displayName,
  });

  return supabaseGetSession(playerId);
}

export async function supabaseAdjustPlayerPoints(input: AdjustPlayerPointsInput) {
  const client = getClient();
  const player = await fetchPlayer(client, input.playerId);
  const { error } = await client
    .from("players")
    .update({
      total_score: player.totalScore + input.delta,
      updated_at: getNowIso(),
    })
    .eq("id", input.playerId);

  if (error) {
    throw error;
  }

  const displayName = getPlayerDisplayName(player.name, player.participantType);

  await appendSupabaseEvent(client, {
    type: "admin_update",
    message: formatAdminActivityUpdateMessage(displayName),
    playerId: player.id,
    playerName: displayName,
  });

  return supabaseGetSession(input.playerId);
}

export async function supabaseModeratePhoto(input: PhotoModerationInput) {
  const client = getClient();
  const { data, error } = await client
    .from("photo_uploads")
    .select("*")
    .eq("id", input.photoId)
    .single();

  if (error) {
    throw error;
  }

  const photo = mapPhoto(data as Record<string, unknown>);

  if (input.action === "delete") {
    const { error: deleteError } = await client
      .from("photo_uploads")
      .delete()
      .eq("id", input.photoId);
    if (deleteError) {
      throw deleteError;
    }

    await removeStoredAssets(client, [photo.photoUrl, photo.thumbnailUrl]).catch(
      () => undefined,
    );
  } else {
    const { error: updateError } = await client
      .from("photo_uploads")
      .update({ hidden: input.action === "hide" })
      .eq("id", input.photoId);
    if (updateError) {
      throw updateError;
    }
  }

  await appendSupabaseEvent(client, {
    type: "admin_update",
    message: `בוצע עדכון ניהולי על תמונה מהמשימה "${photo.missionTitle}"`,
    playerId: photo.playerId,
    playerName: photo.playerName,
  });

  return photo;
}

export async function supabaseExportPlayersCsv() {
  const players = await supabaseGetLeaderboard();
  const rows = [
    ["מזהה", "שם", "ניקוד", "תשובות נכונות", "משימות צילום", "אנשים חדשים", "הושלם", "פעיל עכשיו"],
    ...players.map((entry) => [
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
