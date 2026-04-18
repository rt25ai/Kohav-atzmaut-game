"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Images } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Lightbox, type LightboxItem } from "@/components/shared/lightbox";
import { useSound } from "@/components/shared/sound-provider";
import { useLiveJson } from "@/hooks/use-live-json";
import { buildPhotoLightboxItem } from "@/lib/game/photo-gallery";
import { buildGalleryGroups } from "@/lib/game/player-experience";
import type { GalleryEntry } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";

type GalleryPageProps = {
  initialPhotos: GalleryEntry[];
};

export function GalleryPage({ initialPhotos }: GalleryPageProps) {
  const { play } = useSound();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data } = useLiveJson("/api/public/gallery", {
    initialData: { photos: initialPhotos },
    tables: ["photo_uploads"],
  });

  const groups = useMemo(() => buildGalleryGroups(data.photos), [data.photos]);
  const selectedGroup =
    groups.find((group) => group.playerId === selectedPlayerId) ?? null;
  const lightboxItems: LightboxItem[] = selectedGroup
    ? selectedGroup.photos.map((photo) => buildPhotoLightboxItem(photo))
    : [];

  useEffect(() => {
    play("gallery");
  }, [play]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#5c7ca2]">הגלריה החיה של הערב</p>
            <h1 className="font-display text-3xl text-[#0f254a]">רגעים מהקהילה</h1>
          </div>
          <div className="rounded-full bg-[#edf6ff] px-4 py-2 text-sm text-[#0f61d8]">
            {data.photos.length} תמונות באוויר
          </div>
        </div>
      </section>

      <section className="gallery-player-grid">
        {groups.map((group, index) => (
          <motion.button
            key={group.playerId}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.35 }}
            onClick={() => {
              play("photo");
              setSelectedPlayerId(group.playerId);
              setSelectedIndex(0);
            }}
            className="glass-panel overflow-hidden rounded-[24px] text-right"
          >
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={group.cover.thumbnailUrl || group.cover.photoUrl}
                alt={group.cover.missionTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(8,30,60,0.82))] px-3 pb-3 pt-8 text-white">
                <p className="font-medium">{group.playerName}</p>
                <p className="text-xs text-white/78">
                  {group.photos.length} תמונות • עודכן {formatRelativeTime(group.latestCreatedAt)}
                </p>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#edf6ff] px-3 py-1 text-xs text-[#0f61d8]">
                  {group.cover.missionTitle}
                </span>
                <span className="text-xs text-[#6b89ad]">לחצו לכל האלבום</span>
              </div>
              {group.cover.caption ? (
                <p className="line-clamp-2 text-sm text-[#59779e]">{group.cover.caption}</p>
              ) : null}
            </div>
          </motion.button>
        ))}
      </section>

      {groups.length === 0 ? (
        <div className="glass-panel rounded-[30px] p-10 text-center">
          <Images className="mx-auto text-[#0f61d8]" size={32} />
          <p className="mt-3 text-[#547198]">עוד מעט התמונות הראשונות יגיעו לכאן.</p>
        </div>
      ) : null}

      <Lightbox
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedPlayerId(null)}
        items={lightboxItems}
        initialIndex={selectedIndex}
      />
    </div>
  );
}
