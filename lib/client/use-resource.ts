"use client";

import { useCallback, useEffect, useState } from "react";

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const next = await loader(controller.signal);
      setData(next);
      return next;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "加载失败，请稍后重试";
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void loader(controller.signal)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((reason: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "加载失败，请稍后重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loader]);

  return { data, setData, error, loading, reload };
}
