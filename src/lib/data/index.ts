import { IS_SUPABASE_ENABLED } from "@/lib/config";
import {
  localActivateHostAnnouncementNow,
  localAdjustPlayerPoints,
  localCancelHostAnnouncement,
  localCreateHostAnnouncement,
  localDeleteHostAnnouncement,
  localExportPlayersCsv,
  localGetAdminSnapshot,
  localGetGallery,
  localGetLeaderboard,
  localGetPublicSnapshot,
  localGetSurveyRuntime,
  localGetSession,
  localGetSummary,
  localGetSurveyResults,
  localHeartbeat,
  localModeratePhoto,
  localPublishFinalSurveyResults,
  localReopenSurveyToLive,
  localResetPlayer,
  localStopHostAnnouncementNow,
  localStartGame,
  localSubmitExtraPhoto,
  localSubmitAnswer,
  localSubmitMission,
  localUpdateSettings,
} from "@/lib/data/local-repository";
import {
  supabaseActivateHostAnnouncementNow,
  supabaseAdjustPlayerPoints,
  supabaseCancelHostAnnouncement,
  supabaseCreateHostAnnouncement,
  supabaseDeleteHostAnnouncement,
  supabaseExportPlayersCsv,
  supabaseGetAdminSnapshot,
  supabaseGetGallery,
  supabaseGetLeaderboard,
  supabaseGetPublicSnapshot,
  supabaseGetSurveyRuntime,
  supabaseGetSession,
  supabaseGetSummary,
  supabaseGetSurveyResults,
  supabaseHeartbeat,
  supabaseModeratePhoto,
  supabasePublishFinalSurveyResults,
  supabaseReopenSurveyToLive,
  supabaseResetPlayer,
  supabaseStopHostAnnouncementNow,
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
  getSurveyRuntime: IS_SUPABASE_ENABLED
    ? supabaseGetSurveyRuntime
    : localGetSurveyRuntime,
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
  publishFinalSurveyResults: IS_SUPABASE_ENABLED
    ? supabasePublishFinalSurveyResults
    : localPublishFinalSurveyResults,
  reopenSurveyToLive: IS_SUPABASE_ENABLED
    ? supabaseReopenSurveyToLive
    : localReopenSurveyToLive,
  updateSettings: IS_SUPABASE_ENABLED ? supabaseUpdateSettings : localUpdateSettings,
  createHostAnnouncement: IS_SUPABASE_ENABLED
    ? supabaseCreateHostAnnouncement
    : localCreateHostAnnouncement,
  activateHostAnnouncementNow: IS_SUPABASE_ENABLED
    ? supabaseActivateHostAnnouncementNow
    : localActivateHostAnnouncementNow,
  stopHostAnnouncementNow: IS_SUPABASE_ENABLED
    ? supabaseStopHostAnnouncementNow
    : localStopHostAnnouncementNow,
  cancelHostAnnouncement: IS_SUPABASE_ENABLED
    ? supabaseCancelHostAnnouncement
    : localCancelHostAnnouncement,
  deleteHostAnnouncement: IS_SUPABASE_ENABLED
    ? supabaseDeleteHostAnnouncement
    : localDeleteHostAnnouncement,
  resetPlayer: IS_SUPABASE_ENABLED ? supabaseResetPlayer : localResetPlayer,
  adjustPlayerPoints: IS_SUPABASE_ENABLED
    ? supabaseAdjustPlayerPoints
    : localAdjustPlayerPoints,
  moderatePhoto: IS_SUPABASE_ENABLED ? supabaseModeratePhoto : localModeratePhoto,
  exportPlayersCsv: IS_SUPABASE_ENABLED
    ? supabaseExportPlayersCsv
    : localExportPlayersCsv,
};
