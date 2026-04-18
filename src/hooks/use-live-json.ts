"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { SNAPSHOT_POLL_MS } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type UseLiveJsonOptions<T> = {
  initialData: T;
  tables?: string[];
  disabled?: boolean;
};

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

  const refresh = useCallback(async () => {
    if (disabled) {
      return;
    }

    startTransition(() => setLoading(true));

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("network");
      }

      const json = (await response.json()) as T;
      setData(json);
      setError(null);
    } catch {
      setError("טעינת נתונים נכשלה");
    } finally {
      setLoading(false);
    }
  }, [disabled, url]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    refresh();
    const interval = window.setInterval(refresh, SNAPSHOT_POLL_MS);
    return () => window.clearInterval(interval);
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

    stableTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          refresh();
        },
      );
    });

    channel.subscribe();

    return () => {
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
