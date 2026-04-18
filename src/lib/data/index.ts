import { IS_SUPABASE_ENABLED } from "@/lib/config";
import {
  localAdjustPlayerPoints,
  localExportPlayersCsv,
  localGetAdminSnapshot,
  localGetGallery,
  localGetLeaderboard,
  localGetPublicSnapshot,
  localGetSession,
  localGetSummary,
  localGetSurveyResults,
  localHeartbeat,
  localModeratePhoto,
  localResetPlayer,
  localStartGame,
  localSubmitExtraPhoto,
  localSubmitAnswer,
  localSubmitMission,
  localUpdateSettings,
} from "@/lib/data/local-repository";
import {
  supabaseAdjustPlayerPoints,
  supabaseExportPlayersCsv,
  supabaseGetAdminSnapshot,
  supabaseGetGallery,
  supabaseGetLeaderboard,
  supabaseGetPublicSnapshot,
  supabaseGetSession,
  supabaseGetSummary,
  supabaseGetSurveyResults,
  supabaseHeartbeat,
  supabaseModeratePhoto,
  supabaseResetPlayer,
  supabaseStartGame,
  supabaseSubmitExtraPhoto,
  supabaseSubmitAnswer,
  supabaseSubmitMission,
  supabaseUpdateSettings,
} from "@/lib/data/supabase-repository";

export const repository = {
  startGame: IS_SUPABASE_ENABLED ? supabaseStartGame : localStartGame,
  heartbeat: IS_SUPABASE_ENABLED ? supabaseHeartbeat : localHeartbeat,
  getSession: IS_SUPABASE_ENABLED ? supabaseGetSession : localGetSession,
  getSummary: IS_SUPABASE_ENABLED ? supabaseGetSummary : localGetSummary,
  getSurveyResults: IS_SUPABASE_ENABLED
    ? supabaseGetSurveyResults
    : localGetSurveyResults,
  getPublicSnapshot: IS_SUPABASE_ENABLED
    ? supabaseGetPublicSnapshot
    : localGetPublicSnapshot,
  getGallery: IS_SUPABASE_ENABLED ? supabaseGetGallery : localGetGallery,
  getLeaderboard: IS_SUPABASE_ENABLED ? supabaseGetLeaderboard : localGetLeaderboard,
  submitAnswer: IS_SUPABASE_ENABLED ? supabaseSubmitAnswer : localSubmitAnswer,
  submitMission: IS_SUPABASE_ENABLED ? supabaseSubmitMission : localSubmitMission,
  submitExtraPhoto: IS_SUPABASE_ENABLED
    ? supabaseSubmitExtraPhoto
    : localSubmitExtraPhoto,
  getAdminSnapshot: IS_SUPABASE_ENABLED
    ? supabaseGetAdminSnapshot
    : localGetAdminSnapshot,
  updateSettings: IS_SUPABASE_ENABLED ? supabaseUpdateSettings : localUpdateSettings,
  resetPlayer: IS_SUPABASE_ENABLED ? supabaseResetPlayer : localResetPlayer,
  adjustPlayerPoints: IS_SUPABASE_ENABLED
    ? supabaseAdjustPlayerPoints
    : localAdjustPlayerPoints,
  moderatePhoto: IS_SUPABASE_ENABLED ? supabaseModeratePhoto : localModeratePhoto,
  exportPlayersCsv: IS_SUPABASE_ENABLED
    ? supabaseExportPlayersCsv
    : localExportPlayersCsv,
};
