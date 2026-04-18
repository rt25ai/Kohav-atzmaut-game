"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getHowl, type SoundName } from "@/lib/sound/generated-sfx";
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

  useEffect(() => {
    setSoundEnabled(getStoredSoundEnabled());
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

        getHowl(name).play();
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
