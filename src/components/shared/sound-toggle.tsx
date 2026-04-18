"use client";

import { Volume2, VolumeOff } from "lucide-react";

import { useSound } from "@/components/shared/sound-provider";
import { cn } from "@/lib/utils/cn";

export function SoundToggle() {
  const { soundEnabled, globalSoundEnabled, toggleSound, play } = useSound();
  const interactive = globalSoundEnabled;

  return (
    <button
      type="button"
      onClick={() => {
        play("click");
        if (interactive) {
          toggleSound();
        }
      }}
      className={cn(
        "hero-button-secondary inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-main)] transition-transform hover:scale-[1.04]",
        !interactive && "cursor-not-allowed opacity-60",
      )}
      aria-label={soundEnabled ? "השתק צליל" : "הפעל צליל"}
      title={interactive ? "צליל" : "הצליל כבוי גלובלית"}
    >
      {soundEnabled && interactive ? <Volume2 size={18} /> : <VolumeOff size={18} />}
    </button>
  );
}
