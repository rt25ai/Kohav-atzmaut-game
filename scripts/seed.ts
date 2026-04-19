import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import {
  buildSeedAdminSettingsRow,
  buildSeedMissionRows,
  buildSeedQuestionRows,
} from "../src/lib/content/content-seed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function run() {
  const questions = buildSeedQuestionRows();
  const missions = buildSeedMissionRows();
  const questionIds = questions.map((question) => String(question.id));
  const missionIds = missions.map((mission) => String(mission.id));

  const [{ error: questionsError }, { error: missionsError }, { error: settingsError }] =
    await Promise.all([
      supabase.from("questions").upsert(questions, { onConflict: "id" }),
      supabase.from("photo_missions").upsert(missions, { onConflict: "id" }),
      supabase
        .from("admin_settings")
        .upsert(buildSeedAdminSettingsRow(), { onConflict: "id" }),
    ]);

  if (questionsError) {
    throw questionsError;
  }

  if (missionsError) {
    throw missionsError;
  }

  if (settingsError) {
    throw settingsError;
  }

  const [
    { data: existingQuestionRows, error: existingQuestionsError },
    { data: existingMissionRows, error: existingMissionsError },
  ] = await Promise.all([
    supabase.from("questions").select("id"),
    supabase.from("photo_missions").select("id"),
  ]);

  if (existingQuestionsError) {
    throw existingQuestionsError;
  }

  if (existingMissionsError) {
    throw existingMissionsError;
  }

  const staleQuestionIds = (existingQuestionRows ?? [])
    .map((row) => String(row.id))
    .filter((id) => !questionIds.includes(id));
  const staleMissionIds = (existingMissionRows ?? [])
    .map((row) => String(row.id))
    .filter((id) => !missionIds.includes(id));

  if (staleQuestionIds.length > 0) {
    const { error } = await supabase.from("questions").delete().in("id", staleQuestionIds);

    if (error) {
      throw error;
    }
  }

  if (staleMissionIds.length > 0) {
    const { error } = await supabase
      .from("photo_missions")
      .delete()
      .in("id", staleMissionIds);

    if (error) {
      throw error;
    }
  }

  const [
    { data: syncedQuestionRows, error: syncedQuestionsError },
    { data: syncedMissionRows, error: syncedMissionsError },
  ] = await Promise.all([
    supabase.from("questions").select("id").order("id", { ascending: true }),
    supabase.from("photo_missions").select("id").order("id", { ascending: true }),
  ]);

  if (syncedQuestionsError) {
    throw syncedQuestionsError;
  }

  if (syncedMissionsError) {
    throw syncedMissionsError;
  }

  assert.deepEqual(
    (syncedQuestionRows ?? []).map((row) => String(row.id)),
    [...questionIds].sort(),
    "Questions table did not match the seeded question ids after sync",
  );
  assert.deepEqual(
    (syncedMissionRows ?? []).map((row) => String(row.id)),
    [...missionIds].sort(),
    "Photo missions table did not match the seeded mission ids after sync",
  );

  console.log("Seed completed:");
  console.log(`- ${questions.length} questions`);
  console.log(`- ${missions.length} photo missions`);
  console.log(`- ${staleQuestionIds.length} stale questions removed`);
  console.log(`- ${staleMissionIds.length} stale photo missions removed`);
  console.log("- admin settings row");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
