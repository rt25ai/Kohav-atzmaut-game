"use client";

import Image from "next/image";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import {
  LANDING_INTRO_ASSET_PATH,
  LANDING_INTRO_TOTAL_MS,
  getLandingIntroMotionPreset,
} from "@/lib/landing/intro-sequence";

type LandingIntroOverlayProps = {
  onComplete: () => void;
};

export type LandingIntroOverlayFrameProps = {
  reduceMotion: boolean;
};

const rays = [
  "rotate-0",
  "rotate-45",
  "rotate-90",
  "rotate-[135deg]",
] as const;

export function LandingIntroOverlayFrame({
  reduceMotion,
}: LandingIntroOverlayFrameProps) {
  const preset = getLandingIntroMotionPreset(reduceMotion);

  return (
    <motion.div
      aria-hidden="true"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      className="pointer-events-auto fixed inset-0 z-[80] overflow-hidden bg-[#030d22]"
      initial={preset.overlay.initial}
      animate={preset.overlay.animate}
      transition={preset.overlay.transition}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#07152f_0%,#030a18_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,248,214,0.12),transparent_28%)]" />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,243,182,0.78),rgba(255,243,182,0.08)_58%,transparent_72%)] blur-3xl sm:h-[24rem] sm:w-[24rem]"
        initial={preset.glow.initial}
        animate={preset.glow.animate}
        transition={preset.glow.transition}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2"
        initial={preset.rays.initial}
        animate={preset.rays.animate}
        transition={preset.rays.transition}
      >
        {rays.map((ray) => (
          <div
            key={ray}
            className={`absolute left-1/2 top-1/2 h-full w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,241,176,0),rgba(255,241,176,0.92),rgba(255,241,176,0))] ${ray}`}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffe7a6]/70 shadow-[0_0_45px_rgba(255,231,166,0.18)]"
        initial={preset.ring.initial}
        animate={preset.ring.animate}
        transition={preset.ring.transition}
      />

      <motion.div
        className="absolute inset-y-0 left-1/2 w-40 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.3),transparent)] blur-2xl"
        initial={preset.shimmer.initial}
        animate={preset.shimmer.animate}
        transition={preset.shimmer.transition}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[36px] border border-white/16 bg-white/8 p-5 shadow-[0_30px_120px_rgba(255,231,166,0.26)] backdrop-blur-md sm:h-48 sm:w-48"
        initial={preset.emblem.initial}
        animate={preset.emblem.animate}
        transition={preset.emblem.transition}
      >
        <Image
          src={LANDING_INTRO_ASSET_PATH}
          alt=""
          width={192}
          height={192}
          priority
          unoptimized
          className="h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(255,255,255,0.18)]"
        />
      </motion.div>
    </motion.div>
  );
}

export function LandingIntroOverlay({ onComplete }: LandingIntroOverlayProps) {
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const timeoutId = window.setTimeout(onComplete, LANDING_INTRO_TOTAL_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onComplete]);

  return <LandingIntroOverlayFrame reduceMotion={reduceMotion} />;
}
