import { Buffer } from "node:buffer";

import JSZip from "jszip";
import { NextResponse } from "next/server";

import {
  ARCHIVE_MANIFEST_FILENAME,
  buildPhotoArchiveEntries,
  buildPhotoArchiveManifestCsv,
} from "@/lib/admin/photo-archive";
import { isAdminAuthorized } from "@/lib/auth/admin";
import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readPhotoBuffer(photoUrl: string) {
  if (photoUrl.startsWith("data:")) {
    const match = photoUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error("Unsupported data URL");
    }

    return Buffer.from(match[2], "base64");
  }

  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${photoUrl}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const snapshot = await repository.getAdminSnapshot();
  const entries = buildPhotoArchiveEntries(snapshot.photos);
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.filename, await readPhotoBuffer(entry.photoUrl));
  }

  zip.file(ARCHIVE_MANIFEST_FILENAME, buildPhotoArchiveManifestCsv(entries));

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="kochav-michael-photos.zip"',
      "Cache-Control": "no-store",
    },
  });
}
