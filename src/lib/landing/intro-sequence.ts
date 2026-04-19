export const LANDING_INTRO_ASSET_PATH = "/branding/landing-intro-hf-20260418.png";
export const LANDING_INTRO_TOTAL_MS = 2_000;

export const LANDING_INTRO_TIMELINE = {
  glow: { delayMs: 0, durationMs: 450 },
  emblem: { delayMs: 250, durationMs: 1_000 },
  hold: { delayMs: 1_250, durationMs: 400 },
  exit: { delayMs: 1_650, durationMs: 350 },
} as const;

const CEREMONIAL_EASE: [number, number, number, number] = [0.18, 0.72, 0.18, 1];
const STANDARD_TIMES: [number, number, number, number] = [0, 0.24, 0.78, 1];
const REDUCED_TIMES: [number, number, number, number] = [0, 0.18, 0.8, 1];

export type LandingIntroStage =
  | "build"
  | "reveal"
  | "hold"
  | "exit"
  | "complete";

export function getLandingIntroStage(elapsedMs: number): LandingIntroStage {
  if (elapsedMs < LANDING_INTRO_TIMELINE.emblem.delayMs) {
    return "build";
  }

  if (elapsedMs < LANDING_INTRO_TIMELINE.hold.delayMs) {
    return "reveal";
  }

  if (elapsedMs < LANDING_INTRO_TIMELINE.exit.delayMs) {
    return "hold";
  }

  if (elapsedMs < LANDING_INTRO_TOTAL_MS) {
    return "exit";
  }

  return "complete";
}

export function getLandingHeroReveal(showIntro: boolean) {
  return showIntro ? { opacity: 0, y: 28 } : { opacity: 1, y: 0 };
}

export function getLandingIntroMotionPreset(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      overlay: {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 0, y: -12 },
        transition: {
          delay: LANDING_INTRO_TIMELINE.exit.delayMs / 1000,
          duration: LANDING_INTRO_TIMELINE.exit.durationMs / 1000,
          ease: "easeOut" as const,
        },
      },
      glow: {
        initial: { opacity: 0.36, scale: 0.96 },
        animate: { opacity: 0, scale: 1.04 },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          ease: "easeOut" as const,
        },
      },
      ring: {
        initial: { opacity: 0.48, scale: 0.92 },
        animate: { opacity: 0, scale: 1.06 },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          ease: "easeOut" as const,
        },
      },
      rays: {
        initial: { opacity: 0.18, scale: 0.92 },
        animate: { opacity: 0, scale: 1.04 },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          ease: "easeOut" as const,
        },
      },
      emblem: {
        initial: { opacity: 0, scale: 0.96, y: 16 },
        animate: {
          opacity: [0, 1, 1, 0],
          scale: [0.96, 1, 1, 1],
          y: [16, 0, 0, -12],
        },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          times: REDUCED_TIMES,
          ease: "easeOut" as const,
        },
      },
      shimmer: {
        initial: { opacity: 0, x: "-30%" },
        animate: { opacity: [0, 0.22, 0], x: ["-30%", "10%", "42%"] },
        transition: {
          duration: LANDING_INTRO_TOTAL_MS / 1000,
          times: REDUCED_TIMES,
          ease: "easeOut" as const,
        },
      },
    };
  }

  return {
    overlay: {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 0, y: -32 },
      transition: {
        delay: LANDING_INTRO_TIMELINE.exit.delayMs / 1000,
        duration: LANDING_INTRO_TIMELINE.exit.durationMs / 1000,
        ease: CEREMONIAL_EASE,
      },
    },
    glow: {
      initial: { opacity: 0, scale: 0.42 },
      animate: {
        opacity: [0, 1, 0.82, 0],
        scale: [0.42, 1, 1.06, 1.18],
      },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: STANDARD_TIMES,
        ease: CEREMONIAL_EASE,
      },
    },
    ring: {
      initial: { opacity: 0, scale: 0.2 },
      animate: {
        opacity: [0, 0.88, 0],
        scale: [0.2, 1, 1.26],
      },
      transition: {
        duration: 1.2,
        ease: CEREMONIAL_EASE,
      },
    },
    rays: {
      initial: { opacity: 0, scale: 0.68 },
      animate: {
        opacity: [0, 0.56, 0.14, 0],
        scale: [0.68, 1, 1.08, 1.16],
      },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: STANDARD_TIMES,
        ease: CEREMONIAL_EASE,
      },
    },
    emblem: {
      initial: {
        opacity: 0,
        scale: 0.24,
        rotate: -14,
        filter: "blur(18px)",
        y: 24,
      },
      animate: {
        opacity: [0, 1, 1, 0],
        scale: [0.24, 1.08, 0.98, 0.66],
        rotate: [-14, 4, 0, 0],
        filter: ["blur(18px)", "blur(0px)", "blur(0px)", "blur(0px)"],
        y: [24, 0, 0, -40],
      },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: STANDARD_TIMES,
        ease: CEREMONIAL_EASE,
      },
    },
    shimmer: {
      initial: { opacity: 0, x: "-40%" },
      animate: { opacity: [0, 0.34, 0], x: ["-40%", "8%", "58%"] },
      transition: {
        duration: LANDING_INTRO_TOTAL_MS / 1000,
        times: STANDARD_TIMES,
        ease: CEREMONIAL_EASE,
      },
    },
  };
}
