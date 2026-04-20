"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Camera, Images, Radio, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

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

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("he");
}

export function GalleryPage({ initialPhotos }: GalleryPageProps) {
  const { play } = useSound();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data } = useLiveJson("/api/public/gallery", {
    initialData: { photos: initialPhotos },
    tables: ["photo_uploads"],
  });

  const groups = useMemo(() => buildGalleryGroups(data.photos), [data.photos]);
  const normalizedQuery = normalizeSearchValue(deferredSearch);
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }

    return groups.filter((group) =>
      normalizeSearchValue(group.playerName).includes(normalizedQuery),
    );
  }, [groups, normalizedQuery]);

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">
              <Camera size={14} />
              קיר הרגעים החי של הערב
            </div>
            <h1 className="mt-4 font-display text-4xl text-white">
              רגעים מהקהילה
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
              כל משתתף מקבל כאן אלבום קטן משלו. אפשר לחפש לפי שם, לפתוח את
              הגלריה של כל משתתף, ולדפדף בנוחות בין כל התמונות שעלו מהאירוע.
            </p>
          </div>
          <div className="broadcast-chip on-air-chip">
            <span className="on-air-dot" aria-hidden="true" />
            <Radio size={14} />
            {data.photos.length} תמונות באוויר
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <label className="mb-2 block text-sm text-[var(--text-soft)]">
            חיפוש משתתף בגלריה
          </label>
          <div className="hero-input flex h-14 items-center gap-3 rounded-[22px] px-4">
            <Search size={18} className="text-[#5d7ca2]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="חפשו לפי שם פרטי או שם משפחה..."
              className="h-full w-full bg-transparent text-right text-[#0b2546] outline-none placeholder:text-[#6a87a5]"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            לדוגמה: טל, משפחת טל, רועי
          </p>
        </div>
      </section>

      {groups.length > 0 ? (
        filteredGroups.length > 0 ? (
          <section className="gallery-player-grid">
            {filteredGroups.map((group, index) => (
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
                className="gallery-player-tile group text-right"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={group.cover.thumbnailUrl || group.cover.photoUrl}
                    alt={group.cover.missionTitle}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(2,10,18,0.94))]" />
                  <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pt-4 sm:px-3 sm:pb-3 sm:pt-8">
                    <p className="line-clamp-1 font-display text-[11px] leading-tight text-white sm:text-lg">
                      {group.playerName}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[var(--text-soft)] sm:text-xs">
                      {group.photos.length} תמונות
                    </p>
                  </div>
                </div>

                <div className="hidden space-y-2 p-3 sm:block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-[var(--text-soft)]">
                      {group.cover.missionTitle}
                    </span>
                    <span className="text-[10px] text-[var(--text-dim)]">
                      לאלבום
                    </span>
                  </div>
                  {group.cover.caption ? (
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--text-soft)]">
                      {group.cover.caption}
                    </p>
                  ) : null}
                </div>
              </motion.button>
            ))}
          </section>
        ) : (
          <div className="stage-panel rounded-[30px] p-10 text-center">
            <Images className="mx-auto text-[#80d4ff]" size={32} />
            <p className="mt-3 text-[var(--text-soft)]">
              לא מצאנו משתתף שמתאים לחיפוש `{search}`.
            </p>
          </div>
        )
      ) : (
        <div className="stage-panel rounded-[30px] p-10 text-center">
          <Images className="mx-auto text-[#80d4ff]" size={32} />
          <p className="mt-3 text-[var(--text-soft)]">
            עוד מעט התמונות הראשונות יגיעו לכאן.
          </p>
        </div>
      )}

      <Lightbox
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedPlayerId(null)}
        items={lightboxItems}
        initialIndex={selectedIndex}
      />
    </div>
  );
}
