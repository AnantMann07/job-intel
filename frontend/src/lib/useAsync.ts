"use client";

import { useEffect, useState } from "react";

/**
 * Run an async request whenever `key` changes (null = don't run).
 * Returns { data, error, loading } for the current key only.
 */
export function useAsync<T>(key: string | null, run: () => Promise<T>) {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    run().then(
      (data) => alive && setState({ key, data }),
      (e) => alive && setState({ key, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
    // `run` is recreated every render; `key` says when the request really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: key !== null && !current,
  };
}
