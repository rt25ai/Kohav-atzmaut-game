import type { GalleryEntry } from "@/lib/types";

export const EXTRA_GALLERY_MISSION_ID = "bonus-gallery";
export const EXTRA_GALLERY_MISSION_TITLE = "רגעים נוספים מהערב";

export type PhotoLightboxItem = {
  src: string;
  alt: string;
  title: string;
  caption?: string | null;
};

type PhotoLightboxSource = Pick<
  GalleryEntry,
  "photoUrl" | "missionTitle" | "caption" | "playerName"
>;

export function buildPhotoLightboxItem(
  photo: PhotoLightboxSource,
): PhotoLightboxItem {
  return {
    src: photo.photoUrl,
    alt: photo.missionTitle,
    title: `${photo.playerName} • ${photo.missionTitle}`,
    caption: photo.caption,
  };
}
