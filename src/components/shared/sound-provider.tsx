"use client";

import { Howler } from "howler";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getHowl,
  SOUND_NAMES,
  type SoundName,
} from "@/lib/sound/generated-sfx";
import {
  getStoredSoundEnabled,
  setStoredSoundEnabled,
} from "@/lib/utils/local-session";

type SoundContextValue = {
  soundEnabled: boolean;
  globalSoundEnabled: boolean;
  setGlobalSoundEnabled: (value: boolean) => void;
  toggleSound: () => void;
  play: (name: SoundName) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [globalSoundEnabled, setGlobalSoundEnabledState] = useState(true);
  const audioPrimedRef = useRef(false);

  useEffect(() => {
    setSoundEnabled(getStoredSoundEnabled());
  }, []);

  useEffect(() => {
    const primeAudio = () => {
      if (Howler.ctx?.state === "suspended") {
        void Howler.ctx.resume().catch(() => undefined);
      }

      if (audioPrimedRef.current) {
        return;
      }

      audioPrimedRef.current = true;
      for (const soundName of SOUND_NAMES) {
        const howl = getHowl(soundName);
        if (howl.state() === "unloaded") {
          howl.load();
        }
      }
    };

    window.addEventListener("pointerdown", primeAudio, { passive: true });
    window.addEventListener("keydown", primeAudio);

    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      soundEnabled,
      globalSoundEnabled,
      setGlobalSoundEnabled: (value) => setGlobalSoundEnabledState(value),
      toggleSound: () => {
        startTransition(() => {
          setSoundEnabled((current) => {
            const next = !current;
            setStoredSoundEnabled(next);
            return next;
          });
        });
      },
      play: (name) => {
        if (!soundEnabled || !globalSoundEnabled) {
          return;
        }

        if (Howler.ctx?.state === "suspended") {
          void Howler.ctx.resume().catch(() => undefined);
        }

        const howl = getHowl(name);
        if (howl.state() === "unloaded") {
          howl.load();
        }

        audioPrimedRef.current = true;
        howl.play();
      },
    }),
    [globalSoundEnabled, soundEnabled],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used inside SoundProvider");
  }

  return context;
}
