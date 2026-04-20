"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { SNAPSHOT_POLL_MS } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type UseLiveJsonOptions<T> = {
  initialData: T;
  tables?: string[];
  disabled?: boolean;
};

const REALTIME_REFRESH_DEBOUNCE_MS = 600;

export function useLiveJson<T>(
  url: string,
  { initialData, tables = [], disabled = false }: UseLiveJsonOptions<T>,
) {
  const instanceId = useId().replace(/:/g, "");
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stableTables = useMemo(() => tables, [tables.join("|")]);
  const channelName = useMemo(
    () => `live:${url}:${instanceId}`,
    [instanceId, url],
  );

  const inFlightRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (disabled) {
      return;
    }

    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    const controller = new AbortController();
    inFlightRef.current = controller;
    startTransition(() => setLoading(true));

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("network");
      }

      const json = (await response.json()) as T;
      startTransition(() => {
        setData(json);
        setError(null);
      });
    } catch (caught) {
      if ((caught as { name?: string })?.name === "AbortError") {
        return;
      }
      setError("טעינת נתונים נכשלה");
    } finally {
      inFlightRef.current = null;
      setLoading(false);
      if (pendingRef.current) {
        pendingRef.current = false;
        void refresh();
      }
    }
  }, [disabled, url]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    refresh();
    const jitter = Math.floor(Math.random() * 4000);
    const interval = window.setInterval(refresh, SNAPSHOT_POLL_MS + jitter);
    return () => {
      window.clearInterval(interval);
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [disabled, refresh, url]);

  useEffect(() => {
    if (disabled || stableTables.length === 0) {
      return;
    }

    const client = getBrowserSupabaseClient();
    if (!client) {
      return;
    }

    const channel = client.channel(channelName);
    let debounceTimer: number | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer !== null) {
        return;
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        refresh();
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    stableTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    });

    channel.subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      void client.removeChannel(channel);
    };
  }, [channelName, disabled, refresh, stableTables]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      setData,
    }),
    [data, error, loading, refresh],
  );
}
