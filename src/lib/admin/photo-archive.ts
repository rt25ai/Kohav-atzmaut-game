import type { PhotoUploadRecord } from "@/lib/types";

export const ARCHIVE_MANIFEST_FILENAME = "manifest.csv";

export type PhotoArchiveEntry = PhotoUploadRecord & {
  extension: string;
  filename: string;
};

function normalizeArchiveSegment(value: string) {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || "photo";
}

function inferArchiveExtension(photoUrl: string) {
  if (photoUrl.startsWith("data:image/png")) {
    return "png";
  }

  if (photoUrl.startsWith("data:image/webp")) {
    return "webp";
  }

  if (photoUrl.startsWith("data:image/jpeg") || photoUrl.startsWith("data:image/jpg")) {
    return "jpg";
  }

  try {
    const pathname = new URL(photoUrl).pathname.toLowerCase();

    if (pathname.endsWith(".png")) {
      return "png";
    }

    if (pathname.endsWith(".webp")) {
      return "webp";
    }

    if (pathname.endsWith(".jpeg") || pathname.endsWith(".jpg")) {
      return "jpg";
    }
  } catch {
    return "jpg";
  }

  return "jpg";
}

function quoteCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildPhotoArchiveEntries(
  photos: PhotoUploadRecord[],
): PhotoArchiveEntry[] {
  return photos.map((photo, index) => {
    const extension = inferArchiveExtension(photo.photoUrl);
    const filename = [
      String(index + 1).padStart(3, "0"),
      normalizeArchiveSegment(photo.playerName),
      normalizeArchiveSegment(photo.missionTitle),
      normalizeArchiveSegment(photo.id),
    ].join("_");

    return {
      ...photo,
      extension,
      filename: `${filename}.${extension}`,
    };
  });
}

export function buildPhotoArchiveManifestCsv(entries: PhotoArchiveEntry[]) {
  const header = [
    "filename",
    "player_name",
    "mission_title",
    "caption",
    "created_at",
    "hidden",
  ].join(",");

  const rows = entries.map((entry) =>
    [
      entry.filename,
      entry.playerName,
      entry.missionTitle,
      entry.caption ?? "",
      entry.createdAt,
      String(entry.hidden),
    ]
      .map(quoteCsvField)
      .join(","),
  );

  return `${header}\n${rows.join("\n")}\n`;
}
