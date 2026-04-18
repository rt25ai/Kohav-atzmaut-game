"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { HERO_IMAGE } from "@/lib/config";

export function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        className="object-cover object-center opacity-[0.14] blur-[1px] saturate-[1.08]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,21,47,0.10),rgba(255,255,255,0.08)_18%,rgba(239,249,255,0.72)_60%,rgba(248,252,255,0.92)_100%)]" />
      <motion.div
        animate={{ opacity: [0.55, 0.8, 0.55], scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute right-[-8rem] top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(163,215,255,0.52),rgba(163,215,255,0.04)_70%)] blur-3xl"
      />
      <motion.div
        animate={{ opacity: [0.28, 0.5, 0.28], x: [0, 24, 0], y: [0, -14, 0] }}
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-[-6rem] top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.78),rgba(255,255,255,0.04)_70%)] blur-3xl"
      />
      <div className="soft-grid absolute inset-x-0 top-0 h-[42vh] opacity-[0.18]" />
    </div>
  );
}
