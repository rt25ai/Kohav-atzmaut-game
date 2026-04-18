"use client";

import { useEffect } from "react";

import { HEARTBEAT_INTERVAL_MS } from "@/lib/config";

export function useHeartbeat(playerId: string | null) {
  useEffect(() => {
    if (!playerId) {
      return;
    }

    const sendHeartbeat = () => {
      void fetch("/api/game/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [playerId]);
}
