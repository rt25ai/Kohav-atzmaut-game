export const APP_NAME = "כוכב של עצמאות";
export const APP_SHORT_NAME = "משחק העצמאות של כוכב מיכאל";
export const STORAGE_SESSION_KEY = "kochav-michael-active-player";
export const STORAGE_SOUND_KEY = "kochav-michael-sound-enabled";
export const STORAGE_PENDING_UPLOADS_KEY = "kochav-michael-pending-uploads";

export const HEARTBEAT_INTERVAL_MS = 20_000;
export const ACTIVE_PLAYER_WINDOW_MS = 90_000;
export const SNAPSHOT_POLL_MS = 12_000;

export const ADMIN_ROUTE_SEGMENT =
  process.env.ADMIN_ROUTE_SEGMENT || "admin-secret-route";
export const ADMIN_COOKIE_NAME = "kochav_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 10;

export const DEFAULT_PUBLIC_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const IS_SUPABASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const HERO_IMAGE = "/branding/hero.png";
export const LOGO_IMAGE = "/branding/kochav-logo-transparent.png";
export const FLAG_IMAGE = "/branding/israel-flag-cropped.png";
