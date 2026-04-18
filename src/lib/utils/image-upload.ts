"use client";

import imageCompression from "browser-image-compression";

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(blob);
  });
}

export async function compressForUpload(file: File) {
  const full = await imageCompression(file, {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.82,
  });

  const thumb = await imageCompression(file, {
    maxSizeMB: 0.18,
    maxWidthOrHeight: 480,
    useWebWorker: true,
    initialQuality: 0.72,
  });

  const [photoUrl, thumbnailUrl] = await Promise.all([
    blobToDataUrl(full),
    blobToDataUrl(thumb),
  ]);

  return {
    photoUrl,
    thumbnailUrl,
  };
}
