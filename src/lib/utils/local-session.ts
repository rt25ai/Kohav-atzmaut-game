"use client";

import {
  STORAGE_PENDING_UPLOADS_KEY,
  STORAGE_SESSION_KEY,
  STORAGE_SESSION_SNAPSHOT_KEY,
  STORAGE_SOUND_KEY,
} from "@/lib/config";
import type { SessionSnapshot } from "@/lib/types";

export type PendingUpload = {
  id: string;
  playerId: string;
  missionId: string;
  stepIndex: number;
  caption: string;
  newPeopleMet: number;
  photoUrl: string;
  thumbnailUrl: string | null;
};

export function getStoredPlayerId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_SESSION_KEY);
}

export function setStoredPlayerId(playerId: string) {
  window.localStorage.setItem(STORAGE_SESSION_KEY, playerId);
}

export function clearStoredPlayerId() {
  window.localStorage.removeItem(STORAGE_SESSION_KEY);
}

export function getStoredSessionSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_SESSION_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function setStoredSessionSnapshot(session: SessionSnapshot) {
  window.localStorage.setItem(
    STORAGE_SESSION_SNAPSHOT_KEY,
    JSON.stringify(session),
  );
}

export function clearStoredSessionSnapshot() {
  window.localStorage.removeItem(STORAGE_SESSION_SNAPSHOT_KEY);
}

export function clearStoredActiveGame(playerId?: string | null) {
  clearStoredPlayerId();
  clearStoredSessionSnapshot();

  if (playerId) {
    clearPendingUploadsForPlayer(playerId);
  }
}

export function getStoredSoundEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  const raw = window.localStorage.getItem(STORAGE_SOUND_KEY);
  return raw === null ? true : raw === "true";
}

export function setStoredSoundEnabled(value: boolean) {
  window.localStorage.setItem(STORAGE_SOUND_KEY, String(value));
}

export function getPendingUploads(): PendingUpload[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_PENDING_UPLOADS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as PendingUpload[];
  } catch {
    return [];
  }
}

export function setPendingUploads(items: PendingUpload[]) {
  window.localStorage.setItem(STORAGE_PENDING_UPLOADS_KEY, JSON.stringify(items));
}

export function clearPendingUploadsForPlayer(playerId: string) {
  const current = getPendingUploads();
  setPendingUploads(current.filter((item) => item.playerId !== playerId));
}
