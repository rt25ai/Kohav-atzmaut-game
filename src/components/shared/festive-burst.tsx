"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import type { FestiveCue } from "@/lib/game/festive-feedback";

type FestiveBurstProps = {
  cue: FestiveCue | null;
  scopeKey: string;
};

export function FestiveBurst({ cue, scopeKey }: FestiveBurstProps) {
  const [visibleCue, setVisibleCue] = useState<FestiveCue | null>(null);

  useEffect(() => {
    if (!cue) {
      return;
    }

    setVisibleCue(cue);
    const timeoutId = window.setTimeout(() => {
      setVisibleCue(null);
    }, 2_400);

    return () => window.clearTimeout(timeoutId);
  }, [cue]);

  const pieces = useMemo(
    () =>
      Array.from({ length: visibleCue?.showConfetti ? 18 : 0 }, (_, index) => ({
        id: `${scopeKey}-${index}`,
        delay: index * 0.03,
        rotate: -24 + index * 4,
        xStart: index % 2 === 0 ? -18 : 18,
        xEnd: index % 2 === 0 ? 28 : -28,
        left: `${6 + ((index * 5) % 88)}%`,
      })),
    [scopeKey, visibleCue?.showConfetti],
  );

  return (
    <AnimatePresence>
      {visibleCue ? (
        <motion.div
          key={`${scopeKey}-${visibleCue.copy}-${visibleCue.emojis.join("")}`}
          className="relative mt-4 overflow-visible pointer-events-none"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div
            data-festive-accent
            className="flex w-full max-w-[22rem] items-center justify-between gap-2 rounded-full border border-[#94dbff3d] px-4 py-3 text-[#f5fbff] shadow-[0_20px_44px_rgba(41,128,185,0.18)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(14, 42, 69, 0.94), rgba(8, 27, 47, 0.92))",
            }}
          >
            <span className="text-[0.92rem] font-semibold">{visibleCue.copy}</span>
            <span className="text-base tracking-[0.06em]">
              {visibleCue.emojis.join(" ")}
            </span>
          </div>

          {visibleCue.showConfetti ? (
            <div
              data-festive-confetti
              className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible"
              aria-hidden="true"
              style={{ height: "min(48svh, 22rem)" }}
            >
              {pieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  className="absolute top-0 rounded-[0.28rem] shadow-[0_12px_30px_rgba(31,105,214,0.26)]"
                  style={{
                    left: piece.left,
                    width: "1.2rem",
                    height: "0.85rem",
                    background:
                      "linear-gradient(180deg, #ffffff 0 23%, #2b75d6 23% 36%, #ffffff 36% 64%, #2b75d6 64% 77%, #ffffff 77% 100%)",
                  }}
                  initial={{
                    opacity: 0,
                    y: -8,
                    x: piece.xStart,
                    rotate: piece.rotate,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [0, 80, 180],
                    x: [piece.xStart, 0, piece.xEnd],
                  }}
                  transition={{
                    duration: 1.45,
                    delay: piece.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
