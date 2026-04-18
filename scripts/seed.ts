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

  console.log("Seed completed:");
  console.log(`- ${questions.length} questions`);
  console.log(`- ${missions.length} photo missions`);
  console.log("- admin settings row");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
