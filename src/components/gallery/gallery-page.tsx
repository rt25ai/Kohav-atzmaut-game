"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Camera, Images, Radio } from "lucide-react";
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
      <section className="stage-panel rounded-[36px] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="section-kicker">
              <Camera size={14} />
              קיר הרגעים החי של הערב
            </div>
            <h1 className="mt-4 font-display text-4xl text-white">
              רגעים מהקהילה
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
              כל משימת צילום הופכת כאן לחלון קטן של ערב העצמאות בכוכב מיכאל.
              התמונות עולות מהשטח ונשמרות כמו קיר אירוע חי.
            </p>
          </div>
          <div className="broadcast-chip">
            <Radio size={14} />
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
            transition={{ delay: index * 0.03, duration: 0.35 }}
            onClick={() => {
              play("photo");
              setSelectedPlayerId(group.playerId);
              setSelectedIndex(0);
            }}
            className="stage-panel group overflow-hidden rounded-[28px] text-right"
          >
            <div className="relative aspect-[1.03] overflow-hidden">
              <Image
                src={group.cover.thumbnailUrl || group.cover.photoUrl}
                alt={group.cover.missionTitle}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,10,18,0.92))]" />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
                <p className="font-display text-2xl text-white">{group.playerName}</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {group.photos.length} תמונות • עודכן {formatRelativeTime(group.latestCreatedAt)}
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-[var(--text-soft)]">
                  {group.cover.missionTitle}
                </span>
                <span className="text-xs text-[var(--text-dim)]">לחצו לאלבום המלא</span>
              </div>
              {group.cover.caption ? (
                <p className="line-clamp-2 text-sm leading-6 text-[var(--text-soft)]">
                  {group.cover.caption}
                </p>
              ) : null}
            </div>
          </motion.button>
        ))}
      </section>

      {groups.length === 0 ? (
        <div className="stage-panel rounded-[30px] p-10 text-center">
          <Images className="mx-auto text-[#80d4ff]" size={32} />
          <p className="mt-3 text-[var(--text-soft)]">
            עוד מעט התמונות הראשונות יגיעו לכאן.
          </p>
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
