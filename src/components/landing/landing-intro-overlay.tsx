"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import {
  LANDING_INTRO_ASSET_PATH,
  LANDING_INTRO_TOTAL_MS,
  getLandingIntroMotionPreset,
} from "@/lib/landing/intro-sequence";
import {
  FESTIVE_GLOW_OVERLAY,
  RESULTS_CELEBRATION_OVERLAY,
} from "@/lib/config";

type LandingIntroOverlayProps = {
  onComplete: () => void;
};

export type LandingIntroOverlayFrameProps = {
  reduceMotion: boolean;
};

const rays = ["rotate-0", "rotate-45", "rotate-90", "rotate-[135deg]"] as const;

export function LandingIntroOverlayFrame({
  reduceMotion,
}: LandingIntroOverlayFrameProps) {
  const preset = getLandingIntroMotionPreset(reduceMotion);

  return (
    <motion.div
      aria-hidden="true"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      className="pointer-events-auto fixed inset-0 z-[80] overflow-hidden bg-[#030c18]"
      initial={preset.overlay.initial}
      animate={preset.overlay.animate}
      transition={preset.overlay.transition}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#030d1b_0%,#071429_46%,#020811_100%)]" />
      <Image
        src={FESTIVE_GLOW_OVERLAY}
        alt=""
        fill
        className="object-cover opacity-[0.32] mix-blend-screen"
      />
      <Image
        src={RESULTS_CELEBRATION_OVERLAY}
        alt=""
        fill
        className="object-cover opacity-[0.18] mix-blend-screen"
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,215,255,0.7),rgba(122,215,255,0.08)_58%,transparent_72%)] blur-3xl sm:h-[28rem] sm:w-[28rem]"
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
            className={`absolute left-1/2 top-1/2 h-full w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,246,219,0),rgba(255,246,219,0.92),rgba(255,246,219,0))] ${ray}`}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-1/2 h-[23rem] w-[23rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#bde9ff]/30 shadow-[0_0_65px_rgba(122,215,255,0.2)]"
        initial={preset.ring.initial}
        animate={preset.ring.animate}
        transition={preset.ring.transition}
      />

      <motion.div
        className="absolute inset-y-0 left-1/2 w-40 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.38),transparent)] blur-2xl"
        initial={preset.shimmer.initial}
        animate={preset.shimmer.animate}
        transition={preset.shimmer.transition}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[40px] border border-white/14 bg-white/8 p-5 shadow-[0_30px_120px_rgba(74,176,255,0.24)] backdrop-blur-md sm:h-52 sm:w-52"
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
