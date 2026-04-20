"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_STORAGE_KEY = "kochav-pwa-install-dismissed";
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 3;

export function PwaSupport() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) return;

    const dismissedAt = Number(
      window.localStorage.getItem(DISMISS_STORAGE_KEY) ?? "0",
    );
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setInstallEvent(null);
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
    setVisible(false);
  }, [installEvent]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        DISMISS_STORAGE_KEY,
        String(Date.now()),
      );
    }
    setVisible(false);
  }, []);

  if (!visible || !installEvent) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,35,63,0.96),rgba(6,20,38,0.96))] px-4 py-3 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-md sm:bottom-6"
      role="dialog"
      aria-label="התקנת האפליקציה למסך הבית"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4ab0ff]/20 text-[#7ad7ff]">
          <Download size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm text-white sm:text-base">
            התקינו את כוכבניק למסך הבית
          </p>
          <p className="text-xs text-[var(--text-soft)]">
            פותחים את המשחק כמו אפליקציה, ישירות מהמכשיר.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={install}
          className="hero-button-primary inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold sm:text-sm"
        >
          התקנה
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגירה"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-[var(--text-soft)]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
