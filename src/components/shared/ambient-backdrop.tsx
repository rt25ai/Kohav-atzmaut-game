"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import {
  FESTIVE_GLOW_OVERLAY,
  RESULTS_CELEBRATION_OVERLAY,
  STAGE_HERO_IMAGE,
} from "@/lib/config";

export function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#071427_0%,#091a31_42%,#071325_100%)] sm:hidden" />
      <Image
        src={STAGE_HERO_IMAGE}
        alt=""
        fill
        priority
        className="hidden object-cover object-center opacity-[0.34] saturate-[1.05] sm:block"
      />
      <Image
        src={FESTIVE_GLOW_OVERLAY}
        alt=""
        fill
        className="hidden object-cover object-center opacity-[0.3] mix-blend-screen sm:block"
      />
      <Image
        src={RESULTS_CELEBRATION_OVERLAY}
        alt=""
        fill
        className="hidden object-cover object-center opacity-[0.08] mix-blend-screen sm:block"
      />
      <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(2,9,18,0.42),rgba(4,15,28,0.48)_28%,rgba(5,14,28,0.72)_68%,rgba(3,11,22,0.94)_100%)] sm:block" />
      <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_top,rgba(89,182,255,0.16),transparent_28%),radial-gradient(circle_at_20%_20%,rgba(255,219,140,0.08),transparent_18%)] sm:block" />

      <motion.div
        animate={{ opacity: [0.18, 0.34, 0.18], x: [0, 18, 0], y: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-[-10rem] top-24 hidden h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(102,191,255,0.46),rgba(102,191,255,0.04)_72%)] blur-3xl sm:block"
      />
      <motion.div
        animate={{ opacity: [0.12, 0.26, 0.12], x: [0, -24, 0], y: [0, 18, 0] }}
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute right-[-8rem] top-10 hidden h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,216,138,0.22),rgba(255,216,138,0.02)_70%)] blur-3xl sm:block"
      />
      <motion.div
        animate={{ opacity: [0.05, 0.12, 0.05], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute inset-x-[18%] top-0 hidden h-72 bg-[radial-gradient(circle,rgba(255,255,255,0.34),transparent_60%)] blur-3xl sm:block"
      />
      <div className="soft-grid absolute inset-x-0 top-0 hidden h-[34vh] opacity-[0.2] sm:block" />
    </div>
  );
}
