"use client";

import {
  STORAGE_PENDING_UPLOADS_KEY,
  STORAGE_SESSION_KEY,
  STORAGE_SOUND_KEY,
} from "@/lib/config";

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
